# 🚀 TaskFlow - Full Stack Deployment Guide (Render)

## 📦 Kiến trúc Deploy

```
https://taskflow.onrender.com (1 URL duy nhất)
        ↓
   Render Server
        ↓
   ├─ Frontend (React) → serve từ /dist
   └─ Backend (API) → /api/*
```

## 🎯 Ưu điểm

✅ **Đơn giản** - Chỉ quản lý 1 nơi  
✅ **Không CORS** - Frontend và Backend cùng domain  
✅ **Miễn phí** - Render Free Tier  
✅ **Email hoạt động** - Gmail SMTP  
✅ **Cron jobs** - Email deadline tự động  

## ⚙️ Cách Deploy

### Bước 1: Build Frontend
```bash
npm run build
```
→ Tạo folder `dist/` chứa React đã build

### Bước 2: Server sẽ:
1. Serve static files từ `dist/` (React app)
2. Xử lý API requests tại `/api/*`
3. Gửi email qua Gmail SMTP

### Bước 3: Render Config
- **Build Command**: `npm run render-build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `USE_REAL_EMAIL=true`
  - `GMAIL_USER=nguyenhoa27b1@gmail.com`
  - `GMAIL_APP_PASSWORD=hsetttfgpkgcoehh`
  - `HOST=0.0.0.0`

## 🔄 Auto Deploy

Mỗi khi push code lên GitHub → Render tự động:
1. Pull code mới
2. Chạy `npm run render-build` (install + build React)
3. Chạy `npm start` (start server)
4. Deploy xong!

## 📝 Lưu ý

⚠️ **Sleep Mode**: Server ngủ sau 15 phút không dùng (Free tier)  
→ Lần đầu truy cập sẽ chậm ~30s để wake up

🔒 **Bảo mật**: Không commit `.env` lên Git  
→ Chỉ cấu hình Environment Variables trên Render Dashboard
