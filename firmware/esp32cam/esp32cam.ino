/*
 * Smart Farm — ESP32-CAM (AI-Thinker)
 *
 *   GET  http://<ip>/capture                 ภาพนิ่ง JPEG
 *   GET  http://<ip>/control?var=..&val=..   framesize | quality | led_intensity | vflip | hmirror
 *   GET  http://<ip>/status                  สถานะ (JSON)
 *   GET  http://<ip>:81/stream               ภาพสด MJPEG
 *
 * Arduino IDE: บอร์ด "AI Thinker ESP32-CAM" (ESP32 core 2.x ขึ้นไป), Partition: Huge APP
 */
#include <WiFi.h>
#include "esp_camera.h"
#include "esp_http_server.h"

const char *WIFI_SSID = "YOUR_WIFI";
const char *WIFI_PASS = "YOUR_PASSWORD";

// AI-Thinker pin map
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#define FLASH_GPIO_NUM 4

#define PART_BOUNDARY "123456789000000000000987654321"
static const char *STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char *STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char *STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

static httpd_handle_t web_httpd = NULL;
static httpd_handle_t stream_httpd = NULL;
static int flashLevel = 0;

static void allowCors(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
}

static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  allowCors(req);
  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

static esp_err_t stream_handler(httpd_req_t *req) {
  char part[64];
  esp_err_t res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;
  allowCors(req);
  while (true) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      res = ESP_FAIL;
      break;
    }
    size_t hlen = snprintf(part, sizeof(part), STREAM_PART, fb->len);
    res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, part, hlen);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    if (res != ESP_OK) break;  // client disconnected
  }
  return res;
}

static esp_err_t control_handler(httpd_req_t *req) {
  char query[96], var[32], val[16];
  if (httpd_req_get_url_query_str(req, query, sizeof(query)) != ESP_OK ||
      httpd_query_key_value(query, "var", var, sizeof(var)) != ESP_OK ||
      httpd_query_key_value(query, "val", val, sizeof(val)) != ESP_OK) {
    httpd_resp_send_404(req);
    return ESP_FAIL;
  }
  int v = atoi(val);
  sensor_t *s = esp_camera_sensor_get();
  int res = 0;
  if (!strcmp(var, "framesize")) res = s->set_framesize(s, (framesize_t)v);
  else if (!strcmp(var, "quality")) res = s->set_quality(s, v);
  else if (!strcmp(var, "vflip")) res = s->set_vflip(s, v);
  else if (!strcmp(var, "hmirror")) res = s->set_hmirror(s, v);
  else if (!strcmp(var, "led_intensity")) {
    flashLevel = constrain(v, 0, 255);
    analogWrite(FLASH_GPIO_NUM, flashLevel);
  } else res = -1;

  allowCors(req);
  if (res < 0) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  return httpd_resp_send(req, NULL, 0);
}

static esp_err_t status_handler(httpd_req_t *req) {
  sensor_t *s = esp_camera_sensor_get();
  char json[160];
  snprintf(json, sizeof(json),
           "{\"framesize\":%u,\"quality\":%u,\"led_intensity\":%d,\"rssi\":%d}",
           s->status.framesize, s->status.quality, flashLevel, WiFi.RSSI());
  httpd_resp_set_type(req, "application/json");
  allowCors(req);
  return httpd_resp_send(req, json, strlen(json));
}

static void startServers() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();

  httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler, .user_ctx = NULL };
  httpd_uri_t control_uri = { .uri = "/control", .method = HTTP_GET, .handler = control_handler, .user_ctx = NULL };
  httpd_uri_t status_uri = { .uri = "/status", .method = HTTP_GET, .handler = status_handler, .user_ctx = NULL };
  httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler, .user_ctx = NULL };

  if (httpd_start(&web_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(web_httpd, &capture_uri);
    httpd_register_uri_handler(web_httpd, &control_uri);
    httpd_register_uri_handler(web_httpd, &status_uri);
  }
  // สตรีมแยกพอร์ต เพื่อไม่ให้บล็อก /capture และ /control
  config.server_port = 81;
  config.ctrl_port += 1;
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  analogWrite(FLASH_GPIO_NUM, 0);

  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM;
  c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM;
  c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM;
  c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM;
  c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM;
  c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM;
  c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM;
  c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.grab_mode = CAMERA_GRAB_LATEST;
  if (psramFound()) {
    c.frame_size = FRAMESIZE_VGA;
    c.jpeg_quality = 12;
    c.fb_count = 2;
    c.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    c.frame_size = FRAMESIZE_QVGA;
    c.jpeg_quality = 15;
    c.fb_count = 1;
    c.fb_location = CAMERA_FB_IN_DRAM;
  }

  if (esp_camera_init(&c) != ESP_OK) {
    Serial.println("Camera init failed — restarting");
    delay(2000);
    ESP.restart();
  }

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nCamera ready: http://%s  (stream: http://%s:81/stream)\n",
                WiFi.localIP().toString().c_str(), WiFi.localIP().toString().c_str());

  startServers();
}

void loop() {
  // reconnect if WiFi drops
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(5000);
  }
  delay(1000);
}
