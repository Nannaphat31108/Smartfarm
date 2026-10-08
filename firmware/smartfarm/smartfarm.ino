/*
 * Smart Farm — ESP32 ตัวหลัก (เซนเซอร์ + รีเลย์ + ระบบอัตโนมัติ)
 *
 * บอร์ด: ESP32 DevKit V1 (ESP32-WROOM-32) · Arduino IDE + ESP32 core 3.x
 * ไลบรารี (Library Manager): DHT sensor library, Adafruit Unified Sensor, BH1750 (Christopher Laws),
 *                          OneWire, DallasTemperature, ArduinoJson (v7)
 *
 * ระบบอัตโนมัติทำงานบนบอร์ดนี้เอง — ปิดแอปหรือเน็ตหลุดก็ยังรดน้ำ/เปิดไฟตามกฎ
 * แอปเป็นแค่ตัวตั้งค่าและดูผล (ส่งกฎมาที่ POST /config)
 *
 * API (พอร์ต 80, เปิด CORS):
 *   GET  /sensors   ค่าเซนเซอร์ + สถานะรีเลย์ (JSON)
 *   POST /relay     {"channel":1|2, "on":true|false, "minutes":3}
 *   GET  /config    กฎอัตโนมัติปัจจุบัน
 *   POST /config    บันทึกกฎอัตโนมัติ (เก็บในหน่วยความจำถาวร)
 */
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <Wire.h>
#include <time.h>
#include <DHT.h>
#include <BH1750.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

// ======================= ตั้งค่าที่ต้องแก้ =======================
const char *WIFI_SSID = "YOUR_WIFI";
const char *WIFI_PASS = "YOUR_PASSWORD";
const char *HOSTNAME = "smartfarm";  // เข้าได้ที่ http://smartfarm.local (ถ้าเครือข่ายรองรับ)

// คาลิเบรตเซนเซอร์ความชื้นดิน: เปิด http://<IP>/sensors ดูค่า soilRaw
const int SOIL_DRY = 3000;  // ค่า soilRaw ตอนเซนเซอร์อยู่ในอากาศ/ดินแห้งสนิท
const int SOIL_WET = 1300;  // ค่า soilRaw ตอนจุ่มน้ำ (ถึงขีดบนของเซนเซอร์)

// ถังน้ำ: ระยะจากเซนเซอร์ JSN-SR04T (ติดที่ฝาถัง) ถึงผิวน้ำ — ดูค่า tankCm
const float TANK_EMPTY_CM = 100.0;  // ระยะตอนถังว่าง (ถึงก้นถัง)
const float TANK_FULL_CM = 25.0;    // ระยะตอนถังเต็ม (JSN-SR04T วัดใกล้กว่า ~22 ซม. ไม่ได้)

// โมดูลรีเลย์ส่วนใหญ่ทำงานเมื่อขา IN เป็น LOW
const bool RELAY_ACTIVE_LOW = true;

const int PUMP_MAX_MINUTES = 30;       // กันปั๊มทำงานนานเกินไป
const int SOIL_RULE_COOLDOWN_MIN = 30; // รดน้ำตามความชื้นดินแล้ว รออย่างน้อยกี่นาทีก่อนรดซ้ำ
const float TANK_MIN_PERCENT = 5.0;    // น้ำต่ำกว่านี้ไม่สั่งปั๊ม (กันปั๊มทำงานตัวเปล่า)
// =============================================================

// ขาที่ใช้ (ดูหน้า "ต่อวงจร" ในแอป)
#define PIN_DHT 4
#define PIN_SOIL 34
#define PIN_DS18B20 13
#define PIN_TRIG 18
#define PIN_ECHO 19
#define PIN_RELAY_LIGHT 26
#define PIN_RELAY_PUMP 27
#define PIN_LED 2
#define PIN_SDA 21
#define PIN_SCL 22

DHT dht(PIN_DHT, DHT22);
BH1750 lightMeter;
OneWire oneWire(PIN_DS18B20);
DallasTemperature soilProbe(&oneWire);
WebServer server(80);
Preferences prefs;

// ---------- state ----------
struct Sensors {
  float temp = NAN, hum = NAN, lux = NAN, soilTemp = NAN, tankCm = NAN;
  int soilRaw = 0;
  float soil = NAN, tank = NAN;
} S;

bool lightOn = false, pumpOn = false;
unsigned long pumpUntil = 0;        // millis() ที่ปั๊มต้องหยุด
unsigned long pumpStartedAt = 0;
unsigned long lastSoilWatering = 0; // millis() ที่รดน้ำตามความชื้นดินล่าสุด
bool hasWateredBySoil = false;
float lightMinutesToday = 0, pumpMinutesToday = 0;
int counterDay = -1;
bool bh1750Ok = false;

// กฎอัตโนมัติ (ค่าเริ่มต้นเหมือนในแอป)
JsonDocument config;
const char *DEFAULT_CONFIG = R"({
  "auto": true, "threshold": 40, "duration": 3, "lightMode": "schedule", "soilRule": true,
  "lightSchedules": [{"start":"18:00","end":"22:00","days":"daily","on":true}],
  "pumpSchedules": [{"start":"06:30","duration":5,"days":"daily","on":true},
                    {"start":"17:00","duration":3,"days":"weekdays","on":true}],
  "lux": {"on": false, "value": 5000, "start": "06:00", "end": "18:00"}
})";
String firedKeys[8];  // กันรอบรดน้ำตามเวลาซ้ำในนาทีเดียวกัน

// ---------- relays ----------
void writeRelay(int pin, bool on) {
  digitalWrite(pin, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

void setLight(bool on) {
  if (lightOn == on) return;
  lightOn = on;
  writeRelay(PIN_RELAY_LIGHT, on);
  Serial.printf("[light] %s\n", on ? "ON" : "OFF");
}

void startPump(float minutes, const char *reason) {
  if (!isnan(S.tank) && S.tank < TANK_MIN_PERCENT) {
    Serial.println("[pump] น้ำในถังต่ำเกินไป — ไม่สั่งปั๊ม");
    return;
  }
  minutes = constrain(minutes, 0.1f, (float)PUMP_MAX_MINUTES);
  if (!pumpOn) pumpStartedAt = millis();
  pumpOn = true;
  pumpUntil = millis() + (unsigned long)(minutes * 60000UL);
  writeRelay(PIN_RELAY_PUMP, true);
  Serial.printf("[pump] ON %.1f min (%s)\n", minutes, reason);
}

void stopPump(const char *reason) {
  if (!pumpOn) return;
  pumpOn = false;
  writeRelay(PIN_RELAY_PUMP, false);
  Serial.printf("[pump] OFF (%s)\n", reason);
}

// ---------- sensors ----------
float readTankCm() {
  float samples[3];
  int n = 0;
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(4);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(20);
    digitalWrite(PIN_TRIG, LOW);
    unsigned long us = pulseIn(PIN_ECHO, HIGH, 30000);
    if (us > 0) samples[n++] = us / 58.0f;
    delay(60);
  }
  if (n == 0) return NAN;
  // median-ish: sort small array
  for (int i = 0; i < n; i++)
    for (int j = i + 1; j < n; j++)
      if (samples[j] < samples[i]) { float t = samples[i]; samples[i] = samples[j]; samples[j] = t; }
  return samples[n / 2];
}

void readSensors() {
  float t = dht.readTemperature(), h = dht.readHumidity();
  if (!isnan(t)) S.temp = t;
  if (!isnan(h)) S.hum = h;

  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(PIN_SOIL); delay(2); }
  S.soilRaw = sum / 10;
  S.soil = constrain(map(S.soilRaw, SOIL_DRY, SOIL_WET, 0, 100), 0, 100);

  if (bh1750Ok) {
    float lx = lightMeter.readLightLevel();
    if (lx >= 0) S.lux = lx;
  }

  soilProbe.requestTemperatures();
  float st = soilProbe.getTempCByIndex(0);
  S.soilTemp = (st == DEVICE_DISCONNECTED_C) ? NAN : st;

  S.tankCm = readTankCm();
  if (!isnan(S.tankCm)) {
    S.tank = constrain((TANK_EMPTY_CM - S.tankCm) / (TANK_EMPTY_CM - TANK_FULL_CM) * 100.0f, 0.0f, 100.0f);
  }
}

// ---------- time helpers ----------
bool timeReady(struct tm &now) {
  return getLocalTime(&now, 10) && now.tm_year > 120;
}
int toMin(const char *hhmm) {
  if (!hhmm) return -1;
  return atoi(hhmm) * 60 + atoi(hhmm + 3);
}
bool dayMatches(const char *days, int wday) {
  if (days && !strcmp(days, "weekdays")) return wday >= 1 && wday <= 5;
  if (days && !strcmp(days, "weekends")) return wday == 0 || wday == 6;
  return true;
}
bool inWindow(const char *start, const char *end, int nowMin) {
  int s = toMin(start), e = toMin(end);
  if (s < 0 || e < 0) return false;
  return s <= e ? (nowMin >= s && nowMin < e) : (nowMin >= s || nowMin < e);
}

// ---------- automation (every second) ----------
void automation() {
  static unsigned long last = 0;
  unsigned long dt = millis() - last;
  if (dt < 1000) return;
  last = millis();

  if (lightOn) lightMinutesToday += dt / 60000.0f;
  if (pumpOn) pumpMinutesToday += dt / 60000.0f;

  // pump timer + safety
  if (pumpOn && (long)(millis() - pumpUntil) >= 0) stopPump("ครบเวลา");
  if (pumpOn && !isnan(S.tank) && S.tank < TANK_MIN_PERCENT) stopPump("น้ำในถังหมด");

  struct tm now;
  bool clock = timeReady(now);
  if (clock && now.tm_yday != counterDay) {  // ขึ้นวันใหม่ รีเซ็ตตัวนับ
    counterDay = now.tm_yday;
    lightMinutesToday = pumpMinutesToday = 0;
  }
  if (!config["auto"].as<bool>()) return;

  int nowMin = clock ? now.tm_hour * 60 + now.tm_min : -1;
  const char *mode = config["lightMode"] | "schedule";
  JsonObject lux = config["lux"];

  // light
  if (!strcmp(mode, "schedule") && clock) {
    bool want = false;
    for (JsonObject r : config["lightSchedules"].as<JsonArray>()) {
      if (r["on"] && dayMatches(r["days"], now.tm_wday) && inWindow(r["start"], r["end"], nowMin)) want = true;
    }
    if (!want && lux["on"] && !isnan(S.lux) && S.lux < (lux["value"] | 5000) && inWindow(lux["start"], lux["end"], nowMin)) want = true;
    setLight(want);
  } else if (!strcmp(mode, "light") && !isnan(S.lux)) {
    bool window = clock ? inWindow(lux["start"] | "06:00", lux["end"] | "18:00", nowMin) : true;
    setLight(S.lux < (lux["value"] | 5000) && window);
  }

  // pump: schedules
  if (clock) {
    int i = 0;
    for (JsonObject r : config["pumpSchedules"].as<JsonArray>()) {
      if (i >= 8) break;
      char key[24];
      snprintf(key, sizeof(key), "%d-%d", now.tm_yday, nowMin);
      if (r["on"] && dayMatches(r["days"], now.tm_wday) && toMin(r["start"]) == nowMin && firedKeys[i] != key) {
        firedKeys[i] = key;
        if (!pumpOn) startPump(r["duration"] | 3, "ตามเวลา");
      }
      i++;
    }
  }

  // pump: soil moisture rule
  if (config["soilRule"] && !pumpOn && !isnan(S.soil) && S.soil < (config["threshold"] | 40)) {
    bool cooled = !hasWateredBySoil || millis() - lastSoilWatering > SOIL_RULE_COOLDOWN_MIN * 60000UL;
    if (cooled) {
      hasWateredBySoil = true;
      lastSoilWatering = millis();
      startPump(config["duration"] | 3, "ดินแห้ง");
    }
  }
}

// ---------- config storage ----------
void loadConfig() {
  prefs.begin("smartfarm", true);
  String saved = prefs.getString("config", "");
  prefs.end();
  if (saved.length() == 0 || deserializeJson(config, saved)) deserializeJson(config, DEFAULT_CONFIG);
}
void saveConfig() {
  String out;
  serializeJson(config, out);
  prefs.begin("smartfarm", false);
  prefs.putString("config", out);
  prefs.end();
}

// ---------- HTTP ----------
void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}
void sendJson(int code, JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  cors();
  server.send(code, "application/json", out);
}
void sendError(int code, const char *msg) {
  JsonDocument doc;
  doc["error"] = msg;
  sendJson(code, doc);
}
void setNum(JsonDocument &doc, const char *k, float v, int decimals) {
  if (isnan(v)) doc[k] = nullptr;
  else doc[k] = roundf(v * powf(10, decimals)) / powf(10, decimals);
}

void handleSensors() {
  JsonDocument doc;
  setNum(doc, "temp", S.temp, 1);
  setNum(doc, "hum", S.hum, 0);
  setNum(doc, "soil", S.soil, 0);
  setNum(doc, "lux", S.lux, 0);
  setNum(doc, "tank", S.tank, 0);
  setNum(doc, "soilTemp", S.soilTemp, 1);
  doc["soilRaw"] = S.soilRaw;
  setNum(doc, "tankCm", S.tankCm, 1);
  doc["light"] = lightOn;
  doc["pump"] = pumpOn;
  doc["pumpRemaining"] = pumpOn ? (long)(pumpUntil - millis()) / 1000 : 0;
  setNum(doc, "lightMinutesToday", lightMinutesToday, 1);
  setNum(doc, "pumpMinutesToday", pumpMinutesToday, 1);
  doc["lightMode"] = config["lightMode"];
  doc["auto"] = config["auto"];
  struct tm now;
  doc["clock"] = timeReady(now);
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;
  sendJson(200, doc);
}

void handleRelay() {
  JsonDocument body;
  if (deserializeJson(body, server.arg("plain"))) return sendError(400, "invalid JSON");
  int ch = body["channel"] | 0;
  bool on = body["on"] | false;
  if (ch == 1) {
    // สั่งไฟเองจากแอป = เปลี่ยนเป็นโหมดสั่งเอง (ไม่ให้ตารางเวลาสั่งกลับ)
    config["lightMode"] = "manual";
    saveConfig();
    setLight(on);
  } else if (ch == 2) {
    if (on) startPump(body["minutes"] | (float)(config["duration"] | 3), "สั่งจากแอป");
    else stopPump("สั่งจากแอป");
  } else {
    return sendError(400, "channel must be 1 or 2");
  }
  handleSensors();
}

void handleGetConfig() { sendJson(200, config); }

void handlePostConfig() {
  JsonDocument incoming;
  if (deserializeJson(incoming, server.arg("plain"))) return sendError(400, "invalid JSON");
  config = incoming;
  saveConfig();
  Serial.println("[config] updated from app");
  sendJson(200, config);
}

void handleOptions() {
  cors();
  server.send(204);
}

// ---------- setup / loop ----------
void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(HOSTNAME);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    delay(250);
    Serial.print(".");
  }
  digitalWrite(PIN_LED, WiFi.status() == WL_CONNECTED);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nSmart Farm ready: http://%s  (http://%s.local)\n", WiFi.localIP().toString().c_str(), HOSTNAME);
  } else {
    Serial.println("\nWiFi ไม่ได้ — ระบบอัตโนมัติยังทำงานต่อ จะลองต่อใหม่เรื่อย ๆ");
  }
}

void setup() {
  // ตั้งรีเลย์เป็น "ปิด" ก่อนเปิดใช้ขา กันรีเลย์กระตุกตอนบูต
  writeRelay(PIN_RELAY_LIGHT, false);
  writeRelay(PIN_RELAY_PUMP, false);
  pinMode(PIN_RELAY_LIGHT, OUTPUT);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SOIL, ADC_11db);

  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Smart Farm ESP32 ===");

  dht.begin();
  Wire.begin(PIN_SDA, PIN_SCL);
  bh1750Ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  if (!bh1750Ok) Serial.println("ไม่พบ BH1750 — ตรวจสาย SDA/SCL");
  soilProbe.begin();
  if (soilProbe.getDeviceCount() == 0) Serial.println("ไม่พบ DS18B20 — ตรวจสายและตัวต้านทาน 4.7k");

  loadConfig();
  connectWifi();
  configTzTime("ICT-7", "pool.ntp.org", "time.google.com");  // เวลาไทย
  if (MDNS.begin(HOSTNAME)) MDNS.addService("http", "tcp", 80);

  server.on("/", HTTP_GET, []() { cors(); server.send(200, "text/plain", "Smart Farm ESP32 OK — /sensors /relay /config"); });
  server.on("/sensors", HTTP_GET, handleSensors);
  server.on("/relay", HTTP_POST, handleRelay);
  server.on("/config", HTTP_GET, handleGetConfig);
  server.on("/config", HTTP_POST, handlePostConfig);
  server.on("/relay", HTTP_OPTIONS, handleOptions);
  server.on("/config", HTTP_OPTIONS, handleOptions);
  server.onNotFound([]() { sendError(404, "not found"); });
  server.begin();

  readSensors();
}

void loop() {
  server.handleClient();

  static unsigned long lastRead = 0;
  if (millis() - lastRead > 2500) {  // DHT22 อ่านได้ไม่เร็วกว่า 2 วินาที
    lastRead = millis();
    readSensors();
    Serial.printf("T=%.1f H=%.0f soil=%.0f%% (raw %d) lux=%.0f tank=%.0f%% (%.1fcm) soilT=%.1f light=%d pump=%d\n",
                  S.temp, S.hum, S.soil, S.soilRaw, S.lux, S.tank, S.tankCm, S.soilTemp, lightOn, pumpOn);
  }

  automation();

  static unsigned long lastWifiCheck = 0;
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiCheck > 30000) {
    lastWifiCheck = millis();
    WiFi.reconnect();
  }
}
