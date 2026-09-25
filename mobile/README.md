# CBRT Driver

Ứng dụng React Native (Expo) dành riêng cho tài xế đã được phân công chuyến.

## Chạy local

1. Sao chép `.env.example` thành `.env`.
2. Với điện thoại thật, thay IP mẫu bằng IPv4 của máy chạy backend. Điện thoại và máy tính phải cùng mạng.
3. Chạy `npm install`, sau đó `npm run android`.

Android Emulator mặc định dùng `http://10.0.2.2:5000/api/v1`; iOS Simulator dùng `http://localhost:5000/api/v1`.

GPS foreground chạy trong Expo Go. Khi cần theo dõi nền ổn định, tạo development build bằng `eas build --profile development --platform android`.
