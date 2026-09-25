const DAY = 24 * 60 * 60 * 1000;

const atRelativeDay = (dayOffset, hour, minute = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setTime(date.getTime() + dayOffset * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const createManagerDemoData = () => ({
  version: 2,
  drivers: [
    { id: 'drv-001', code: 'TX001', fullName: 'Nguyễn Minh Hoàng', phone: '0901234567', email: 'hoang.nguyen@cbrt.demo', licenseNumber: '790123456789', licenseClass: 'C', licenseExpiry: atRelativeDay(420, 0), status: 'ACTIVE', notes: 'Có kinh nghiệm tuyến Việt Nam - Campuchia.' },
    { id: 'drv-002', code: 'TX002', fullName: 'Trần Quốc Bảo', phone: '0912345678', email: 'bao.tran@cbrt.demo', licenseNumber: '790234567890', licenseClass: 'FC', licenseExpiry: atRelativeDay(275, 0), status: 'ACTIVE', notes: 'Ưu tiên các chuyến đường dài.' },
    { id: 'drv-003', code: 'TX003', fullName: 'Lê Anh Tuấn', phone: '0933456789', email: '', licenseNumber: '790345678901', licenseClass: 'C', licenseExpiry: atRelativeDay(190, 0), status: 'ACTIVE', notes: '' },
    { id: 'drv-004', code: 'TX004', fullName: 'Phạm Đức Long', phone: '0944567890', email: 'long.pham@cbrt.demo', licenseNumber: '790456789012', licenseClass: 'D', licenseExpiry: atRelativeDay(510, 0), status: 'ACTIVE', notes: 'Thông thạo tuyến cửa khẩu Mộc Bài.' },
    { id: 'drv-005', code: 'TX005', fullName: 'Võ Thành Nam', phone: '0965678901', email: '', licenseNumber: '790567890123', licenseClass: 'C', licenseExpiry: atRelativeDay(85, 0), status: 'ACTIVE', notes: 'Cần theo dõi ngày hết hạn giấy phép.' },
    { id: 'drv-006', code: 'TX006', fullName: 'Đặng Hữu Phúc', phone: '0976789012', email: 'phuc.dang@cbrt.demo', licenseNumber: '790678901234', licenseClass: 'C', licenseExpiry: atRelativeDay(360, 0), status: 'INACTIVE', notes: 'Hồ sơ mẫu chưa được phân công.' },
    { id: 'drv-007', code: 'TX007', fullName: 'Đoàn Văn Hùng', phone: '0908887766', email: 'hung.doan@cbrt.com', licenseNumber: '790789012345', licenseClass: 'FC', licenseExpiry: atRelativeDay(730, 0), status: 'ACTIVE', notes: '10 năm kinh nghiệm vận chuyển ngựa đua quốc tế tuyến VN - KH - TH.' },
    { id: 'drv-008', code: 'TX008', fullName: 'Nguyễn Tấn Đạt', phone: '0919998877', email: 'dat.nguyen@cbrt.com', licenseNumber: '790890123456', licenseClass: 'FC', licenseExpiry: atRelativeDay(950, 0), status: 'ACTIVE', notes: 'Thông thạo luồng xanh thông quan cửa khẩu Hà Tiên & Mộc Bài.' },
    { id: 'drv-009', code: 'TX009', fullName: 'Hoàng Xuân Trường', phone: '0937776655', email: 'truong.hoang@cbrt.com', licenseNumber: '790901234567', licenseClass: 'C', licenseExpiry: atRelativeDay(450, 0), status: 'ACTIVE', notes: 'Thành thạo điều khiển xe chở ngựa trang bị giảm xóc khí nén.' },
    { id: 'drv-010', code: 'TX010', fullName: 'Trịnh Thanh Sơn', phone: '0946665544', email: 'son.trinh@cbrt.com', licenseNumber: '791012345678', licenseClass: 'FC', licenseExpiry: atRelativeDay(680, 0), status: 'ACTIVE', notes: 'Có chứng chỉ sơ cứu thú y cơ bản, chuyên ca đêm.' },
    { id: 'drv-011', code: 'TX011', fullName: 'Phan Văn Hữu', phone: '0965554433', email: 'huu.phan@cbrt.com', licenseNumber: '791123456789', licenseClass: 'D', licenseExpiry: atRelativeDay(820, 0), status: 'ACTIVE', notes: 'Chuyên trách vận chuyển ngựa thi đấu đỉnh cao (Grade 1 Racehorses).' }
  ],
  escorts: [
    { id: 'esc-001', code: 'PX001', fullName: 'Đỗ Thu Hà', phone: '0981112233', email: 'ha.do@cbrt.demo', experience: '5 năm chăm sóc ngựa đua, quen xử lý căng thẳng khi di chuyển.', status: 'ACTIVE', notes: '' },
    { id: 'esc-002', code: 'PX002', fullName: 'Ngô Hải Yến', phone: '0982223344', email: 'yen.ngo@cbrt.demo', experience: 'Có chứng nhận sơ cứu thú y cơ bản.', status: 'ACTIVE', notes: 'Ưu tiên ca ngày.' },
    { id: 'esc-003', code: 'PX003', fullName: 'Bùi Văn Khang', phone: '0983334455', email: '', experience: '3 năm làm việc tại trại ngựa.', status: 'ACTIVE', notes: '' },
    { id: 'esc-004', code: 'PX004', fullName: 'Mai Thanh Thảo', phone: '0984445566', email: 'thao.mai@cbrt.demo', experience: 'Chuyên theo dõi dinh dưỡng và cấp nước.', status: 'ACTIVE', notes: '' },
    { id: 'esc-005', code: 'PX005', fullName: 'Hồ Gia Hân', phone: '0985556677', email: '', experience: 'Kinh nghiệm hộ tống các chuyến xuyên biên giới.', status: 'ACTIVE', notes: '' },
    { id: 'esc-006', code: 'PX006', fullName: 'Tạ Minh Châu', phone: '0986667788', email: 'chau.ta@cbrt.demo', experience: 'Nhân sự dự phòng mới bổ sung.', status: 'INACTIVE', notes: 'Hồ sơ mẫu chưa được phân công.' }
  ],
  trips: [
    {
      id: 'trip-001', code: 'TRP-2601', orderCode: 'ORD-2601', customer: 'CLB Đua ngựa Sài Gòn', origin: 'TP. Hồ Chí Minh, Việt Nam', destination: 'Phnom Penh, Campuchia', startAt: atRelativeDay(1, 8), endAt: atRelativeDay(1, 16), horseCount: 2, vehiclePlate: '51D-246.80', driverId: null, escortId: null, status: 'PLANNED', specialRequirements: 'Duy trì thông gió, dừng kiểm tra sức khỏe mỗi 3 giờ.', horses: [{ id: 'horse-101', name: 'Thiên Mã', passport: 'VN-H-101' }, { id: 'horse-102', name: 'Hồng Phúc', passport: 'VN-H-102' }], assignmentNote: '', assignmentHistory: []
    },
    {
      id: 'trip-002', code: 'TRP-2602', orderCode: 'ORD-2602', customer: 'Sunrise Racing', origin: 'Bình Dương, Việt Nam', destination: 'Bangkok, Thái Lan', startAt: atRelativeDay(2, 7), endAt: atRelativeDay(2, 17), horseCount: 1, vehiclePlate: '61H-118.36', driverId: 'drv-001', escortId: null, status: 'PLANNED', specialRequirements: 'Ngựa nhạy cảm với tiếng ồn lớn.', horses: [{ id: 'horse-103', name: 'Bình Minh', passport: 'VN-H-103' }], assignmentNote: 'Đã xếp tài xế tuyến chính.', assignmentHistory: [{ id: 'hist-201', changedAt: atRelativeDay(-1, 9), role: 'DRIVER', oldPersonId: null, newPersonId: 'drv-001', reason: 'Phân công ban đầu' }]
    },
    {
      id: 'trip-003', code: 'TRP-2603', orderCode: 'ORD-2603', customer: 'Royal Stable', origin: 'Đồng Nai, Việt Nam', destination: 'Siem Reap, Campuchia', startAt: atRelativeDay(3, 9), endAt: atRelativeDay(3, 18), horseCount: 3, vehiclePlate: '60C-772.15', driverId: 'drv-002', escortId: 'esc-002', status: 'PLANNED', specialRequirements: 'Chuẩn bị thêm nước điện giải.', horses: [{ id: 'horse-104', name: 'Sao Mai', passport: 'VN-H-104' }, { id: 'horse-105', name: 'Phong Vũ', passport: 'VN-H-105' }, { id: 'horse-106', name: 'Kim Long', passport: 'VN-H-106' }], assignmentNote: 'Đội đã quen phối hợp.', assignmentHistory: []
    },
    {
      id: 'trip-004', code: 'TRP-2604', orderCode: 'ORD-2604', customer: 'Mekong Equestrian', origin: 'Tây Ninh, Việt Nam', destination: 'Phnom Penh, Campuchia', startAt: atRelativeDay(0, 6), endAt: atRelativeDay(0, 20), horseCount: 2, vehiclePlate: '70H-325.19', driverId: 'drv-003', escortId: 'esc-003', status: 'IN_TRANSIT', specialRequirements: 'Theo dõi nhiệt độ khoang mỗi 30 phút.', horses: [{ id: 'horse-107', name: 'Xích Thố', passport: 'VN-H-107' }, { id: 'horse-108', name: 'Bạch Long', passport: 'VN-H-108' }], assignmentNote: 'Đang thực hiện, chỉ đọc phân công.', assignmentHistory: []
    },
    {
      id: 'trip-005', code: 'TRP-2605', orderCode: 'ORD-2605', customer: 'Golden Hoof Farm', origin: 'Long An, Việt Nam', destination: 'Kandal, Campuchia', startAt: atRelativeDay(-5, 8), endAt: atRelativeDay(-5, 15), horseCount: 1, vehiclePlate: '62C-441.08', driverId: 'drv-001', escortId: 'esc-001', status: 'COMPLETED', specialRequirements: 'Không có.', horses: [{ id: 'horse-109', name: 'Hải Đăng', passport: 'VN-H-109' }], assignmentNote: '', assignmentHistory: []
    },
    {
      id: 'trip-006', code: 'TRP-2606', orderCode: 'ORD-2606', customer: 'Victory Horse Club', origin: 'TP. Hồ Chí Minh, Việt Nam', destination: 'Vientiane, Lào', startAt: atRelativeDay(5, 5), endAt: atRelativeDay(6, 18), horseCount: 2, vehiclePlate: '', driverId: null, escortId: null, status: 'CANCELLED', specialRequirements: 'Chuyến đã hủy theo yêu cầu khách hàng.', horses: [{ id: 'horse-110', name: 'Victory One', passport: 'VN-H-110' }, { id: 'horse-111', name: 'Victory Two', passport: 'VN-H-111' }], assignmentNote: '', assignmentHistory: []
    },
    {
      id: 'trip-007', code: 'TRP-2607', orderCode: 'ORD-2607', customer: 'Emerald Racing Team', origin: 'Vũng Tàu, Việt Nam', destination: 'Bangkok, Thái Lan', startAt: atRelativeDay(2, 10), endAt: atRelativeDay(2, 19), horseCount: 1, vehiclePlate: '72C-909.12', driverId: 'drv-004', escortId: 'esc-004', status: 'PLANNED', specialRequirements: 'Không xếp chung với vật tư có mùi mạnh.', horses: [{ id: 'horse-112', name: 'Lục Bảo', passport: 'VN-H-112' }], assignmentNote: 'Tạo tình huống trùng lịch để kiểm thử.', assignmentHistory: []
    },
    {
      id: 'trip-008', code: 'TRP-2608', orderCode: 'ORD-2608', customer: 'An Phú Stud Farm', origin: 'Lâm Đồng, Việt Nam', destination: 'Phnom Penh, Campuchia', startAt: atRelativeDay(7, 6), endAt: atRelativeDay(7, 16), horseCount: 2, vehiclePlate: '49C-188.22', driverId: 'drv-005', escortId: 'esc-005', status: 'PLANNED', specialRequirements: 'Giữ nhiệt độ ổn định 20–24°C.', horses: [{ id: 'horse-113', name: 'Đại Ngàn', passport: 'VN-H-113' }, { id: 'horse-114', name: 'Thông Xanh', passport: 'VN-H-114' }], assignmentNote: '', assignmentHistory: []
    }
  ]
});

