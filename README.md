# CS100 Power Up! — Personal Learning Portfolio (Team Project)

เว็บแอปให้ผู้ใช้สร้าง Personal Learning Portfolio เพิ่มผลงาน (Portfolio Item) ได้หลายรายการ
ข้อมูลทั้งหมดเก็บเป็นไฟล์ JSON บน server (AWS EC2) มีกิจกรรม Challenge (Personality Quiz)
ที่สร้าง Portfolio Item JSON ให้ผู้ทดลองนำไป Import เข้า Portfolio ของตัวเอง

- **เว็บที่ใช้งานจริง:** http://184.198.68.187/
- **GitHub:** https://github.com/LalitaChotamungsa/cs100_termproject

> **หมายเหตุ:** server ทำงานเฉพาะช่วงที่ AWS Academy Lab ของทีมถูก Start
> (ใช้ Elastic IP จึงได้ IP เดิมทุกครั้งหลังเครื่อง Stop/Start) ถ้าเปิดลิงก์ไม่ได้
> ให้ดูวิดีโอหลักฐานการทดสอบในไฟล์ PDF ที่ส่ง

## สมาชิกทีม
| ชื่อ | ตำแหน่ง |
|---|---|
| กอบกู้ | Front-end |
| กาฟิว | Front-end |
| ลีโอ  | Front-end |

| ยี่หวา | Data |
| มี่ | Data |

| กู๊ด | Back-end |
| แคนดี้ | Back-end |
| เฟรนด์ | Back-end |

## ฟีเจอร์
- สร้าง Portfolio (ชื่อ, What I Enjoy, What I've Tried, What I'm Curious About)
- เพิ่ม Portfolio Item หลายรายการ (title, type, date, role, description, skills, reflection 4 ช่อง, evidence)
- ตรวจข้อมูล (ช่องบังคับ, URL, วันที่) ทั้งฝั่งหน้าเว็บ **และ** ฝั่ง server
- แก้ Reflection / Evidence ของ Item (ปุ่ม EDIT)
- Challenge: ทำ Personality Quiz (`quiz.html`) แล้ว Export Portfolio Item JSON
- Import Portfolio Item JSON เข้า Portfolio ที่เลือก และบันทึกลง server
- Export `my-portfolio.json` ของ Portfolio ตัวเอง (ปุ่มที่การ์ดใน `profile.html`)

## โครงสร้างโฟลเดอร์
```
index.html            หน้าแรก
form.html             ฟอร์มสร้าง Portfolio / เพิ่ม Item
profile.html          ดู Portfolio, Import / Export JSON
quiz.html             Challenge (Personality Quiz)
css/style.css         สไตล์
js/app.js             ลอจิกหน้าเว็บ (ฟอร์ม, validation, เรียก server, import/export)
api/portfolios.php    Server script (PHP) อ่าน/ตรวจ/บันทึกข้อมูล
data/                 ไฟล์ตัวอย่าง sample-portfolio-1.json / sample-portfolio-2.json
Media/                รูปภาพ
```

## วิธีเปิดดูเว็บ
- เปิด http://184.198.68.187/ (ต้อง Start Lab ก่อน)
- ดูเฉพาะหน้าตาบนเครื่องตัวเอง: เปิดโฟลเดอร์ด้วย VS Code + Live Server
  (บันทึกข้อมูลไม่ได้ถ้าไม่มี server)

## Server
- **สภาพแวดล้อม:** Ubuntu บน AWS EC2 (t3.micro), Apache 2.4 + PHP
- **Server script:** `api/portfolios.php`
  - `GET  /api/portfolios.php` → ส่งรายการ Portfolio ทั้งหมด (JSON array)
  - `POST /api/portfolios.php` → รับ JSON array ตรวจสอบทุก field ซ้ำ แล้วรวมเข้าข้อมูลเดิมตาม `id`
    (สองคนบันทึกพร้อมกันไม่ทับกัน, ใช้ file lock และเขียนไฟล์แบบ atomic)
  - ข้อมูลผิดรูปแบบถูกปฏิเสธด้วย HTTP 422 พร้อมรายการช่องที่ผิด
- **ที่เก็บข้อมูล:** `/var/www/data/portfolios.json` อยู่ **นอก** โฟลเดอร์เว็บ (`/var/www/html`)
  เปิดผ่าน URL โดยตรงไม่ได้ (สิทธิ์ `www-data` เท่านั้น)
- **เริ่มทำงานเอง:** Apache เปิด (`enabled`) อัตโนมัติเมื่อเครื่องเริ่มทำงาน ไม่ต้องสั่งเอง
- **IP คงที่:** ใช้ Elastic IP `184.198.68.187`

### ความปลอดภัยเบื้องต้น
- Security Group: เปิด port **80** (HTTP) ให้ทุกคน, port **22** (SSH) จำกัดเฉพาะช่วง IP ของ EC2 Instance Connect (`18.206.107.24/29`)
- ไฟล์ JSON อยู่นอกโฟลเดอร์เว็บ และ server เป็นผู้อ่าน/เขียนเองเท่านั้น
- Server ตรวจข้อมูลซ้ำทุกครั้ง (ชนิดข้อมูล, ความยาว, วันที่จริง, URL แบบ http/https) แม้หน้าเว็บตรวจแล้ว
- บล็อกการเข้า `/.git` ด้วย Apache และปิด directory listing
- ห้ามใส่ password / AWS credentials / private key ใน repo (ดู `.gitignore`)

## วิธีติดตั้ง server (ทำซ้ำได้)
```bash
# 1) ติดตั้ง Apache + PHP
sudo apt update && sudo apt install -y apache2 php libapache2-mod-php

# 2) ที่เก็บข้อมูลนอกโฟลเดอร์เว็บ
sudo mkdir -p /var/www/data
sudo chown www-data:www-data /var/www/data
sudo chmod 750 /var/www/data

# 3) นำโค้ดมาวางที่ /var/www/html
sudo rm -rf /var/www/html/*
sudo chown ubuntu:www-data /var/www/html
git clone https://github.com/LalitaChotamungsa/cs100_termproject.git /var/www/html
sudo chmod -R 755 /var/www/html

# 4) บล็อก .git และปิด directory listing
sudo tee /etc/apache2/conf-available/protect.conf > /dev/null <<'CONF'
<DirectoryMatch "/\.git">
    Require all denied
</DirectoryMatch>
<Directory /var/www/html>
    Options -Indexes
</Directory>
CONF
sudo a2enconf protect
sudo systemctl enable apache2
sudo systemctl restart apache2
```
อัปเดตโค้ดครั้งต่อไป: `cd /var/www/html && git pull`

## วิธีทดสอบ (5 กรณี)
1. **Cross-device & Persistence:** สร้าง Portfolio + Item จาก Browser A → เปิด http://184.198.68.187/profile.html จาก Browser B/อีกเครื่อง ต้องเห็นข้อมูลเดิม → Restart (`sudo reboot`) หรือ Stop/Start EC2 แล้วเปิดใหม่ ข้อมูลต้องยังอยู่
2. **Server Validation & File Access:**
   - ส่งข้อมูลผิดตรงถึง server (ข้ามหน้าเว็บ) ต้องถูกปฏิเสธ:
     `curl -s -X POST -H "Content-Type: application/json" -d '[{"id":"x"}]' http://184.198.68.187/api/portfolios.php`
   - ดาวน์โหลดไฟล์ข้อมูลผ่าน URL ตรงต้องไม่ได้ (ได้ 404):
     `curl -s -o /dev/null -w "%{http_code}\n" http://184.198.68.187/data/portfolios.json`
3. **Portfolio Item Exchange:** `quiz.html` → ทำ Quiz → Export Portfolio Item JSON → ที่ `profile.html` กด Import JSON → เลือก Portfolio → Item ปรากฏ
4. **Complete Challenge:** หลัง Import กด EDIT เพิ่ม Reflection และ Evidence → Save → Refresh แล้ว Item ยังอยู่บน server
5. **Feedback & Ownership:** ดู GitHub Issues / Commits / ผลทดสอบที่ลิงก์ไว้ใน PDF

## วิธีทำงานของทีม
Issue → Implement → Test → Commit → Close (1 Issue = 1 branch = 1 Pull Request, มีผู้รีวิวก่อน merge)

## ข้อมูลทดลอง
ใช้ข้อมูลสมมติเท่านั้น ห้ามกรอกข้อมูลส่วนตัวที่สุ่มเสี่ยงหรือ sensitive