> Historical reference: this file documents the original cloned UI. The active redesign and confirmed workflow are documented in [docs/UI_REDESIGN.md](docs/UI_REDESIGN.md).

# CBRT UI/UX REFERENCE BLUEPRINT & IMPLEMENTATION SPECIFICATION
> **Tham chiếu trực tiếp từ:** `https://swp-rht-1ksz.vercel.app`  
> **Dự án áp dụng:** `Cross-Border Racehorse Transport Management System (WDP301)`  
> **Mục tiêu:** Tài liệu hóa toàn bộ Design System, Bảng màu, Thành phần giao diện (Components), Luồng Đặt chuyến (Booking Wizard), và Cỗ máy trạng thái (Order State Machine) để triển khai code lại UI/UX.

---

## 1. HỆ THỐNG MÀU SẮC & DESIGN TOKENS (Color & Typography)

### 1.1 Bảng màu chủ đạo (Color Palette)
* **Primary Color (Cam Thể thao / Vận tải):**
  * `Primary Default`: `#d9531e` hoặc `#e65100` (Nút CTA chính, Tab active, điểm nhấn mốc lộ trình)
  * `Primary Hover`: `#bf4314`
  * `Primary Light / Tint`: `#fff7ed` (Nền highlight, tag trạng thái)
* **Dark Accent (Xanh Đen Midnight / Slate):**
  * `Dark Default`: `#0f172a` (Topbar, Header nền tối, Footer, Chữ tiêu đề quan trọng)
  * `Dark Slate`: `#1e293b`
* **Neutrals & Backgrounds:**
  * `Page Background`: `#f8fafc` hoặc `#f1f5f9`
  * `Card Surface`: `#ffffff`
  * `Border / Divider`: `#e2e8f0`
  * `Text Primary`: `#0f172a`
  * `Text Muted / Sub`: `#64748b`
* **Status Badges (Hệ thống màu đèn tín hiệu):**
  * 🟢 **Xanh lá (Success / Ready):** Nền `#ecfdf5`, viền `#a7f3d0`, chữ `#065f46` (Ví dụ: *Sẵn sàng đặt chuyến*, *Giấy tờ hợp lệ*, *Đã giao ngựa an toàn*).
  * 🟡 **Vàng cam (Warning / Pending):** Nền `#fffbeb`, viền `#fde68a`, chữ `#92400e` (Ví dụ: *Cần bổ sung giấy tờ*, *Đang thẩm định*, *Đặt cọc 30%*).
  * 🔵 **Xanh dương (In Transit / Info):** Nền `#eff6ff`, viền `#bfdbfe`, chữ `#1e40af` (Ví dụ: *Ngựa đang trên đường*, *Đang làm thủ tục hải quan*).
  * 🔴 **Đỏ (SOS / Urgent / Expired):** Nền `#fef2f2`, viền `#fecaca`, chữ `#991b1b` (Ví dụ: *Báo động SOS sự cố*, *Báo giá hết hạn*, *Đơn đã hủy*).

### 1.2 Typography & Icon
* **Font Family:** `Roboto`, system-ui, sans-serif (Trang nhã, rõ ràng cho bảng kê chi phí và thông số).
* **Icon Library:** `lucide-react` (đã có trong `frontend/package.json`) hoặc `FontAwesome 6.4`.

---

## 2. KIẾN TRÚC GIAO DIỆN & DANH SÁCH COMPONENT

```
        ┌────────────────────────────────────────────────────────┐
        │  Topbar: Vận chuyển ngựa đua đường bộ · VN · Lào · Cam │
        ├────────────────────────────────────────────────────────┤
        │  Header: Logo + Menu + [Đặt chuyến] + [Đăng nhập] + VI │
        ├────────────────────────────────────────────────────────┤
        │  Hero Banner Slider (2 thông điệp cốt lõi)             │
        │  ┌──────────────────────────────────────────────────┐  │
        │  │ Widget Nổi: [Tra cứu đơn hàng] | [Bảng giá nhanh]│  │
        │  └──────────────────────────────────────────────────┘  │
        ├────────────────────────────────────────────────────────┤
        │  3 Feature Cards (Xe chuyên dụng · Giấy tờ · Giám sát) │
        ├────────────────────────────────────────────────────────┤
        │  Sơ đồ Lộ trình Tuyến (Đón -> Trạm nghỉ -> Cửa khẩu)   │
        ├────────────────────────────────────────────────────────┤
        │  Mạng lưới Cửa khẩu & Quy trình 5 bước                 │
        ├────────────────────────────────────────────────────────┤
        │  Footer: Thông tin pháp lý & Liên hệ                   │
        └────────────────────────────────────────────────────────┘
```

### 2.1 Các Component quan trọng cần làm:

#### A. Header & Topbar
* **Topbar mỏng trên cùng:** Nền tối `#0f172a`, chữ trắng nhỏ: *"Vận chuyển ngựa đua đường bộ · Việt Nam · Lào · Campuchia"*.
* **Navbar chính:**
  * Logo hình móng/đầu ngựa + Text: **Vận chuyển Ngựa**.
  * Menu link: *Trang chủ*, *Tra cứu (Dropdown: Tra cứu đơn / Bảng giá)*, *Mạng lưới*, *Dịch vụ*, *Quy trình*.
  * Nút hành động:
    * `[Đặt chuyến]`: Nút viền cam outline.
    * `[Đăng nhập / Đăng ký]`: Nút cam solid nổi bật.
    * Chuyển ngữ `[VI | EN]`.

#### B. Floating Quick Action Widget (Điểm ăn điểm nhất của UX)
Đặt đè nhẹ lên chân banner hero (2 tabs):
* **Tab 1: Tra cứu đơn hàng (Không cần đăng nhập):**
  * Ô nhập 1: `Mã đơn cần tra cứu (VD: BK-1 hoặc VD-...)`
  * Ô nhập 2: `4 số cuối SĐT người đặt`
  * Nút: `[Tìm kiếm]` (Màu cam)
  * *Mục đích UX:* Cho phép người nhận ngựa ở đầu bên kia (Lào/Campuchia) kiểm tra vị trí xe mà không cần có tài khoản hệ thống.
* **Tab 2: Tính cước nhanh (Bảng giá):**
  * Nhập: Điểm đi, Điểm đến (hoặc số Km), Loại thùng xe (2 - 9 khoang).
  * Hiển thị ngay biểu phí dự tính (gồm nhiên liệu, cầu đường, 01 tài xế + 01 hộ tống).

#### C. Màn hình Hồ sơ Ngựa (`/horses` - Digital Passport)
* **Khóa định danh (Immutable Key):** `Mã Microchip` (ISO 11784/11785), khóa không cho sửa sau khi tạo.
* **Quy tắc 3 Giấy tờ kiểm dịch bắt buộc:**
  1. Hộ chiếu ngựa (FEI Digital Passport).
  2. Sổ tiêm phòng vắc-xin.
  3. Phiếu xét nghiệm âm tính dịch bệnh.
* **Badge trạng thái:**
  * Đủ 3 giấy tờ hợp lệ ➔ `[Sẵn sàng đặt chuyến]`.
  * Thiếu hoặc hết hạn ➔ `[Cần bổ sung giấy tờ]`.
  * Đang trên chuyến đi ➔ `[Đang vận chuyển]` (Khóa nút chọn đặt đơn).

#### D. Form Đặt chuyến 4 Bước (Booking Stepper Wizard)
* **Bước 1: Tuyến đường & Xe (`/booking/route`)**
  * Chọn Tuyến nội địa hoặc Tuyến xuyên biên giới (Việt Nam ↔ Lào / Campuchia).
  * Chọn Điểm đón (Farm/Stable) và Điểm giao (Trường đua/Đối tác).
  * Chọn loại xe chuyên dụng (2 đến 9 ngăn có vách ngăn độc lập, không ghép đàn lạ).
* **Bước 2: Chọn ngựa (`/booking/horses`)**
  * Danh sách ngựa từ kho hồ sơ. Chỉ cho tick chọn các con có trạng thái *"Sẵn sàng đặt chuyến"*.
* **Bước 3: Dịch vụ & Dinh dưỡng (`/booking/services`)**
  * Nhân sự tiêu chuẩn: 01 Tài xế hạng nặng + 01 Hộ tống viên chăm sóc y tế.
  * Cữ ăn dinh dưỡng và cữ nước uống theo chặng.
  * Thủ tục kiểm dịch nội địa (đã gồm trong cước) hoặc Thủ tục Hải quan + Kiểm dịch quốc tế trọn gói.
  * Gói bảo hiểm Động vật sống (Live Animal Cargo Insurance) theo giá trị kê khai.
* **Bước 4: Xác nhận & Báo giá (`/booking/review`)**
  * Bảng phân tích chi tiết: Cước xe + Nhiên liệu + Phí cầu đường + Nhân sự + Thủ tục giấy tờ + Bảo hiểm.
  * Điều khoản đặt cọc 30% trong 24 giờ sau khi báo giá được phê duyệt.

#### E. Màn hình Chi tiết đơn hàng & Bản đồ Theo dõi (`/orders/:id` & `TripTrackMap`)
* **Thanh tiến độ (Progress Timeline):** Hiển thị rõ đơn đang ở bước nào trong 14 trạng thái.
* **Thẻ thông tin Vận đơn (Waybill Card):** Số vận đơn, Biển số xe chuyên dụng, Tên tài xế, Tên hộ tống viên, SĐT liên hệ khẩn cấp.
* **Bản đồ Leaflet thời gian thực:**
  * Hiển thị marker vị trí xe (tọa độ GPS trực tiếp).
  * Polyline tuyến đường dự kiến và các mốc: Trạm đón ➔ Trạm nghỉ chăm sóc ➔ Cửa khẩu ➔ Điểm giao.
* **Nhật ký chăm sóc (Welfare Log):** Bảng cập nhật mỗi 2–4 giờ: Giờ đo, Nhiệt độ cơ thể ngựa (°C), Tình trạng uống nước, Ảnh chụp thực tế từ xe.

---

## 3. CỖ MÁY TRẠNG THÁI ĐƠN HÀNG (State Machine Mapping)

| Mã trạng thái | Tên hiển thị UI | Hành động của Khách hàng / Hệ thống |
| :--- | :--- | :--- |
| `PENDING_REVIEW` | **Đang chờ Quản lý tiếp nhận** | Quản lý điều hành tiếp nhận đơn |
| `APPRAISING` | **Đang thẩm định** | Kiểm dịch viên soát giấy tờ, Điều phối viên chọn xe/tuyến |
| `DOCS_REQUIRED` | **Cần bạn bổ sung hồ sơ ngựa** | Khách nộp bổ sung giấy tờ kiểm dịch |
| `QUOTING` | **Đang lập báo giá** | Quản lý chốt bảng tính cước chính thức |
| `AWAITING_DEPOSIT`| **Đặt cọc 30% (Hạn 24 giờ)** | Khách bấm thanh toán 30% qua VNPay. Quá 24h tự hủy nhả xe |
| `PAPERWORK_IN_PROGRESS`| **Nhà xe đang làm thủ tục giấy tờ** | Làm việc với cơ quan kiểm dịch/cửa khẩu |
| `READY_FOR_DISPATCH`| **Tài xế và hộ tống đã sẵn sàng** | Khách thanh toán 70% còn lại trước giờ bốc ngựa |
| `PICKUP_EN_ROUTE`| **Xe đang đến điểm đón ngựa** | Khách chuẩn bị bản gốc hồ sơ (Passport, Sổ tiêm) |
| `IN_TRANSIT` | **Ngựa đang trên đường** | Bật GPS real-time, ghi nhật ký chăm sóc |
| `SOS_INCIDENT` | **Xe đang gặp sự cố, đang xử lý** | Đội ngũ khẩn cấp xử lý sự cố kỹ thuật/thú y |
| `DELIVERED` | **Đã giao ngựa an toàn** | Ký biên bản bàn giao điện tử (Digital POD) |
| `RECONCILIATION`| **Đang đối soát chi phí** | Quyết toán các chi phí phát sinh nếu có |
| `COMPLETED` | **Đơn đã hoàn tất** | Khách đánh giá chất lượng chuyến đi |
| `CANCELLED` | **Đơn đã hủy** | Đơn hủy do hết hạn cọc hoặc khách yêu cầu |

---

## 4. KẾ HOẠCH TRIỂN KHAI CHO BUỔI TỐI (Execution Roadmap)

1. **Giai đoạn 1: Landing Page & Public UI**
   * Tạo component `LandingHeader.jsx`, `HeroBanner.jsx`, `QuickTrackerWidget.jsx` (Tra cứu + Bảng giá).
   * Cập nhật màu sắc chủ đạo (#d9531e) vào file CSS hệ thống.
2. **Giai đoạn 2: Cổng Đăng ký & Đăng nhập**
   * Thêm ô chọn quốc gia (+84 VN, +855 Campuchia, +856 Lào) vào form `Register.jsx`.
   * Thêm trường `Địa chỉ / Trang trại`.
3. **Giai đoạn 3: Trang Hồ sơ Ngựa & Giấy tờ**
   * Thêm trường Microchip bất biến và 3 chỉ số giấy tờ bắt buộc vào `HorseList.jsx`.
   * Thêm nhãn trạng thái *Sẵn sàng đặt chuyến*.
4. **Giai đoạn 4: Stepper Đặt chuyến & Theo dõi**
   * Tái cấu trúc `CreateOrder.jsx` thành Wizard 4 bước.
   * Kết nối bản đồ `RouteMap.jsx` (`TripTrackMap`) với mốc trạm nghỉ và cửa khẩu.
