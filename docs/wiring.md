# การต่อวงจร Smart Farm

> ในแอป/เว็บมีหน้า **ต่อวงจรและวิธีทำ** (แผนผัง, ต่อทีละชิ้น, รายการอุปกรณ์, ขั้นตอนพร้อมเช็กลิสต์, ค่าดิบสำหรับคาลิเบรต)
> ไฟล์นี้เป็นสรุปสำหรับอ่านบน GitHub

## ภาพรวม
```
อะแดปเตอร์ 12V 3A ──┬── LM2596 (ปรับ 5.0V) ──► ESP32 VIN, รีเลย์ VCC, JSN-SR04T 5V
                    └── รีเลย์ COM1, COM2 ──► NO1: ไฟปลูก 12V+   NO2: ปั๊ม 12V+ (ไดโอด 1N4007 คร่อมปั๊ม)
ขั้ว − ของไฟปลูก/ปั๊ม ──► 12V −          GND ทุกตัวต่อรวมกัน
```

## ตารางขา ESP32 DevKit V1

| อุปกรณ์ | ขาอุปกรณ์ | ESP32 | หมายเหตุ |
|---|---|---|---|
| DHT22 | + / OUT / − | 3V3 / **GPIO 4** / GND | ตัวเปล่า 4 ขา ใส่ 10kΩ ระหว่าง VCC–DATA |
| Soil Capacitive v1.2 | VCC / AOUT / GND | 3V3 / **GPIO 34** / GND | ADC1 ใช้ได้ขณะเปิด Wi-Fi |
| BH1750 | VCC / GND / SCL / SDA | 3V3 / GND / **GPIO 22** / **GPIO 21** | ADDR ไม่ต่อ |
| DS18B20 | แดง / เหลือง / ดำ | 3V3 / **GPIO 13** / GND | **4.7kΩ ระหว่าง DATA–3V3** |
| JSN-SR04T | 5V / Trig / Echo / GND | VIN / **GPIO 18** / **GPIO 19** / GND | **Echo → 1kΩ → GPIO19, GPIO19 → 2kΩ → GND** |
| รีเลย์ 2 ช่อง | VCC / GND / IN1 / IN2 | VIN / GND / **GPIO 26** / **GPIO 27** | IN1 = ไฟปลูก, IN2 = ปั๊ม |
| ESP32-CAM | 5V / GND | LM2596 OUT+ / OUT− | บอร์ดแยก ใช้ไฟ ≥ 1A |

## ความปลอดภัย
- ทั้งระบบใช้ 12V — ไม่ต้องต่อไฟบ้าน 220V ถ้าจะใช้อุปกรณ์ 220V ให้ช่างไฟฟ้าต่อ
- ถอดปลั๊กก่อนต่อสายทุกครั้ง · ปรับ LM2596 ให้ได้ 5.0V ด้วยมิเตอร์ **ก่อน** ต่อเข้า ESP32
- ใส่บอร์ดและรีเลย์ในกล่องกันน้ำ วางให้สูงจากพื้น

## โค้ด
- `firmware/smartfarm/smartfarm.ino` — ESP32 ตัวหลัก (ระบบอัตโนมัติทำงานบนบอร์ด แม้ปิดแอป)
- `firmware/esp32cam/esp32cam.ino` — กล้อง
- ไลบรารี: DHT sensor library, Adafruit Unified Sensor, BH1750, OneWire, DallasTemperature, ArduinoJson
- ทดสอบคอมไพล์กับ ESP32 Arduino core 3.3 (GitHub Actions คอมไพล์ให้ทุกครั้งที่แก้โค้ด)
