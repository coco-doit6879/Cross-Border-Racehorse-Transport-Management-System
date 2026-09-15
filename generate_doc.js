const fs = require('fs');
const path = require('path');
const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat
} = require('docx');

const PRIMARY_COLOR = "1E3A8A";    // Dark Blue
const SECONDARY_COLOR = "2563EB";  // Blue
const ACCENT_BG = "F3F4F6";        // Light Gray Shading
const WHITE = "FFFFFF";
const TEXT_DARK = "1F2937";

function createHeaderCell(text, widthPercent) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text,
            bold: true,
            color: WHITE,
            font: "Segoe UI",
            size: 20 // 10pt
          })
        ]
      })
    ]
  });
}

function createDataCell(text, widthPercent, isAlt = false, isBold = false) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: isAlt ? { fill: ACCENT_BG, type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text,
            bold: isBold,
            color: TEXT_DARK,
            font: "Segoe UI",
            size: 19 // 9.5pt
          })
        ]
      })
    ]
  });
}

function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 28, // 14pt
        color: PRIMARY_COLOR,
        font: "Segoe UI"
      })
    ]
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 24, // 12pt
        color: SECONDARY_COLOR,
        font: "Segoe UI"
      })
    ]
  });
}

function createBullet(text, isBoldTitle = "", level = 0) {
  const children = [];
  if (isBoldTitle) {
    children.push(new TextRun({ text: isBoldTitle + ": ", bold: true, font: "Segoe UI", size: 20, color: TEXT_DARK }));
  }
  children.push(new TextRun({ text: text, font: "Segoe UI", size: 20, color: TEXT_DARK }));
  
  return new Paragraph({
    bullet: { level: level },
    spacing: { before: 40, after: 40 },
    children: children
  });
}

function createParagraph(text, isBold = false, italic = false) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: text, bold: isBold, italic: italic, font: "Segoe UI", size: 20, color: TEXT_DARK })
    ]
  });
}

async function buildDocx() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title Box / Header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: "TÀI LIỆU YÊU CẦU PHẦN MỀM (SRS)",
              bold: true,
              size: 36, // 18pt
              color: PRIMARY_COLOR,
              font: "Segoe UI"
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: "DỰ ÁN: HỆ THỐNG QUẢN LÝ VẬN CHUYỂN NGỰA ĐUA XUYÊN QUỐC GIA\n(Cross-Border Racehorse Transport Management System)",
              bold: true,
              italic: true,
              size: 24, // 12pt
              color: SECONDARY_COLOR,
              font: "Segoe UI"
            })
          ]
        }),

        // Metadata Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createHeaderCell("Thông Tin Tài Liệu", 35), createHeaderCell("Chi Tiết", 65)] }),
            new TableRow({ children: [createDataCell("Mã dự án", 35, false, true), createDataCell("CBRT-2026", 65)] }),
            new TableRow({ children: [createDataCell("Phiên bản", 35, true, true), createDataCell("1.0.0 (Official Specification)", 65, true)] }),
            new TableRow({ children: [createDataCell("Tác giả", 35, false, true), createDataCell("Business Analyst (BA) Team", 65)] }),
            new TableRow({ children: [createDataCell("Ngày ban hành", 35, true, true), createDataCell("14/09/2026", 65, true)] }),
            new TableRow({ children: [createDataCell("Công nghệ áp dụng", 35, false, true), createDataCell("ExpressJS, MongoDB, ReactJS (Web), React Native (Mobile)", 65)] })
          ]
        }),

        new Paragraph({ spacing: { before: 200 } }),

        // 1. Giới thiệu
        createHeading1("1. GIỚI THIỆU DỰ ÁN & PHẠM VI"),
        createHeading2("1.1 Mục Đích"),
        createParagraph("Tài liệu này xác định đầy đủ các yêu cầu nghiệp vụ, yêu cầu chức năng và phi chức năng nhằm xây dựng hệ thống phần mềm quản lý toàn trình quá trình vận chuyển ngựa đua xuyên quốc gia. Hệ thống phục vụ việc kết nối giữa chủ ngựa/CLB, bộ phận pháp lý kiểm dịch, điều phối viên lộ trình và tài xế/chuyên viên chăm sóc trên đường di chuyển."),
        
        createHeading2("1.2 Phạm Vi Hệ Thống (System Scope)"),
        createParagraph("Phạm vi dự án bao gồm các module cốt lõi sau:"),
        createBullet("Số hóa lý lịch và hộ chiếu ngựa đua (FEI Passports).", "Quản lý Hộ chiếu"),
        createBullet("Quản lý quy định kiểm dịch, tiêm phòng và giấy phép xuất/nhập cảnh theo quốc gia.", "Pháp lý & Kiểm dịch"),
        createBullet("Lập kế hoạch tuyến đường đa phương thức (xe tải thùng lạnh/êm chuyên dụng + khoang Air Stalls máy bay).", "Điều phối Lộ trình"),
        createBullet("Định vị GPS thời gian thực (Real-time Live Tracking) & Cảnh báo lệch tuyến.", "Giám sát Realtime"),
        createBullet("Nhật ký sức khỏe ngựa (Horse Welfare Logging) định kỳ trên di động.", "Phúc lợi Động vật"),
        createBullet("Xử lý sự cố khẩn cấp (SOS Emergency Response System) với nút bấm khẩn cấp.", "Quản lý Sự cố SOS"),
        createBullet("Nghiệm thu bàn giao điện tử (Digital Proof of Delivery - POD) bằng chữ ký cảm ứng.", "Bàn giao POD"),

        // 2. Actors
        createHeading1("2. PHÂN TÍCH ĐỐI TƯỢNG SỬ DỤNG (ACTORS & PERSONAS)"),
        createParagraph("Hệ thống phục vụ 5 nhóm đối tượng người dùng chính với ma trận phân quyền RBAC:"),
        
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createHeaderCell("Vai Trò (Actor)", 25), createHeaderCell("Nền Tảng", 20), createHeaderCell("Nhiệm Vụ & Trách Nhiệm chính", 55)] }),
            new TableRow({ children: [createDataCell("Logistics Manager", 25, false, true), createDataCell("Web (ReactJS)", 20), createDataCell("Phê duyệt đơn vận chuyển, phân công tài sản & tài xế, duyệt chi phí khẩn cấp, xem báo cáo KPI & OTD.", 55)] }),
            new TableRow({ children: [createDataCell("Transport Specialist", 25, true, true), createDataCell("Web (ReactJS)", 20, true), createDataCell("Quản lý quy định y tế/hải quan quốc tế, kiểm duyệt giấy chứng nhận tiêm phòng & hộ chiếu ngựa FEI.", 55, true)] }),
            new TableRow({ children: [createDataCell("Fleet Coordinator", 25, false, true), createDataCell("Web (ReactJS)", 20), createDataCell("Quản lý xe tải/stalls, thiết lập đường đi tối ưu, các trạm nghỉ & trạm kiểm dịch, điều hướng lại khi tắc đường.", 55)] }),
            new TableRow({ children: [createDataCell("Driver / Escort", 25, true, true), createDataCell("Mobile App", 20, true), createDataCell("Xem lịch làm việc, one-tap check-in mốc di chuyển, nhập nhật ký sức khỏe & ảnh chụp ngựa, bấm nút SOS khẩn cấp, lấy chữ ký POD.", 55, true)] }),
            new TableRow({ children: [createDataCell("Customer (Chủ ngựa)", 25, false, true), createDataCell("Web & Mobile", 20), createDataCell("Tạo đơn vận chuyển, upload giấy khám sức khỏe, theo dõi vị trí live GPS của ngựa, nhận thông báo thông quan & nghiệm thu.", 55)] })
          ]
        }),

        // 3. Functional Requirements
        createHeading1("3. YÊU CẦU CHỨC NĂNG CHI TIẾT (FUNCTIONAL REQUIREMENTS)"),
        
        createHeading2("FR-01: Quản Lý Đơn Vận Chuyển (Booking Management)"),
        createBullet("Cho phép Customer tạo đơn vận chuyển trực tuyến gồm: điểm đi, điểm đến, ngày dự kiến, danh sách ngựa và yêu cầu đặc biệt.", "Tạo đơn hàng"),
        createBullet("Hệ thống tự động sinh Mã đơn hàng duy nhất dạng TR-YYYY-XXXX.", "Sinh mã tự động"),
        createBullet("Logistics Manager duyệt (APPROVED) hoặc từ chối (REJECTED) kèm ghi chú lý do.", "Phê duyệt đơn"),

        createHeading2("FR-02: Số Hóa Hồ Sơ & Kiểm Dịch Thông Quan (Compliance)"),
        createBullet("Số hóa lý lịch từng con ngựa: Tên, mã chip 15 số, hộ chiếu FEI, giống, tuổi, cân nặng.", "Hồ sơ ngựa"),
        createBullet("Transport Specialist tạo danh mục tài liệu cần thiết theo quốc gia cửa khẩu.", "Danh mục quy định"),
        createBullet("Cho phép upload PDF/ảnh, kiểm duyệt trạng thái (PENDING_REVIEW -> APPROVED/REJECTED).", "Kiểm duyệt tài liệu"),
        createBullet("Tự động cảnh báo khi hồ sơ thiếu hoặc sắp hết hạn trước 48h khởi hành.", "Cảnh báo hết hạn"),

        createHeading2("FR-03: Lập Lộ Trình & Điều Phối Đội Xe (Fleet & Route Dispatch)"),
        createBullet("Quản lý danh mục phương tiện (Xe tải chuyên dụng, Air Stalls) cùng trạng thái khả dụng.", "Quản lý phương tiện"),
        createBullet("Tạo lộ trình gồm chuỗi các mốc (Waypoints): Điểm đón -> Trạm nghỉ -> Cửa khẩu -> Trạm giao.", "Thiết lập Lộ trình"),
        createBullet("Gán tài xế, chuyên viên đi kèm và tự động gửi thông báo lịch làm việc xuống Mobile App.", "Phân công nhân sự"),

        createHeading2("FR-04: Giám Sát GPS Real-Time & Nhật Ký Sức Khỏe Ngựa"),
        createBullet("Mobile App tự động thu thập và đẩy tọa độ GPS định kỳ (10-30s/lần) về server khi IN_TRANSIT.", "Tọa độ Realtime"),
        createBullet("Trực quan hóa vị trí xe và hành trình trên Bản đồ tương tác Web & Mobile.", "Hiển thị Bản đồ"),
        createBullet("One-Tap Check-in tại từng mốc điểm dừng trên đường.", "Check-in mốc"),
        createBullet("Ghi nhật ký định kỳ (2-4h/lần): Nhiệt độ, lượng nước, mức độ căng thẳng + chụp ảnh thực tế.", "Nhật ký sức khỏe"),

        createHeading2("FR-05: Xử Lý Sự Cố Khẩn Cấp (SOS Emergency Resolution)"),
        createBullet("Nút bấm SOS khẩn cấp trên Mobile App gửi cảnh báo lập tức kèm tọa độ vị trí.", "Phát tín hiệu SOS"),
        createBullet("Web Dashboard phát chuông & hiển thị Pop-up đỏ ưu tiên cao nhất.", "Cảnh báo Trung tâm"),
        createBullet("Coordinator tính toán điều hướng lại (Re-routing) để tìm phòng khám thú y/xe cứu hộ gần nhất.", "Điều hướng sự cố"),

        createHeading2("FR-06: Bàn Giao POD & Báo Cáo KPI"),
        createBullet("Customer kiểm tra ngựa và ký xác nhận điện tử trực tiếp trên màn hình Mobile App.", "Ký nhận POD"),
        createBullet("Đổi trạng thái chuyến đi thành COMPLETED và xuất biên bản nghiệm thu.", "Hoàn tất chuyến đi"),
        createBullet("Thống kê chỉ số giao đúng giờ (OTD %), tổng số km, số sự cố theo tháng.", "Báo cáo KPI"),

        // 4. NFR
        createHeading1("4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)"),
        createBullet("Thời gian phản hồi API < 200ms với 95% request.", "Hiệu năng API"),
        createBullet("Độ trễ truyền tải vị trí GPS thời gian thực (WebSocket) < 500ms.", "Độ trễ Realtime"),
        createBullet("Xác thực kết nối API bằng JWT Token; phân quyền RBAC nghiêm ngặt.", "Bảo mật & Auth"),
        createBullet("Mã hóa mật khẩu bằng Bcrypt (salt >= 10); mã hóa toàn bộ đường truyền bằng HTTPS/WSS.", "Mã hóa dữ liệu"),
        createBullet("Offline-First Capability: Mobile App cho phép ghi nhật ký & check-in offline khi mất mạng di động, tự động đồng bộ khi có 4G/5G trở lại.", "Hoạt động Ngoại tuyến"),
        createBullet("Cơ sở dữ liệu MongoDB được đánh chỉ mục 2dsphere index trên tọa độ để truy vấn nhanh.", "Cơ sở dữ liệu"),

        // 5. Workflow State Table
        createHeading1("5. VÒNG ĐỜI TRẠNG THÁI ĐƠN VẬN CHUYỂN (WORKFLOW LIFECYCLE)"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createHeaderCell("Trạng Thái", 25), createHeaderCell("Ý Nghĩa Nghiệp Vụ", 45), createHeaderCell("Hành Động Chuyển Tiếp", 30)] }),
            new TableRow({ children: [createDataCell("PENDING_APPROVAL", 25, false, true), createDataCell("Đơn hàng mới tạo bởi Customer", 45), createDataCell("Manager Duyệt / Từ chối", 30)] }),
            new TableRow({ children: [createDataCell("APPROVED", 25, true, true), createDataCell("Đã được Manager chấp nhận", 45, true), createDataCell("Chuyển sang làm thủ tục y tế", 30, true)] }),
            new TableRow({ children: [createDataCell("DOCS_PROCESSING", 25, false, true), createDataCell("Đang kiểm duyệt & xin phép kiểm dịch", 45), createDataCell("Specialist xác nhận hoàn tất", 30)] }),
            new TableRow({ children: [createDataCell("CLEARED", 25, true, true), createDataCell("Đã đủ điều kiện thông quan", 45, true), createDataCell("Coordinator gán xe & route", 30, true)] }),
            new TableRow({ children: [createDataCell("IN_TRANSIT", 25, false, true), createDataCell("Đoàn xe đang di chuyển trên đường", 45), createDataCell("Driver check-in & đẩy GPS", 30)] }),
            new TableRow({ children: [createDataCell("INCIDENT_HANDLING", 25, true, true), createDataCell("Đang xử lý sự cố SOS khẩn cấp", 45, true), createDataCell("Coordinator điều hướng lại", 30, true)] }),
            new TableRow({ children: [createDataCell("COMPLETED", 25, false, true), createDataCell("Đã bàn giao và ký nhận POD thành công", 45), createDataCell("Xuất hóa đơn & nghiệm thu", 30)] })
          ]
        }),

        // 6. Technology Stack
        createHeading1("6. YÊU CẦU NỀN TẢNG & CÔNG NGHỆ"),
        createBullet("Node.js (v18+) + ExpressJS (REST APIs Architecture)", "Backend Framework"),
        createBullet("Socket.io (WebSocket Engine cho Live GPS & SOS Push)", "Real-time Engine"),
        createBullet("MongoDB (v6.0+) + Mongoose ODM", "Cơ sở Dữ liệu"),
        createBullet("ReactJS (v18+) + Vite + TailwindCSS / Ant Design + Mapbox GL", "Web Frontend"),
        createBullet("React Native (v0.72+) + Expo SDK + Expo Location + Signature Canvas", "Mobile Platform"),
        createBullet("Cloudinary / AWS S3 (Lưu trữ ảnh hộ chiếu & nhật ký y tế)", "File Storage"),

        // 7. Acceptance Criteria
        createHeading1("7. TIÊU CHÍ NGHIỆM THU THÀNH CÔNG (ACCEPTANCE CRITERIA)"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createHeaderCell("Mã AC", 15), createHeaderCell("Chức Năng Kiểm Thử", 30), createHeaderCell("Tiêu Chí Nghiệm Thu Đạt", 55)] }),
            new TableRow({ children: [createDataCell("AC-01", 15, false, true), createDataCell("Tạo & Duyệt Đơn", 30), createDataCell("Customer tạo đơn thành công; Manager duyệt đơn < 3 click. Sinh mã TR-XXXX tự động.", 55)] }),
            new TableRow({ children: [createDataCell("AC-02", 15, true, true), createDataCell("Số Hóa Hộ Chiếu Ngựa", 30, true), createDataCell("Specialist xem bản số hóa hộ chiếu FEI, tiêm phòng và phê duyệt hồ sơ hợp lệ.", 55, true)] }),
            new TableRow({ children: [createDataCell("AC-03", 15, false, true), createDataCell("Định Vị GPS Realtime", 30), createDataCell("Tọa độ GPS di chuyển mượt mà trên bản đồ Web ReactJS không cần refresh lại trang.", 55)] }),
            new TableRow({ children: [createDataCell("AC-04", 15, true, true), createDataCell("Nhật Ký Sức Khỏe", 30, true), createDataCell("Chụp ảnh & nhập chỉ số sức khỏe trên Mobile App; hiển thị ngay trên timeline Customer.", 55, true)] }),
            new TableRow({ children: [createDataCell("AC-05", 15, false, true), createDataCell("Báo Động SOS", 30), createDataCell("Bấm giữ SOS 3s trên Mobile; Web Dashboard đổ chuông và mở pop-up cảnh báo vị trí < 500ms.", 55)] }),
            new TableRow({ children: [createDataCell("AC-06", 15, true, true), createDataCell("Ký Bàn Giao POD", 30, true), createDataCell("Vẽ chữ ký trực tiếp trên màn hình Mobile; tự động cập nhật COMPLETED và xuất biên bản.", 55, true)] })
          ]
        }),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("----------------------------------------------------------------------------------------------------", false, true),
        createParagraph("Tài liệu SRS này là căn cứ kỹ thuật chính thức để nghiệm thu dự án CBRT-2026.", true, true)
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, 'REQUIREMENTS.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('Successfully created REQUIREMENTS.docx at: ' + outputPath);
}

buildDocx().catch(err => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
