# CS100 Power Up! — Personal Learning Portfolio (Team Project)

เว็บแอปให้ผู้ใช้สร้าง Personal Learning Portfolio เพิ่มผลงาน (Portfolio Item) ได้หลายรายการ
เก็บข้อมูลเป็นไฟล์ JSON บน server (AWS EC2) และมีกิจกรรม Challenge (Personality Quiz)
ที่สร้าง Portfolio Item JSON ให้ผู้ทดลองนำไป Import เข้า Portfolio ของตัวเอง

> **หมายเหตุ:** เว็บเปิดใช้งานได้เฉพาะช่วงที่ AWS Academy Lab ของทีมกำลังทำงาน (Start Lab)
> ถ้าเปิดลิงก์ไม่ได้ ให้ดูวิดีโอหลักฐานการทดสอบในไฟล์ PDF ที่ส่ง

## สมาชิกทีม
|  ชื่อ   |   หน้าที่   |
|-------|----------|
| กอบกู้  | frontend |
| กาฟิว  | frontend |
| ลีโอ   | frontend |

| ยี่หวา  | Data |
| มี่     | Data |

| แคนดี้  | backend |
| กู๊ด    | backend |
| เฟรนด์ | backend |

## ฟีเจอร์
- สร้าง Portfolio (ชื่อ, What I Enjoy, What I've Tried, What I'm Curious About)
- เพิ่ม Portfolio Item หลายรายการ (title, type, date, role, description, skills, reflection 4 ช่อง, evidence)
- ตรวจข้อมูล (ช่องบังคับ, URL, วันที่) ทั้งฝั่งหน้าเว็บและ server
- แก้ Reflection / Evidence ของ Item ได้ (ปุ่ม EDIT)
- Challenge: ทำ Personality Quiz แล้ว Export Portfolio Item JSON
- Import Portfolio Item JSON เข้า Portfolio ที่เลือก และบันทึกลง server
- Export `my-portfolio.json` ของ Portfolio ตัวเอง

## โครงสร้างโฟลเดอร์
```
index.html      หน้าแรก
form.html       ฟอร์มสร้าง Portfolio / เพิ่ม Item
profile.html    ดู Portfolio, Import / Export JSON
quiz.html       Challenge (Personality Quiz)
css/style.css   สไตล์ของทีม
js/app.js       ลอจิกหน้าเว็บ (ฟอร์ม, validation, เรียก server, import/export)
data/           ไฟล์ตัวอย่าง sample-portfolio-1.json / sample-portfolio-2.json
Media/          รูปภาพ
```

## วิธีเปิดดูเว็บ
- **บน EC2 (ตัวหลัก):** `http://Public IP/`  (ต้อง Start Lab ก่อน)
- **ดูเฉพาะหน้าตาบนเครื่องตัวเอง:** เปิดโฟลเดอร์ด้วย VS Code + Live Server
  (ข้อมูลจะบันทึกไม่ได้ถ้าไม่มี server)

## Server (ฝั่งเก็บข้อมูล)
- ภาษา: [PHP]
- ไฟล์โค้ด server: [https://github.com/LalitaChotamungsa/cs100_termproject.git]
- ที่เก็บไฟล์ JSON บน EC2: [กรอก path] — อยู่ **นอก** โฟลเดอร์ที่เปิดผ่าน URL ได้
- วิธีเริ่ม server: [กรอกคำสั่ง] และตั้งให้เริ่มเองหลังเครื่องเปิด: [กรอกวิธี]
- Endpoint: [กรอก เช่น GET/POST /api/...]
- Security Group เปิดเฉพาะ port: [กรอก เช่น 22 (จำกัด IP), 80]
- ห้ามใส่ password / AWS credentials / private key (.pem) ใน repo นี้

## วิธีทดสอบ (5 กรณี)
1. **Cross-device & Persistence:** สร้าง Portfolio + Item จาก Browser A → เปิด URL เดียวกันจาก Browser B/อีกเครื่อง ต้องเห็นข้อมูลเดิม → Restart server และ Reboot EC2 แล้วเปิดใหม่ ข้อมูลต้องยังอยู่
2. **Server Validation & File Access:** ส่งข้อมูลผิด (ช่องว่าง / URL ผิด / วันที่ผิด) ต้องถูกปฏิเสธ → พิมพ์ URL ตรงไปที่ไฟล์ JSON ของ server ต้องดาวน์โหลดไม่ได้
3. **Portfolio Item Exchange:** `quiz.html` → ทำ Quiz → Export Portfolio Item JSON → ที่ `profile.html` กด Import JSON → เลือก Portfolio → Item ปรากฏ
4. **Complete Challenge:** หลัง Import กด EDIT เพิ่ม Reflection และ Evidence → Save → Refresh แล้ว Item ยังอยู่
5. **Feedback & Ownership:** ดู GitHub Issues / Commits / ผลทดสอบที่ลิงก์ไว้ใน PDF

## วิธีทำงานของทีม
Issue → Implement → Test → Commit → Close (1 Issue = 1 branch = 1 Pull Request, มีผู้รีวิวก่อน merge)

## ข้อมูลทดลอง
ใช้ข้อมูลสมมติเท่านั้น ห้ามกรอกข้อมูลส่วนตัวที่สุ่มเสี่ยงหรือ sensitive