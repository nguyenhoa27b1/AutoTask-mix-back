# 📧 Hướng dẫn Cấu hình Email Thật cho TaskFlow

## 🚀 Bước 1: Tạo Gmail App Password

1. **Đăng nhập Gmail** của bạn
2. Vào **https://myaccount.google.com/apppasswords**
3. Chọn:
   - **App**: Mail
   - **Device**: Other (đặt tên: "TaskFlow")
4. Nhấn **Generate**
5. **Copy** mã 16 ký tự (ví dụ: `abcd efgh ijkl mnop`)

⚠️ **Lưu ý**: Đây là App Password, KHÔNG phải mật khẩu Gmail thường!

---

## ⚙️ Bước 2: Cấu hình File .env

Mở file `.env` trong thư mục `D:\web\AutoTask-mix-back\` và cập nhật:

```env
USE_REAL_EMAIL=true
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Thay thế:**
- `your-email@gmail.com` → Email Gmail của bạn
- `abcdefghijklmnop` → App Password 16 ký tự (không có khoảng trắng)

---

## 🎯 Bước 3: Khởi động Server

```powershell
cd D:\web\AutoTask-mix-back
node server-wrapper.cjs
```

**Kiểm tra log:**
- Mock mode: `[EMAIL SENT] ===== (MOCK MODE)`
- Real mode: `✅ Real email sent successfully! Message ID: ...`

---

## ✅ Test Email

### Thêm email thật vào hệ thống:

**Cách 1: Thêm trực tiếp vào code** (`server-wrapper.cjs` dòng ~190):
```javascript
const mockUsers = [
  // ... existing users
  {
    user_id: 3,
    email: 'real-email@gmail.com', // ← Email thật của bạn
    passwordHash: 'password123',
    role: Role.USER,
    name: 'Your Name',
    picture: null,
  },
];
```

**Cách 2: Sử dụng API** (từ Postman hoặc frontend):
```bash
POST http://127.0.0.1:4000/api/users
Content-Type: application/json

{
  "email": "real-email@gmail.com",
  "role": "user"
}
```

### Tạo task để trigger email:
```bash
POST http://127.0.0.1:4000/api/tasks
Content-Type: application/json

{
  "title": "Test Email Task",
  "description": "Testing real email",
  "assignee_id": 3,
  "assigner_id": 1,
  "priority": 2,
  "deadline": "2025-11-21T12:00:00",
  "status": "Pending"
}
```

→ Email sẽ được gửi đến `real-email@gmail.com` 🎉

---

## 🔄 Chuyển đổi Mock/Real Mode

**Mock mode** (chỉ log console):
```env
USE_REAL_EMAIL=false
```

**Real mode** (gửi email thật):
```env
USE_REAL_EMAIL=true
```

Khởi động lại server sau khi thay đổi `.env`!

---

## 📬 Email được gửi khi:

1. ✉️ **Task được giao mới** → Gửi đến assignee
2. ✉️ **Task hoàn thành** → Gửi đến tất cả admins
3. ✉️ **Sắp tới deadline** (1 ngày trước) → Gửi đến assignee
4. ✉️ **Quá hạn deadline** (1 ngày sau) → Gửi đến assignee

---

## ❓ Troubleshooting

**Lỗi: "Invalid login"**
→ Kiểm tra GMAIL_APP_PASSWORD (phải là App Password, không phải password thường)

**Lỗi: "Less secure app access"**
→ Sử dụng App Password thay vì bật "Less secure app"

**Email không gửi được**
→ Kiểm tra console log có message `[EMAIL ERROR]` không

**Email vào Spam**
→ Thêm sender vào danh sách Safe Senders trong Gmail
