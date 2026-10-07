# ส่งแอป Smart Farm ขึ้น Google Play

GitHub Actions จะ build ไฟล์ **`.aab`** (Android App Bundle ที่ Google Play ต้องการ) ให้อัตโนมัติ
เมื่อคุณใส่ "upload key" ไว้ใน GitHub Secrets — ทำครั้งเดียว

## 1. สร้าง upload key (บนคอมของคุณเอง)

ต้องมี Java (มีมากับ Android Studio) แล้วรันในโฟลเดอร์โปรเจกต์:

```bash
scripts/create-upload-key.sh
```

จะได้ 2 ไฟล์:
- `upload-key.jks` — **กุญแจตัวจริง เก็บสำรองไว้ให้ดี** (Google Drive / USB) พร้อมรหัสผ่าน ห้าม commit (มีใน .gitignore แล้ว)
- `upload-key.base64.txt` — ข้อความสำหรับวางใน GitHub

> Windows: ใช้ Git Bash รันสคริปต์ หรือใน Android Studio ใช้ *Build → Generate Signed Bundle → Create new…*
> แล้วแปลงไฟล์เป็น base64 ด้วย PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-key.jks")) > upload-key.base64.txt`

## 2. ใส่ใน GitHub Secrets

GitHub → repo **Smartfarm** → **Settings → Secrets and variables → Actions → New repository secret** เพิ่ม 4 ตัว:

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | เนื้อหาทั้งหมดใน `upload-key.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | รหัสผ่าน keystore |
| `ANDROID_KEY_ALIAS` | `upload` (ค่าเริ่มต้นของสคริปต์) |
| `ANDROID_KEY_PASSWORD` | รหัสผ่านเดียวกัน |

จากนั้นลบ `upload-key.base64.txt` ทิ้ง

## 3. Build

**Actions → Build Android app → Run workflow** (หรือ push อะไรก็ได้ขึ้น `main`)
เมื่อเสร็จ เปิด run นั้น → ส่วน **Artifacts** → ดาวน์โหลด **SmartFarm-play-release** จะมี
- `SmartFarm-<เลข>.aab` → ไฟล์สำหรับอัปโหลดขึ้น Play
- `SmartFarm-release-<เลข>.apk` → APK ที่เซ็นด้วยกุญแจจริง (เอาไว้ทดสอบ)

เลขเวอร์ชัน (versionCode) เพิ่มขึ้นเองทุกครั้งที่ build จึงอัปโหลดเวอร์ชันใหม่ได้เรื่อย ๆ

## 4. Google Play Console

1. สมัคร [Google Play Console](https://play.google.com/console) (ค่าธรรมเนียมครั้งเดียว 25 USD)
2. **Create app** → ชื่อ *Smart Farm*, ภาษาไทย, App, Free
3. **Test and release → Testing → Internal testing → Create release** → อัปโหลดไฟล์ `.aab`
   - ครั้งแรกให้เลือกใช้ **Play App Signing** (Google เก็บกุญแจเซ็นแอปจริง ส่วนเราใช้ upload key) — ถ้าทำ upload key หาย ขอรีเซ็ตได้
4. กรอกข้อมูลในหน้า **App content**:
   - Privacy policy: `https://<เว็บของคุณบน Render>/privacy.html`
   - Data safety: แอป **ไม่เก็บ/ไม่แชร์ข้อมูลผู้ใช้**
   - Ads: ไม่มีโฆษณา · Target audience: 18+ (หรือตามจริง)
5. **Store listing**: ไอคอน 512×512 ใช้ `icons/icon-512.png`, ภาพหน้าจอมือถือ 2–8 ภาพ, Feature graphic 1024×500
6. บัญชีนักพัฒนาส่วนตัวที่สมัครใหม่ ต้องทำ **Closed testing ที่มีผู้ทดสอบอย่างน้อย 12 คน ต่อเนื่อง 14 วัน** ก่อนขอเผยแพร่ Production

## หมายเหตุ
- App ID ของแอปคือ `com.nannaphat.smartfarm` — **เปลี่ยนไม่ได้หลังอัปโหลดขึ้น Play แล้ว** ถ้าอยากใช้ชื่ออื่นให้แก้ใน `capacitor.config.json` ก่อน
- APK ในหน้า Releases (`android-latest`) ยังเป็นเวอร์ชันทดสอบ (debug) ใช้ App ID เดียวกับเวอร์ชัน Play แต่เซ็นคนละกุญแจ จึงติดตั้งทับกันไม่ได้ — ถ้าจะเปลี่ยนไปใช้เวอร์ชัน Play ให้ถอนตัว debug ออกก่อน
