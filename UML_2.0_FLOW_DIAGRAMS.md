# TÀI LIỆU SƠ ĐỒ QUY TRÌNH CHUẨN UML 2.0 (UML 2.0 FLOW DIAGRAMS)
## DỰ ÁN: HỆ THỐNG QUẢN LÝ VẬN CHUYỂN NGỰA ĐUA XUYÊN QUỐC GIA (CBRT)

---

## MỤC LỤC
1. [Giới Thiệu Chuẩn Ký Hiệu UML 2.0](#1-giới-thiệu-chuẩn-ký-hiệu-uml-20)
2. [Sơ Đồ Use Case Tổng Thể (System Use Case Diagram)](#2-sơ-đồ-use-case-tổng-thể-system-use-case-diagram)
3. [Sơ Đồ Trạng Thái Vòng Đời Đơn Vận Chuyển (State Machine Diagram)](#3-sơ-đồ-trạng-thái-vòng-đời-đơn-vận-chuyển-state-machine-diagram)
4. [Sơ Đồ Hoạt Động Phân Vùng Swimlanes (Activity Diagrams with Swimlanes)](#4-sơ-đồ-hoạt-động-phân-vùng-swimlanes-activity-diagrams-with-swimlanes)
   - [Activity 4.1: Đặt Đơn & Phê Duyệt Vận Chuyển](#activity-41-đặt-đơn--phê-duyệt-vận-chuyển)
   - [Activity 4.2: Hồ Sơ Pháp Lý & Xin Giấy Phép Kiểm Dịch Cửa Khẩu](#activity-42-hồ-sơ-pháp-lý--xin-giấy-phép-kiểm-dịch-cửa-khẩu)
   - [Activity 4.3: Lập Lộ Trình, Phân Công & Thực Thi Chuyến Đi](#activity-43-lập-lộ-trình-phân-công--thực-thi-chuyến-đi)
   - [Activity 4.4: Xử Lý Sự Cố Khẩn Cấp SOS & Điều Hướng Lại](#activity-44-xử-lý-sự-cố-khẩn-cấp-sos--điều-hướng-lại)
   - [Activity 4.5: Nghiệm Thu Bàn Giao Điện Tử POD](#activity-45-nghiệm-thu-bàn-giao-điện-tử-pod)
5. [Sơ Đồ Tuần Tự Tương Tác Hệ Thống (Sequence Diagrams)](#5-sơ-đồ-tuần-tự-tương-tác-hệ-thống-sequence-diagrams)
   - [Sequence 5.1: Thu Nhập & Định Vị GPS Real-Time qua Socket.io](#sequence-51-thu-nhập--định-vị-gps-real-time-qua-socketio)
   - [Sequence 5.2: Phát & Xử Lý Tín Hiệu SOS Khẩn Cấp Real-Time](#sequence-52-phát--xử-lý-tín-hiệu-sos-khẩn-cấp-real-time)

---

## 1. GIỚI THIỆU CHUẨN KÝ HIỆU UML 2.0

Tài liệu này sử dụng chuẩn **UML 2.0** chính thức do Object Management Group (OMG) quy định:
- **Initial Node (`(*)`)**: Điểm bắt đầu luồng thực thi.
- **Activity Final Node (`((*)`)**: Điểm kết thúc toàn bộ quy trình.
- **Action State**: Hành động xử lý đơn lẻ do Actor hoặc Hệ thống thực hiện.
- **Decision / Merge Node (`<>`)**: Điểm rẽ nhánh điều kiện kèm theo **Guard Conditions `[Condition]`**.
- **Fork / Join Bar (`===`)**: Điểm phân nhánh song song (Fork) hoặc hội tụ đồng bộ (Join).
- **Swimlanes (Partitions)**: Phân vùng quy trình theo đối tượng Actor chịu trách nhiệm.

---

## 2. SƠ ĐỒ USE CASE TỔNG THỂ (SYSTEM USE CASE DIAGRAM)

Sơ đồ thể hiện toàn bộ các Actors và ranh giới hệ thống CBRT:

```mermaid
graph TB
  subgraph CBRT_SYSTEM ["HỆ THỐNG QUẢN LÝ VẬN CHUYỂN NGỰA ĐUA XUYÊN QUỐC GIA (CBRT)"]
    direction TB
    
    subgraph UC_AUTH ["Khối Authenticate & RBAC"]
      UC_Login["UC-01: Đăng nhập & Xác thực JWT"]
      UC_Profile["UC-02: Quản lý Thông tin Cá nhân"]
    end

    subgraph UC_BOOKING ["Khối Đơn Vận Chuyển"]
      UC_CreateOrder["UC-03: Đăng ký Đơn vận chuyển"]
      UC_ApproveOrder["UC-04: Phê duyệt Đơn hàng"]
      UC_RejectOrder["UC-05: Từ chối Đơn kèm Lý do"]
    end

    subgraph UC_COMPLIANCE ["Khối Kiểm Dịch & Pháp Lý"]
      UC_ManagePassport["UC-06: Số hóa Hộ chiếu FEI & Lý lịch Ngựa"]
      UC_UploadDocs["UC-07: Tải lên Hồ sơ Kiểm dịch"]
      UC_VerifyDocs["UC-08: Thẩm định Giấy phép Cửa khẩu"]
      UC_IssueClearance["UC-09: Cấp Giấy phép Thông quan"]
    end

    subgraph UC_DISPATCH ["Khối Điều Phối & Lộ Trình"]
      UC_ManageFleet["UC-10: Quản lý Xe tải & Air Stalls"]
      UC_CreateRoute["UC-11: Lập Tuyến đường & Waypoints"]
      UC_AssignCrew["UC-12: Phân công Driver & Escort"]
    end

    subgraph UC_REALTIME ["Khối Giám Sát & Sức Khỏe"]
      UC_GPSTracking["UC-13: Đẩy Tọa độ GPS Realtime"]
      UC_WelfareLog["UC-14: Nhập Nhật ký Sức khỏe Ngựa"]
      UC_CheckinWaypoint["UC-15: Check-in Mốc Điểm Dừng"]
      UC_LiveView["UC-16: Xem Live Tracking trên Bản đồ"]
    end

    subgraph UC_SOS ["Khối Quản Lý Sự Cố SOS"]
      UC_TriggerSOS["UC-17: Phát Tín hiệu SOS Khẩn cấp"]
      UC_ReceiveSOSAlert["UC-18: Tiếp nhận Cảnh báo SOS Đỏ"]
      UC_RerouteIncident["UC-19: Điều hướng Lộ trình Cứu hộ"]
      UC_ApproveEmergencyCost["UC-20: Duyệt Chi phí Phát sinh SOS"]
    end

    subgraph UC_POD ["Khối Bàn Giao & Báo Cáo"]
      UC_SignPOD["UC-21: Ký Bàn giao Điện tử POD"]
      UC_CompleteOrder["UC-22: Hoàn tất Đơn hàng & Xuất Biên bản"]
      UC_ViewAnalytics["UC-23: Xem Báo cáo KPI & Chỉ số OTD"]
    end
  end

  %% Actors Definition
  Customer(("Customer<br/>(Chủ Ngựa / CLB)"))
  Manager(("Logistics Manager<br/>(Quản Lý Điều Hành)"))
  Specialist(("Transport Specialist<br/>(Chuyên Viên Pháp Lý)"))
  Coordinator(("Fleet Coordinator<br/>(Điều Phối Viên)"))
  DriverEscort(("Driver / Escort<br/>(Tài Xế & Chăm Sóc)"))

  %% Customer Associations
  Customer --> UC_Login
  Customer --> UC_CreateOrder
  Customer --> UC_ManagePassport
  Customer --> UC_UploadDocs
  Customer --> UC_LiveView
  Customer --> UC_SignPOD

  %% Logistics Manager Associations
  Manager --> UC_Login
  Manager --> UC_ApproveOrder
  Manager --> UC_RejectOrder
  Manager --> UC_ApproveEmergencyCost
  Manager --> UC_ViewAnalytics

  %% Transport Specialist Associations
  Specialist --> UC_Login
  Specialist --> UC_VerifyDocs
  Specialist --> UC_IssueClearance

  %% Fleet Coordinator Associations
  Coordinator --> UC_Login
  Coordinator --> UC_ManageFleet
  Coordinator --> UC_CreateRoute
  Coordinator --> UC_AssignCrew
  Coordinator --> UC_ReceiveSOSAlert
  Coordinator --> UC_RerouteIncident

  %% Driver / Escort Associations
  DriverEscort --> UC_Login
  DriverEscort --> UC_GPSTracking
  DriverEscort --> UC_WelfareLog
  DriverEscort --> UC_CheckinWaypoint
  DriverEscort --> UC_TriggerSOS
  DriverEscort --> UC_SignPOD

  %% Include / Extend relationships
  UC_CreateOrder -.->|"<<include>>"| UC_ManagePassport
  UC_ApproveOrder -.->|"<<include>>"| UC_CreateRoute
  UC_RerouteIncident -.->|"<<extend>>"| UC_ApproveEmergencyCost
  UC_SignPOD -.->|"<<include>>"| UC_CompleteOrder
```

---

## 3. SƠ ĐỒ TRẠNG THÁI VÒNG ĐỜI ĐƠN VẬN CHUYỂN (STATE MACHINE DIAGRAM)

Sơ đồ State Machine thể hiện toàn bộ các trạng thái và điều kiện chuyển dịch của `Order` trong hệ thống:

```mermaid
stateDiagram-v2
  [*] --> PENDING_APPROVAL : Customer nộp Đơn đăng ký (TR-YYYY-XXXX)

  state PENDING_APPROVAL {
    [*] --> Chờ_Manager_Duyệt
  }

  PENDING_APPROVAL --> REJECTED : [ Manager từ chối ] / rejectBooking(reason)
  PENDING_APPROVAL --> APPROVED : [ Manager chấp nhận ] / approveBooking()

  REJECTED --> [*] : Đơn bị hủy bỏ hẳn

  state APPROVED {
    [*] --> Khởi_tạo_Yêu_cầu_Pháp_lý
  }

  APPROVED --> DOCS_PROCESSING : [ Specialist nhận đơn ] / startComplianceCheck()

  state DOCS_PROCESSING {
    [*] --> Chờ_Upload_Tài_liệu
    Chờ_Upload_Tài_liệu --> Đang_Thẩm_Định_Hải_Quan : uploadDocs()
    Đang_Thẩm_Định_Hải_Quan --> Chờ_Upload_Tài_liệu : [ Bị trả hồ sơ bổ sung ]
  }

  DOCS_PROCESSING --> CLEARED_FOR_TRANSPORT : [ Thẩm định 100% Giấy phép OK ] / issueClearance()

  state CLEARED_FOR_TRANSPORT {
    [*] --> Phân_công_Đội_xe_Tài_xế
    Phân_công_Đội_xe_Tài_xế --> Sẵn_sàng_Xuất_phát
  }

  CLEARED_FOR_TRANSPORT --> IN_TRANSIT : [ Xe rời điểm đón / Check-in Mốc 1 ] / startJourney()

  state IN_TRANSIT {
    [*] --> Di_chuyển_Bình_thường
    Di_chuyển_Bình_thường --> Ghi_Nhật_ký_Checkin : Đẩy GPS & Welfare Logs
    Ghi_Nhật_ký_Checkin --> Di_chuyển_Bình_thường
  }

  IN_TRANSIT --> INCIDENT_HANDLING : [ Bấm SOS khẩn cấp ] / triggerSOSAlert()

  state INCIDENT_HANDLING {
    [*] --> Phát_Báo_Động_Đỏ
    Phát_Báo_Động_Đỏ --> Điều_hướng_Cứu_hộ : reRouteToNearestVet()
    Điều_hướng_Cứu_hộ --> Khắc_phục_Xong
  }

  INCIDENT_HANDLING --> IN_TRANSIT : [ Sự cố được giải quyết ] / resolveIncident()
  IN_TRANSIT --> DELIVERING : [ Xe đến Điểm giao đích ] / arriveAtDestination()

  state DELIVERING {
    [*] --> Kiểm_tra_Thể_trạng_Ngựa
    Kiểm_tra_Thể_trạng_Ngựa --> Chờ_Ký_POD
  }

  DELIVERING --> COMPLETED : [ Customer ký nhận POD điện tử ] / signProofOfDelivery()

  IN_TRANSIT --> CANCELLED : [ Sự cố bất khả kháng nghiêm trọng ]
  INCIDENT_HANDLING --> CANCELLED : [ Ngựa buộc phải hủy chuyến ]

  COMPLETED --> [*] : Lưu trữ đơn hàng & Xuất hóa đơn B2B
  CANCELLED --> [*] : Đóng hồ sơ bồi thường bảo hiểm
```

---

## 4. SƠ ĐỒ HOẠT ĐỘNG PHÂN VÙNG SWIMLANES (ACTIVITY DIAGRAMS WITH SWIMLANES)

### Activity 4.1: Đặt Đơn & Phê Duyệt Vận Chuyển

```mermaid
flowchart TD
  subgraph Swimlane_Customer ["SWIMLANE: CUSTOMER (CHỦ NGỰA / CLB)"]
    A1["(*) Bắt đầu: Đăng nhập Web/Mobile Portal"] --> A2["Chọn danh sách Ngựa & Kiểm tra FEI Passport"]
    A2 --> A3["Nhập Điểm đi, Điểm đến, Khung ngày & Yêu cầu đặc biệt"]
    A3 --> A4["Gửi Đơn đăng ký Vận chuyển"]
  end

  subgraph Swimlane_System ["SWIMLANE: SYSTEM (CBRT BACKEND)"]
    A4 --> S1["Tự động sinh Mã đơn hàng TR-YYYY-XXXX"]
    S1 --> S2["Lưu DB trạng thái PENDING_APPROVAL"]
    S2 --> S3["Gửi WebSocket Notification & Email đến Manager"]
  end

  subgraph Swimlane_Manager ["SWIMLANE: LOGISTICS MANAGER"]
    S3 --> M1["Tiếp nhận Thông báo & Mở Chi tiết Đơn hàng"]
    M1 --> M2["Đánh giá Năng lực Đội xe, Cửa khẩu & Báo giá"]
    M2 --> D1{"Manager Phê duyệt?"}
    
    D1 -- "TỪ CHỐI (No)" --> M3["Nhập Lý do Từ chối cụ thể"]
    D1 -- "ĐỒNG Ý (Yes)" --> M4["Bấm Chấp nhận Đơn hàng (APPROVED)"]
  end

  subgraph Swimlane_System_Update ["SWIMLANE: SYSTEM (CBRT BACKEND)"]
    M3 --> S4["Cập nhật Trạng thái REJECTED & Gửi Thông báo"]
    M4 --> S5["Cập nhật Trạng thái APPROVED & Chuyển Đơn sang Transport Specialist"]
    S4 --> F1["((*) Kết thúc: Đơn bị Từ chối"]
    S5 --> F2["((*) Chuyển sang Bước Lập Hồ Sơ Kiểm Dịch"]
  end
```

---

### Activity 4.2: Hồ Sơ Pháp Lý & Xin Giấy Phép Kiểm Dịch Cửa Khẩu

```mermaid
flowchart TD
  subgraph Swimlane_Specialist ["SWIMLANE: TRANSPORT SPECIALIST (CHUYÊN VIÊN PHÁP LÝ)"]
    B1["(*) Tiếp nhận Đơn hàng APPROVED"] --> B2["Tra cứu Quy định Tiêm phòng & Cửa khẩu Quốc gia Đi/Đến"]
    B2 --> B3["Tạo Danh mục Hồ sơ Pháp lý Yêu cầu (Checklist)"]
  end

  subgraph Swimlane_System_B ["SWIMLANE: SYSTEM (CBRT BACKEND)"]
    B3 --> SB1["Gửi Thông báo Danh mục Hồ sơ đến Customer"]
  end

  subgraph Swimlane_Customer_B ["SWIMLANE: CUSTOMER"]
    SB1 --> C1["Chụp/Scan Giấy Tiêm phòng, Xét nghiệm Coggins, Hộ chiếu"]
    C1 --> C2["Tải lên Hồ sơ PDF/Hình ảnh qua Portal"]
  end

  subgraph Swimlane_Specialist_Review ["SWIMLANE: TRANSPORT SPECIALIST"]
    C2 --> B4["Mở Giao diện Thẩm định Hồ sơ"]
    B4 --> DB1{"Hồ sơ Hợp lệ & Đủ tiêu chuẩn?"}
    
    DB1 -- "KHÔNG (No)" --> B5["Đánh dấu REJECTED kèm Ghi chú lỗi tài liệu"]
    DB1 -- "CÓ (Yes)" --> B6["Gửi Hồ sơ sang Cửa khẩu Thú y / Hải quan Quốc tế"]
    B6 --> B7["Xác nhận Đã nhận Giấy phép Thông quan"]
    B7 --> B8["Chuyển trạng thái Đơn sang CLEARED_FOR_TRANSPORT"]
  end

  subgraph Swimlane_System_Finish ["SWIMLANE: SYSTEM"]
    B5 --> SB2["Thông báo Customer Tải lại Tài liệu"]
    SB2 --> C1
    B8 --> SB3["Thông báo Đơn sẵn sàng Phân công Lộ trình"]
    SB3 --> FB1["((*) Kết thúc: Đủ điều kiện khởi hành"]
  end
```

---

### Activity 4.3: Lập Lộ Trình, Phân Công & Thực Thi Chuyến Đi

```mermaid
flowchart TD
  subgraph Swimlane_Coordinator ["SWIMLANE: FLEET COORDINATOR (ĐIỀU PHỐI VIÊN)"]
    C1_Start["(*) Nhận Đơn CLEARED_FOR_TRANSPORT"] --> C2_Fleet["Chọn Xe tải chuyên dụng / Air Stalls khả dụng"]
    C2_Fleet --> C3_Route["Lập Tuyến đường: Điểm đón -> Trạm dừng nghỉ -> Cửa khẩu -> Điểm giao"]
    C3_Route --> C4_Assign["Gán Driver (Tài xế) & Escort (Chăm sóc)"]
    C4_Assign --> C5_Publish["Xuất Kế hoạch Chuyến đi"]
  end

  subgraph Swimlane_System_C ["SWIMLANE: SYSTEM (CBRT BACKEND)"]
    C5_Publish --> SC1["Push Notification lịch trình đến Mobile App Driver/Escort"]
  end

  subgraph Swimlane_Driver ["SWIMLANE: DRIVER / ESCORT (MOBILE APP)"]
    SC1 --> D1_App["Nhận Lịch trình Công tác trên Mobile App"]
    D1_App --> D2_CheckIn["Đến Điểm đón Ngựa & One-Tap Check-in"]
  end

  subgraph Swimlane_Parallel_Execution ["SWIMLANE: THỰC THI CHUYẾN ĐI (PARALLEL EXECUTION)"]
    D2_CheckIn --> Fork1["=== FORK BAR (BẮT ĐẦU LUỒNG SONG SONG) ==="]
    
    %% Track 1: GPS Auto Push
    Fork1 --> T1["Mobile App Chạy Ngầm: Tự động Thu thập & Đẩy Tọa độ GPS (10-30s/lần)"]
    T1 --> T2["System Cập nhật Map Real-time & Cảnh báo nếu Lệch Lộ trình"]
    
    %% Track 2: Welfare Logging
    Fork1 --> W1["Escort Thực hiện Ghi Nhật ký Sức khỏe Ngựa (2-4h/lần)"]
    W1 --> W2["Nhập Nhiệt độ, Lượng nước uống, Mức Stress + Chụp ảnh thực tế"]
    W2 --> W3["System Đồng bộ Timeline Sức khỏe lên Customer App"]
    
    %% Track 3: Waypoint Checkins
    Fork1 --> K1["Driver Check-in tại các Trạm dừng nghỉ & Cửa khẩu Hải quan"]
    K1 --> K2["System Đổi Trạng thái Mốc Lộ trình"]

    T2 --> Join1["=== JOIN BAR (HỘI TỤ ĐỒNG BỘ) ==="]
    W3 --> Join1
    K2 --> Join1
  end

  subgraph Swimlane_Arrival ["SWIMLANE: ĐẾN ĐÍCH"]
    Join1 --> A1_Arrive["Xe di chuyển đến Điểm giao hàng An toàn"]
    A1_Arrive --> A2_Delivering["Chuyển Trạng thái Đơn thành DELIVERING"]
    A2_Delivering --> FC1["((*) Chuyển sang Quy trình Bàn giao POD"]
  end
```

---

### Activity 4.4: Xử Lý Sự Cố Khẩn Cấp SOS & Điều Hướng Lại

```mermaid
flowchart TD
  subgraph Swimlane_Driver_SOS ["SWIMLANE: DRIVER / ESCORT (MOBILE APP)"]
    E1["(*) Phát hiện Sự cố Khẩn cấp trên đường (Tai nạn, Ngựa phát sốt/chấn thương)"] --> E2["Bấm & Giữ Nút SOS trong 3 Giây"]
  end

  subgraph Swimlane_System_SOS ["SWIMLANE: SYSTEM (SOCKET.IO GATEWAY)"]
    E2 --> SE1["Tự động Lấy Tọa độ GPS Hiện tại & Mã Chuyến đi"]
    SE1 --> SE2["Gửi Tín hiệu SOS Ưu tiên Cao nhất qua Socket.io"]
    SE2 --> SE3["Bật Chuông Báo động & Pop-up Màu đỏ trên Web Dashboard Trung tâm"]
  end

  subgraph Swimlane_Coordinator_SOS ["SWIMLANE: FLEET COORDINATOR"]
    SE3 --> CO1["Mở Cảnh báo SOS & Xác nhận Vị trí Sự cố trên Bản đồ"]
    CO1 --> CO2["Gọi Điện thoại Trực tiếp cho Driver/Escort Đánh giá Tình hình"]
    CO2 --> DE_Decision{"Mức độ Sự cố?"}
    
    DE_Decision -- "NHẸ (Có thể xử lý tại chỗ)" --> CO3["Hướng dẫn Escort Dùng Hộp y tế Dự phòng & Theo dõi"]
    CO3 --> CO4["Tắt Báo động SOS & Tiếp tục Hành trình"]
    
    DE_Decision -- "NGHIÊM TRỌNG (Cần trợ giúp ngoài)" --> CO5["Tra cứu Bệnh viện Thú y / Xe Cứu hộ Gần nhất"]
    CO5 --> CO6["Lập Tuyến đường Điều hướng mới (Re-routing)"]
    CO6 --> CO7["Gửi Yêu cầu Phê duyệt Chi phí Khẩn cấp đến Manager"]
  end

  subgraph Swimlane_Manager_SOS ["SWIMLANE: LOGISTICS MANAGER"]
    CO7 --> MA1["Duyệt Chi phí Khẩn cấp & Điều xe Trợ giúp"]
  end

  subgraph Swimlane_Resolution ["SWIMLANE: HOÀN TẤT SỰ CỐ"]
    MA1 --> SE4["Đồng bộ Lộ trình Mới xuống Mobile App Driver"]
    CO4 --> SE5["Ghi Nhật ký Incident Log vào Hệ thống"]
    SE4 --> SE5
    SE5 --> FE1["((*) Kết thúc Xử lý Sự cố & Tiếp tục Vận chuyển"]
  end
```

---

### Activity 4.5: Nghiệm Thu Bàn Giao Điện Tử POD

```mermaid
flowchart TD
  subgraph Swimlane_Driver_POD ["SWIMLANE: DRIVER / ESCORT"]
    P1["(*) Xe đến Điểm giao & Mở Giao diện Bàn giao POD trên Mobile App"] --> P2["Phối hợp với Customer Kiểm tra Thể trạng & Số hiệu Chip Ngựa"]
  end

  subgraph Swimlane_Customer_POD ["SWIMLANE: CUSTOMER"]
    P2 --> C_Check{"Thỏa mãn Thể trạng & Giấy tờ?"}
    
    C_Check -- "CÓ KHIẾU NẠI" --> C_Note["Ghi nhận Ghi chú Khiếu nại/Tình trạng Ngựa vào App"]
    C_Check -- "ĐẠT (OK)" --> C_Sign["Ký Chữ ký Điện tử Trực tiếp trên Màn hình Cảm ứng"]
    C_Note --> C_Sign
  end

  subgraph Swimlane_System_POD ["SWIMLANE: SYSTEM (CBRT BACKEND)"]
    C_Sign --> SP1["Tạo File Biên bản Bàn giao PDF (Digital POD) kèm Chữ ký & Timestamp"]
    SP1 --> SP2["Lưu trữ File PDF lên AWS S3 / Cloudinary"]
    SP2 --> SP3["Cập nhật Trạng thái Đơn hàng thành COMPLETED"]
    SP3 --> SP4["Gửi Email Biên bản POD & Thông báo Hoàn tất đến Customer & Manager"]
  end

  subgraph Swimlane_Finish_POD ["SWIMLANE: KẾT THÚC"]
    SP4 --> FP1["((*) Đơn hàng Hoàn thành Nghiệm thu Thành công"]
  end
```

---

## 5. SƠ ĐỒ TUẦN TỰ TƯƠNG TÁC HỆ THỐNG (SEQUENCE DIAGRAMS)

### Sequence 5.1: Thu Nhập & Định Vị GPS Real-Time qua Socket.io

Sơ đồ thể hiện luồng truyền tải dữ liệu tọa độ GPS từ thiết bị di động của Tài xế về Máy chủ và phát Real-time đến người dùng Web/Customer:

```mermaid
sequenceDiagram
  autonumber
  actor DriverApp as Mobile App (Driver)
  participant Middleware as SocketAuth Middleware
  participant SocketServer as Socket.io Server (Node.js)
  participant OrderModel as MongoDB (Order/Route)
  actor WebDashboard as Web Portal (Coordinator)
  actor CustomerApp as Mobile App (Customer)

  DriverApp->>Middleware: 1. Kết nối WSS kèm JWT Token trong handshake auth
  alt Token không hợp lệ / Hết hạn
    Middleware-->>DriverApp: 2. Reject Connection (401 Unauthorized)
  else Token hợp lệ
    Middleware-->>SocketServer: 3. Authenticate thành công (gán socket.user)
    SocketServer-->>DriverApp: 4. Emit event "connection:established"
  end

  loop Định kỳ mỗi 10 - 30 giây (khi IN_TRANSIT)
    DriverApp->>SocketServer: 5. emit("gps:location_update", { orderId, lat, lng, speed, heading })
    
    critical Xác thực & Ghi CSDL
      SocketServer->>OrderModel: 6. findByIdAndUpdate(orderId, { currentLocation, $push: locationHistory })
      OrderModel-->>SocketServer: 7. Xác nhận đã lưu tọa độ thành công
    end

    par Broadcast Real-time
      SocketServer->>WebDashboard: 8. emitToRoom("fleet:tracking:" + orderId, data)
      SocketServer->>CustomerApp: 9. emitToRoom("customer:tracking:" + orderId, data)
    end
    
    WebDashboard->>WebDashboard: 10. Di chuyển Marker Xe tải trên Bản đồ Mapbox/Leaflet
    CustomerApp->>CustomerApp: 11. Cập nhật vị trí Live trên Bản đồ Mobile
  end
```

---

### Sequence 5.2: Phát & Xử Lý Tín Hiệu SOS Khẩn Cấp Real-Time

Sơ đồ mô tả chi tiết tương tác khi nút bấm SOS được kích hoạt:

```mermaid
sequenceDiagram
  autonumber
  actor DriverApp as Mobile App (Driver)
  participant SocketServer as Socket.io Engine
  participant DB as MongoDB (Incident Schema)
  actor WebDashboard as Web Portal (Coordinator & Manager)
  participant RestAPI as Express REST API

  DriverApp->>DriverApp: 1. Driver giữ nút SOS trong 3 giây
  DriverApp->>SocketServer: 2. emit("sos:trigger_alert", { orderId, currentCoords, reasonCode, note })

  critical Khởi tạo Sự cố Khẩn cấp
    SocketServer->>DB: 3. Incident.create({ orderId, status: "OPEN", priority: "CRITICAL", coords })
    DB-->>SocketServer: 4. Trả về incidentId
    SocketServer->>DB: 5. Order.findByIdAndUpdate(orderId, { status: "INCIDENT_HANDLING" })
  end

  par Phát Báo Động Đỏ tức thì (< 500ms)
    SocketServer->>WebDashboard: 6. emitToAll("sos:alert_broadcast", { incidentId, orderCode, coords, driverPhone })
    SocketServer-->>DriverApp: 7. emit("sos:trigger_ack", { status: "RECEIVED", incidentId })
  end

  WebDashboard->>WebDashboard: 8. Phát Âm thanh Báo động & Mở Pop-up Modal Đỏ ưu tiên cao nhất

  actor Coordinator as Fleet Coordinator
  Coordinator->>WebDashboard: 9. Click "Tiếp nhận & Xử lý SOS"
  WebDashboard->>RestAPI: 10. POST /api/v1/incidents/{id}/reroute { newWaypoints, emergencyVetId }
  RestAPI->>DB: 11. Cập nhật Lộ trình mới & Thêm Chi phí Cứu hộ
  DB-->>RestAPI: 12. Xác nhận lưu
  RestAPI-->>WebDashboard: 13. Return 200 OK (Reroute Success)

  RestAPI->>SocketServer: 14. Emit "route:updated" down to Driver
  SocketServer->>DriverApp: 15. emit("route:sync_new", { newWaypoints, vetLocation })
  DriverApp->>DriverApp: 16. Tự động chuyển hướng Bản đồ dẫn đường sang Phòng khám Thú y
```

---

## 6. BẢNG TỔNG HỢP MÃ LỖI & QUY TẮC CHUYỂN TRẠNG THÁI (GUARD CONDITIONS)

| Trạng Thái Đi (From) | Trạng Thái Đến (To) | Sự Kiện Kích Hoạt (Trigger Event) | Vai Trò Thực Hiện | Guard Conditions (Điều kiện Tiên quyết) |
| :--- | :--- | :--- | :--- | :--- |
| `PENDING_APPROVAL` | `APPROVED` | `approveBooking()` | Logistics Manager | Thông tin đơn hợp lệ; Báo giá tuyến đường được chấp thuận. |
| `PENDING_APPROVAL` | `REJECTED` | `rejectBooking(reason)` | Logistics Manager | Lý do từ chối không được để trống (`reason.length > 5`). |
| `APPROVED` | `DOCS_PROCESSING` | `startComplianceCheck()` | Transport Specialist | Hồ sơ hộ chiếu ngựa FEI đã được liên kết đầy đủ. |
| `DOCS_PROCESSING` | `CLEARED_FOR_TRANSPORT` | `issueClearance()` | Transport Specialist | 100% tài liệu kiểm dịch (Tiêm phòng, Coggins, Giấy phép) ở trạng thái `APPROVED`. |
| `CLEARED_FOR_TRANSPORT` | `IN_TRANSIT` | `startJourney()` / Check-in Mốc 1 | Driver / Escort | Đã phân công đủ Phương tiện (Vehicle), Driver và Escort khả dụng. |
| `IN_TRANSIT` | `INCIDENT_HANDLING` | `triggerSOSAlert()` | Driver / Escort | Tín hiệu SOS chứa tọa độ hợp lệ (`coordinates [lng, lat]`). |
| `INCIDENT_HANDLING` | `IN_TRANSIT` | `resolveIncident()` | Fleet Coordinator | Incident ghi nhận phương án giải quyết và được Manager phê duyệt nếu có chi phí. |
| `IN_TRANSIT` | `DELIVERING` | `arriveAtDestination()` | Driver / Escort | Tọa độ GPS xe trùng với bán kính 500m của Điểm giao đích. |
| `DELIVERING` | `COMPLETED` | `signProofOfDelivery()` | Customer | Chữ ký điện tử Base64 không được trống; Thể trạng ngựa được xác nhận. |

---
*Tài liệu Sơ đồ Quy trình chuẩn UML 2.0 này là căn cứ kiến trúc chính thức cho toàn bộ dự án CBRT-2026.*
