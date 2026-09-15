# Cross-Border Racehorse Transport Management System (CBRT-2026)

Hệ thống Quản lý Vận chuyển Ngựa đua Xuyên Quốc gia *(Cross-Border Racehorse Transport Management System)*.

## 🚀 Cấu Trúc Dự Án (Project Structure)

Dự án được tổ chức theo kiến trúc Monorepo / Dual-Folder gồm 2 phần chính:

```
WDP301/
├── REQUIREMENTS.md       # Tài liệu yêu cầu phần mềm chi tiết (SRS)
├── backend/              # Node.js + Express.js RESTful API & WebSockets Server
│   ├── src/
│   │   ├── config/       # Cấu hình DB, Cloudinary, Env
│   │   ├── controllers/  # Route Handlers
│   │   ├── middlewares/  # Authentication, Error handling
│   │   ├── models/       # Mongoose Schemas (MongoDB)
│   │   ├── routes/       # Express API Endpoints
│   │   ├── services/     # Business logic layers
│   │   ├── socket/       # Socket.io realtime handlers (GPS, SOS)
│   │   └── server.js     # Entry point khởi tạo server
│   └── package.json
├── frontend/             # ReactJS + Vite Web Portal (Admin & Coordination)
│   ├── src/
│   │   ├── assets/       # Styles, images, icons
│   │   ├── components/   # UI components re-usable
│   │   ├── pages/        # Các màn hình chính (Dashboard, Orders, Horses, Tracking)
│   │   ├── routes/       # Cấu hình chuyển trang (React Router)
│   │   ├── services/     # Axios API Clients
│   │   ├── store/        # State Management (Zustand / Redux)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB & Mongoose ODM
- **Real-time**: Socket.io (GPS Live Tracking & SOS Push Alerts)
- **Security**: JWT & Bcrypt

### Frontend
- **Framework & Tooling**: ReactJS (v18+) + Vite
- **UI Framework**: Ant Design / TailwindCSS
- **State Management**: Redux Toolkit / Zustand
- **Map Integration**: Leaflet / React-MapGL

---

## 💻 Hướng Dẫn Chạy Dự Án (Getting Started)

### 1. Cài đặt Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2. Cài đặt Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## 👥 Hướng Dẫn Đóng Góp (Git Workflow cho Thành Viên)

1. Clone repository về máy local:
   ```bash
   git clone https://github.com/coco-doit6879/Cross-Border-Racehorse-Transport-Management-System.git
   cd Cross-Border-Racehorse-Transport-Management-System
   ```
2. Tạo branch mới cho tính năng của bạn:
   ```bash
   git checkout -b feature/ten-tinh-nang
   ```
3. Commit và push nhánh của bạn lên GitHub:
   ```bash
   git add .
   git commit -m "feat: mô tả tính năng mới"
   git push origin feature/ten-tinh-nang
   ```
4. Tạo Pull Request (PR) trên GitHub để tiến hành review code.
