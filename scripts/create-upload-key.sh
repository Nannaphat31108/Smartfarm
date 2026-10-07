#!/usr/bin/env bash
# สร้าง "upload key" สำหรับส่งแอปขึ้น Google Play — รันบนเครื่องของคุณเอง (ต้องมี Java / keytool)
# ไฟล์ที่ได้: upload-key.jks (เก็บสำรองไว้ให้ดี ห้าม commit) และ upload-key.base64.txt (สำหรับใส่ใน GitHub Secrets)
set -euo pipefail
ALIAS="${1:-upload}"
OUT="upload-key.jks"
if [ -e "$OUT" ]; then echo "มี $OUT อยู่แล้ว — ไม่เขียนทับ"; exit 1; fi

read -rsp "ตั้งรหัสผ่าน keystore (อย่างน้อย 6 ตัว): " PASS; echo
read -rsp "พิมพ์รหัสผ่านอีกครั้ง: " PASS2; echo
[ "$PASS" = "$PASS2" ] || { echo "รหัสผ่านไม่ตรงกัน"; exit 1; }

keytool -genkeypair -v -keystore "$OUT" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=Smart Farm, O=Smart Farm, C=TH"

base64 < "$OUT" | tr -d '\n' > upload-key.base64.txt
cat <<MSG

สร้างเสร็จแล้ว ✅  ใส่ค่าเหล่านี้ใน GitHub → Settings → Secrets and variables → Actions → New repository secret

  ANDROID_KEYSTORE_BASE64   = เนื้อหาทั้งหมดในไฟล์ upload-key.base64.txt
  ANDROID_KEYSTORE_PASSWORD = รหัสผ่านที่เพิ่งตั้ง
  ANDROID_KEY_ALIAS         = $ALIAS
  ANDROID_KEY_PASSWORD      = รหัสผ่านเดียวกัน

แล้วลบ upload-key.base64.txt ทิ้ง และเก็บ upload-key.jks + รหัสผ่านไว้ในที่ปลอดภัย (ถ้าหายต้องติดต่อ Google เพื่อรีเซ็ต)
MSG
