# CBRT Backend Service

Backend RESTful API & Real-time WebSockets Server cho Hệ thống Quản lý Vận chuyển Ngựa đua Xuyên Quốc gia.

## 📁 Cấu Trúc Thư Mục Backend

```
backend/
├── src/
│   ├── config/          # DB & Cloudinary Configuration
│   ├── controllers/     # API Logic Handlers (Auth, Horses, Orders, Routes, Incidents)
│   ├── middlewares/     # Auth JWT & Centralized Error Handlers
│   ├── models/          # Mongoose Schemas (User, Horse, Order, Route, HealthLog, Incident)
│   ├── routes/          # Express API Endpoints
│   ├── services/        # Business Logic & Utility Services
│   ├── socket/          # Socket.io GPS & SOS Handlers
│   ├── utils/           # Shared Constants & Helpers
│   └── server.js        # Main Entry Point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## ⚙️ Hướng Dẫn Chạy (Development)

1. Cài đặt các thư viện:
   ```bash
   npm install
   ```
2. Tạo file `.env` từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Khởi chạy ở chế độ dev:
   ```bash
   npm run dev
   ```
