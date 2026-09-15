# CBRT Frontend Web Portal

Giao diện Quản trị & Điều phối Vận chuyển Ngựa đua Xuyên Quốc gia xây dựng bằng ReactJS + Vite.

## 📁 Cấu Trúc Thư Mục Frontend

```
frontend/
├── public/
├── src/
│   ├── assets/           # Styles & static images
│   ├── components/       # Common & Layout UI Components
│   │   ├── common/
│   │   └── layout/
│   ├── pages/            # App screens (Auth, Dashboard, Orders, Horses, Routes, SOS)
│   ├── routes/           # React Router Config & Auth Guard
│   ├── services/         # Axios API Integration Services
│   ├── store/            # Global State Management (Zustand)
│   ├── utils/            # Helper functions & constants
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## ⚙️ Hướng Dẫn Chạy (Development)

1. Cài đặt dependencies:
   ```bash
   npm install
   ```
2. Tạo file `.env` từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Chạy dev server:
   ```bash
   npm run dev
   ```
