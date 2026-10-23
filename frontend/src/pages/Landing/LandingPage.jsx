import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  ShieldCheck,
  FileCheck,
  Activity,
  Search,
  Calculator,
  Compass,
  MapPin,
  Clock,
  PhoneCall,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Users,
  Award,
  Globe2,
  Calendar,
  Layers,
  ChevronDown,
  Navigation,
  Sparkles,
  Stethoscope
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES } from '../../utils/constants';
import './landing.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.sessionStatus === 'authenticated' && !!state.user);

  // Terminal Tab State: 'track' | 'calc' | 'matrix'
  const [activeTab, setActiveTab] = useState('track');

  // Tracking Form State
  const [trackingCode, setTrackingCode] = useState('BK-1');
  const [phoneSuffix, setPhoneSuffix] = useState('6879');
  const [waybillResult, setWaybillResult] = useState({
    code: 'BK-1',
    status: 'IN_TRANSIT',
    statusLabel: 'Đang vận chuyển trên tuyến',
    statusColor: '#2563eb',
    route: 'Trang trại Tân Bình ➔ Trạm nghỉ số 2 ➔ Trường đua Quốc tế',
    vehiclePlate: '51B-892.44 (Xe Medium 4 khoang)',
    driverName: 'Nguyễn Văn Toàn (Tài xế hạng FC)',
    escortName: 'BS. Trần Minh Tuấn (Bác sĩ thú y FEI)',
    currentLocation: 'Km 62 - Tuyến vận chuyển chuyên dụng',
    horseHealth: 'Thân nhiệt: 38.2°C · Uống nước: 35L · Trạng thái: Rất tốt',
    lastUpdate: 'Cách đây 5 phút'
  });
  const [hasSearched, setHasSearched] = useState(true);

  // Price Calculator State
  const [selectedRouteType, setSelectedRouteType] = useState('REGIONAL');
  const [distanceKm, setDistanceKm] = useState(350);
  const [stallType, setStallType] = useState('MEDIUM');
  const [includeEscort, setIncludeEscort] = useState(true);
  const [includeQuarantine, setIncludeQuarantine] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(true);

  // Corridor Showcase State: 'INTERSTATE' | 'CROSSBORDER' | 'LOCAL'
  const [activeCorridor, setActiveCorridor] = useState('INTERSTATE');

  // Handle Quick Tracking Search
  const handleTrackingSubmit = (e) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    if (trackingCode.toUpperCase().includes('BK-2') || trackingCode.toUpperCase().includes('VD-2')) {
      setWaybillResult({
        code: trackingCode.toUpperCase(),
        status: 'READY_FOR_DISPATCH',
        statusLabel: 'Đã hoàn tất kiểm dịch, sẵn sàng điều xe',
        statusColor: '#10b981',
        route: 'Trang trại Miền Bắc ➔ Trạm kiểm định ➔ Trường đua Miền Trung',
        vehiclePlate: '29H-774.12 (Xe Heavy 9 khoang)',
        driverName: 'Lê Hoàng Nam (Tài xế hạng FC)',
        escortName: 'BS. Vũ Thị Lan (Chứng chỉ thú y CLB)',
        currentLocation: 'Bãi đỗ trung tâm CBRT',
        horseHealth: 'Đã tiêm vắc xin Cúm ngựa & Dịch tả · Đủ điều kiện',
        lastUpdate: 'Hôm nay 08:30'
      });
    } else {
      setWaybillResult({
        code: trackingCode.toUpperCase(),
        status: 'IN_TRANSIT',
        statusLabel: 'Đang vận chuyển trên tuyến',
        statusColor: '#2563eb',
        route: 'Trang trại Tân Bình ➔ Trạm nghỉ số 2 ➔ Trường đua Quốc tế',
        vehiclePlate: '51B-892.44 (Xe Medium 4 khoang)',
        driverName: 'Nguyễn Văn Toàn (Tài xế hạng FC)',
        escortName: 'BS. Trần Minh Tuấn (Bác sĩ thú y FEI)',
        currentLocation: 'Km 62 - Tuyến vận chuyển chuyên dụng',
        horseHealth: 'Thân nhiệt: 38.2°C · Uống nước: 35L · Trạng thái: Rất tốt',
        lastUpdate: 'Cách đây 5 phút'
      });
    }
    setHasSearched(true);
  };

  const handleSelectSample = (code, phone) => {
    setTrackingCode(code);
    setPhoneSuffix(phone);
    if (code === 'BK-2') {
      setWaybillResult({
        code: 'BK-2',
        status: 'READY_FOR_DISPATCH',
        statusLabel: 'Đã hoàn tất kiểm dịch, sẵn sàng điều xe',
        statusColor: '#10b981',
        route: 'Trang trại Miền Bắc ➔ Trạm kiểm định ➔ Trường đua Miền Trung',
        vehiclePlate: '29H-774.12 (Xe Heavy 9 khoang)',
        driverName: 'Lê Hoàng Nam (Tài xế hạng FC)',
        escortName: 'BS. Vũ Thị Lan (Chứng chỉ thú y CLB)',
        currentLocation: 'Bãi đỗ trung tâm CBRT',
        horseHealth: 'Đã tiêm vắc xin Cúm ngựa & Dịch tả · Đủ điều kiện',
        lastUpdate: 'Hôm nay 08:30'
      });
    } else {
      setWaybillResult({
        code: 'BK-1',
        status: 'IN_TRANSIT',
        statusLabel: 'Đang vận chuyển trên tuyến',
        statusColor: '#2563eb',
        route: 'Trang trại Tân Bình ➔ Trạm nghỉ số 2 ➔ Trường đua Quốc tế',
        vehiclePlate: '51B-892.44 (Xe Medium 4 khoang)',
        driverName: 'Nguyễn Văn Toàn (Tài xế hạng FC)',
        escortName: 'BS. Trần Minh Tuấn (Bác sĩ thú y FEI)',
        currentLocation: 'Km 62 - Tuyến vận chuyển chuyên dụng',
        horseHealth: 'Thân nhiệt: 38.2°C · Uống nước: 35L · Trạng thái: Rất tốt',
        lastUpdate: 'Cách đây 5 phút'
      });
    }
    setHasSearched(true);
  };

  // Calculate Price Breakdown
  const computePrice = () => {
    let baseRatePerKm = 35000;
    if (stallType === 'LIGHT') baseRatePerKm = 30000;
    if (stallType === 'HEAVY') baseRatePerKm = 52000;

    const vehicleBase = distanceKm * baseRatePerKm;
    const personnelFee = includeEscort ? 1890000 : 0;
    const tollAndFuel = Math.round((distanceKm / 100) * 990000);
    const paperworkFee = includeQuarantine ? (selectedRouteType === 'LOCAL' ? 800000 : 2200000) : 0;
    const insuranceFee = includeInsurance ? 1500000 : 0;

    const total = vehicleBase + personnelFee + tollAndFuel + paperworkFee + insuranceFee;
    return {
      vehicleBase,
      personnelFee,
      tollAndFuel,
      paperworkFee,
      insuranceFee,
      total
    };
  };

  const calculatedCosts = computePrice();

  const handleBookingRedirect = () => {
    if (isAuthenticated) {
      navigate('/orders/create');
    } else {
      navigate('/login', { state: { from: '/orders/create' } });
    }
  };

  const handleDashboardRedirect = () => {
    if (!user) return navigate('/login');
    if ([USER_ROLES.LOGISTICS_MANAGER, USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR, USER_ROLES.TRANSPORT_SPECIALIST].includes(user.role)) {
      navigate('/manager');
    } else {
      navigate('/orders');
    }
  };

  return (
    <div className="cbrt-landing">
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="landing-topbar">
        <div className="landing-topbar__info">
          <span className="landing-topbar__badge">TIÊU CHUẨN QUỐC TẾ FEI</span>
          <span>Hệ thống Quản lý & Vận tải Ngựa đua Chuyên nghiệp · Đội xe chuyên dụng 2–9 khoang đệm khí</span>
        </div>
        <div className="landing-topbar__contact">
          <span className="landing-topbar__hotline">
            <PhoneCall size={14} /> Hotline 24/7: 1900 6879
          </span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span>Bảo hiểm động vật sống trọn gói</span>
        </div>
      </div>

      {/* 2. GLOBAL STICKY NAVBAR */}
      <header className="landing-header">
        <div className="landing-header__inner">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="landing-brand__emblem">
              🏇
            </div>
            <div className="landing-brand__titles">
              <span className="landing-brand__name">CBRT EXPRESS</span>
              <span className="landing-brand__sub">Hệ Thống Vận Tải Ngựa Đua Chuyên Nghiệp</span>
            </div>
          </div>

          <nav>
            <ul className="landing-nav__links">
              <li><a className="landing-nav__link is-active" href="#hero">Trang chủ</a></li>
              <li><a className="landing-nav__link" href="#corridors">Mạng lưới tuyến đường</a></li>
              <li><a className="landing-nav__link" href="#services">Dịch vụ tiêu chuẩn</a></li>
              <li><a className="landing-nav__link" href="#journey">Quy trình vận chuyển</a></li>
              <li><a className="landing-nav__link" href="#pricing">Biểu phí</a></li>
            </ul>
          </nav>

          <div className="landing-header__actions">
            <button
              type="button"
              className="btn-landing-outline"
              onClick={() => {
                setActiveTab('calc');
                const element = document.getElementById('command-hub');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Calculator size={15} /> Báo giá nhanh
            </button>

            <button
              type="button"
              className="btn-landing-primary"
              onClick={handleBookingRedirect}
            >
              <Truck size={16} /> Đặt chuyến ngay
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                className="btn-landing-outline"
                style={{ borderColor: '#bfdbfe', color: '#2563eb', background: '#eff6ff' }}
                onClick={handleDashboardRedirect}
              >
                Vào Bảng điều khiển
              </button>
            ) : (
              <button
                type="button"
                className="btn-landing-outline"
                style={{ borderColor: '#cbd5e1', color: '#0f172a', background: '#ffffff' }}
                onClick={() => navigate('/login')}
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION - LIGHT, AIRY & ELEGANT */}
      <section id="hero" className="landing-hero">
        <div className="landing-hero__inner">
          {/* LEFT: VALUE PROPOSITION */}
          <div>
            <div className="hero-badge-live">
              <span className="hero-pulse"></span>
              HỆ THỐNG VẬN HÀNH & ĐIỀU PHỐI TRỰC TUYẾN 24/7
            </div>

            <h1 className="hero-title">
              Vận Chuyển Ngựa Đua Chuyên Nghiệp
              <span className="hero-title__highlight">An Toàn Tuyệt Đối · Giám Sát Thời Gian Thực</span>
            </h1>

            <p className="hero-description">
              Giải pháp vận tải ngựa đua nguyên chuyến tiêu chuẩn quốc tế FEI. Xe thùng 2–9 khoang đệm khí chống rung chấn, 
              bác sĩ thú y theo sát sức khỏe từng chặng, hỗ trợ hồ sơ kiểm dịch và bảo hiểm động vật sống trọn gói.
            </p>

            <div className="hero-guarantees">
              <span className="hero-guarantee-pill">
                <ShieldCheck size={16} color="#2563eb" /> Xe riêng nguyên chuyến — Không ghép đàn lạ
              </span>
              <span className="hero-guarantee-pill">
                <Stethoscope size={16} color="#2563eb" /> Bác sĩ thú y & Hộ tống viên đi kèm
              </span>
              <span className="hero-guarantee-pill">
                <FileCheck size={16} color="#2563eb" /> Hồ sơ FEI Passport & Kiểm dịch trọn gói
              </span>
              <span className="hero-guarantee-pill">
                <Compass size={16} color="#2563eb" /> Định vị GPS & Đo thân nhiệt thời gian thực
              </span>
            </div>

            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-landing-primary"
                style={{ padding: '13px 26px', fontSize: 15 }}
                onClick={handleBookingRedirect}
              >
                <Truck size={18} /> Đặt chuyến vận chuyển ngay
              </button>

              <button
                type="button"
                className="btn-landing-outline"
                style={{ padding: '13px 22px', fontSize: 15 }}
                onClick={() => {
                  const el = document.getElementById('corridors');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Khám phá lộ trình <ArrowRight size={16} />
              </button>
            </div>

            <div className="hero-stats">
              <div className="hero-stat-card">
                <span className="hero-stat-number">+1,500</span>
                <span className="hero-stat-label">Chuyến xe an toàn</span>
              </div>
              <div className="hero-stat-card">
                <span className="hero-stat-number">100%</span>
                <span className="hero-stat-label">Bảo hiểm FEI kê khai</span>
              </div>
              <div className="hero-stat-card">
                <span className="hero-stat-number">24/7</span>
                <span className="hero-stat-label">Giám sát IoT thời gian thực</span>
              </div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE COMMAND TERMINAL (LIGHT THEME) */}
          <div id="command-hub" className="command-hub">
            <div className="command-hub__header">
              <div className="command-hub__title">
                <Layers size={17} color="#2563eb" />
                <span>CBRT COMMAND TERMINAL</span>
              </div>
              <div className="command-hub__status">
                <Activity size={13} /> Sẵn sàng tra cứu & Báo giá
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="command-hub__tabs">
              <button
                type="button"
                className={`hub-tab ${activeTab === 'track' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('track')}
              >
                <Search size={15} /> Tra cứu vận đơn
              </button>
              <button
                type="button"
                className={`hub-tab ${activeTab === 'calc' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('calc')}
              >
                <Calculator size={15} /> Dự toán cước nhanh
              </button>
              <button
                type="button"
                className={`hub-tab ${activeTab === 'matrix' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('matrix')}
              >
                <FileCheck size={15} /> Biểu phí chuẩn
              </button>
            </div>

            <div className="command-hub__body">
              {/* TAB 1: TRA CỨU ĐƠN HÀNG */}
              {activeTab === 'track' && (
                <div className="hub-tracking-form">
                  <form onSubmit={handleTrackingSubmit}>
                    <div className="hub-input-row">
                      <div className="hub-field">
                        <label>Mã đơn hàng / Vận đơn (VD: BK-1, VD-...)</label>
                        <input
                          type="text"
                          className="hub-input"
                          placeholder="Nhập mã đơn cần tra cứu"
                          value={trackingCode}
                          onChange={(e) => setTrackingCode(e.target.value)}
                        />
                      </div>
                      <div className="hub-field">
                        <label>4 số cuối SĐT người đặt</label>
                        <input
                          type="text"
                          className="hub-input"
                          maxLength={4}
                          placeholder="Ví dụ: 6879"
                          value={phoneSuffix}
                          onChange={(e) => setPhoneSuffix(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="hub-quick-samples">
                        <span>Mã mẫu:</span>
                        <span className="sample-tag" onClick={() => handleSelectSample('BK-1', '6879')}>
                          BK-1 (Tuyến đường dài)
                        </span>
                        <span className="sample-tag" onClick={() => handleSelectSample('BK-2', '1234')}>
                          BK-2 (Tuyến liên vận)
                        </span>
                      </div>

                      <button type="submit" className="btn-landing-primary" style={{ padding: '8px 18px' }}>
                        <Search size={15} /> Tìm kiếm
                      </button>
                    </div>
                  </form>

                  {/* RESULT PREVIEW CARD */}
                  {hasSearched && waybillResult && (
                    <div className="waybill-preview">
                      <div className="waybill-preview__header">
                        <div className="waybill-code">
                          <Truck size={17} color="#2563eb" />
                          <span>Vận đơn: {waybillResult.code}</span>
                        </div>
                        <span className="waybill-badge">
                          {waybillResult.statusLabel}
                        </span>
                      </div>

                      <div className="waybill-route">
                        <MapPin size={15} color="#2563eb" />
                        <span>{waybillResult.route}</span>
                      </div>

                      <div className="waybill-grid">
                        <div className="waybill-grid-item">
                          <span>Phương tiện chuyên dụng</span>
                          <span>{waybillResult.vehiclePlate}</span>
                        </div>
                        <div className="waybill-grid-item">
                          <span>Tài xế phụ trách</span>
                          <span>{waybillResult.driverName}</span>
                        </div>
                        <div className="waybill-grid-item">
                          <span>Hộ tống viên thú y</span>
                          <span>{waybillResult.escortName}</span>
                        </div>
                        <div className="waybill-grid-item">
                          <span>Vị trí chặng xe</span>
                          <span>{waybillResult.currentLocation}</span>
                        </div>
                      </div>

                      <div className="waybill-health-box">
                        <div style={{ color: '#059669', fontWeight: 600 }}>● Sức khỏe ngựa: {waybillResult.horseHealth}</div>
                        <div style={{ color: '#64748b', fontSize: 11.5, marginTop: 4 }}>Cập nhật lần cuối: {waybillResult.lastUpdate}</div>
                      </div>

                      <button
                        type="button"
                        className="btn-landing-outline"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => navigate('/routes/tracking')}
                      >
                        <Compass size={15} /> Mở bản đồ định vị GPS chi tiết
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TÍNH CƯỚC NHANH */}
              {activeTab === 'calc' && (
                <div className="calc-grid">
                  <div className="calc-row">
                    <div className="hub-field">
                      <label>Hình thức tuyến đường</label>
                      <select
                        className="calc-select"
                        value={selectedRouteType}
                        onChange={(e) => {
                          setSelectedRouteType(e.target.value);
                          if (e.target.value === 'REGIONAL') setDistanceKm(350);
                          if (e.target.value === 'CROSSBORDER') setDistanceKm(520);
                          if (e.target.value === 'LOCAL') setDistanceKm(120);
                        }}
                      >
                        <option value="REGIONAL">Tuyến liên tỉnh đường dài (Khoảng cách ~350 km)</option>
                        <option value="CROSSBORDER">Tuyến liên vận quốc tế / Xuyên biên giới (~520 km)</option>
                        <option value="LOCAL">Tuyến cự ly ngắn trang trại ↔ trường đua (~120 km)</option>
                      </select>
                    </div>

                    <div className="hub-field">
                      <label>Khoảng cách lộ trình (Km)</label>
                      <input
                        type="number"
                        className="hub-input"
                        value={distanceKm}
                        min={30}
                        max={3000}
                        onChange={(e) => setDistanceKm(Number(e.target.value) || 50)}
                      />
                    </div>
                  </div>

                  <div className="hub-field">
                    <label>Loại thùng xe chuyên dụng</label>
                    <select
                      className="calc-select"
                      value={stallType}
                      onChange={(e) => setStallType(e.target.value)}
                    >
                      <option value="LIGHT">Xe Light (2 khoang VIP - Dành cho 1-2 ngựa)</option>
                      <option value="MEDIUM">Xe Medium (4 - 6 khoang - Tiêu chuẩn đội đua)</option>
                      <option value="HEAVY">Xe Heavy (9 khoang - Chở cả đàn / CLB)</option>
                    </select>
                  </div>

                  <div className="calc-addons">
                    <label className="calc-checkbox-label">
                      <input
                        type="checkbox"
                        checked={includeEscort}
                        onChange={(e) => setIncludeEscort(e.target.checked)}
                      />
                      <span>Bác sĩ thú y & Hộ tống viên y tế chăm sóc suốt tuyến (+1,890,000 đ/ngày)</span>
                    </label>

                    <label className="calc-checkbox-label">
                      <input
                        type="checkbox"
                        checked={includeQuarantine}
                        onChange={(e) => setIncludeQuarantine(e.target.checked)}
                      />
                      <span>Hồ sơ kiểm dịch & Thủ tục thông quan trọn gói (+{selectedRouteType === 'LOCAL' ? '800,000' : '2,200,000'} đ)</span>
                    </label>

                    <label className="calc-checkbox-label">
                      <input
                        type="checkbox"
                        checked={includeInsurance}
                        onChange={(e) => setIncludeInsurance(e.target.checked)}
                      />
                      <span>Bảo hiểm Động vật sống FEI theo giá trị kê khai (+1,500,000 đ)</span>
                    </label>
                  </div>

                  <div className="calc-total-card">
                    <div>
                      <div className="calc-total-label">Tổng cước dự toán trọn gói:</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Bao gồm xe, nhiên liệu, cầu đường, nhân sự & kiểm dịch
                      </div>
                    </div>
                    <div className="calc-total-price">
                      {calculatedCosts.total.toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-landing-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleBookingRedirect}
                  >
                    <Truck size={17} /> Đặt chuyến với cấu hình này
                  </button>
                </div>
              )}

              {/* TAB 3: BIỂU PHÍ NIÊM YẾT CHUẨN */}
              {activeTab === 'matrix' && (
                <div>
                  <div className="matrix-container">
                    <table className="matrix-table">
                      <thead>
                        <tr>
                          <th>Quãng đường</th>
                          <th>Light (2 khoang)</th>
                          <th>Medium (4–6 khoang)</th>
                          <th>Heavy (9 khoang)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>50 km</strong></td>
                          <td>4,500,000 đ</td>
                          <td>6,300,000 đ</td>
                          <td>8,500,000 đ</td>
                        </tr>
                        <tr>
                          <td><strong>150 km</strong></td>
                          <td>7,200,000 đ</td>
                          <td>10,100,000 đ</td>
                          <td>13,700,000 đ</td>
                        </tr>
                        <tr>
                          <td><strong>300 km</strong></td>
                          <td>11,300,000 đ</td>
                          <td>15,800,000 đ</td>
                          <td>21,500,000 đ</td>
                        </tr>
                        <tr>
                          <td><strong>500 km</strong></td>
                          <td>17,500,000 đ</td>
                          <td>24,500,000 đ</td>
                          <td>33,200,000 đ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: 14, background: '#f8fafc', padding: '12px 14px', borderRadius: 8, fontSize: 12.5, color: '#334155', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>Chi phí cố định bổ sung:</div>
                    <div>• Nhân sự (01 tài xế chuyên nghiệp + 01 bác sĩ thú y): <strong>1,890,000 đ/ngày</strong></div>
                    <div>• Nhiên liệu và phí BOT cầu đường: <strong>990,000 đ/100 km</strong></div>
                    <div>• Khoang đơn mở rộng đặc biệt: <strong>1,500,000 đ/ngựa</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORRIDORS & NETWORK SHOWCASE */}
      <section id="corridors" className="landing-section">
        <div className="landing-container">
          <div className="section-head">
            <span className="section-badge">Mạng Lưới Tuyến Đường</span>
            <h2 className="section-title">Hành Lang Tuyến Vận Chuyển Linh Hoạt</h2>
            <p className="section-subtitle">
              Kết nối trực tiếp giữa các trang trại nhân giống, trung tâm huấn luyện và trường đua lớn. 
              Mỗi lộ trình đều được bố trí các trạm nghỉ phúc lợi thú y định kỳ.
            </p>
          </div>

          <div className="corridor-tabs">
            <button
              type="button"
              className={`corridor-btn ${activeCorridor === 'INTERSTATE' ? 'is-active' : ''}`}
              onClick={() => setActiveCorridor('INTERSTATE')}
            >
              <span>🛣️ Tuyến Đường Dài Liên Tỉnh</span>
            </button>
            <button
              type="button"
              className={`corridor-btn ${activeCorridor === 'CROSSBORDER' ? 'is-active' : ''}`}
              onClick={() => setActiveCorridor('CROSSBORDER')}
            >
              <span>🌐 Tuyến Liên Vận Quốc Tế / Cửa Khẩu</span>
            </button>
            <button
              type="button"
              className={`corridor-btn ${activeCorridor === 'LOCAL' ? 'is-active' : ''}`}
              onClick={() => setActiveCorridor('LOCAL')}
            >
              <span>🔄 Tuyến Nội Vùng Trang Trại & Trường Đua</span>
            </button>
          </div>

          <div className="corridor-showcase">
            <div className="corridor-stage-flow">
              <div className="stage-step-card">
                <span className="stage-step-card__num">Chặng 01</span>
                <h4 className="stage-step-card__title">Điểm đón (Farm / Trang trại)</h4>
                <p className="stage-step-card__desc">
                  Kiểm tra mã microchip ISO 11784/11785, soi dấu móng và khám sinh hiệu cơ bản trước khi bốc ngựa lên xe đệm khí.
                </p>
              </div>

              <div className="stage-step-card">
                <span className="stage-step-card__num">Chặng 02</span>
                <h4 className="stage-step-card__title">Trạm nghỉ phúc lợi (3h/lần)</h4>
                <p className="stage-step-card__desc">
                  Dừng tại trạm chỉ định: dắt ngựa thả lỏng cơ, cấp nước điện giải và đo thân nhiệt ghi nhận vào sổ nhật ký số.
                </p>
              </div>

              <div className="stage-step-card">
                <span className="stage-step-card__num">Chặng 03</span>
                <h4 className="stage-step-card__title">Trạm kiểm định / Cửa khẩu</h4>
                <p className="stage-step-card__desc">
                  Thực hiện thủ tục kiểm dịch động vật sống, đối soát hồ sơ tiêm chủng và thông quan ưu tiên trong 30–45 phút.
                </p>
              </div>

              <div className="stage-step-card">
                <span className="stage-step-card__num">Chặng 04</span>
                <h4 className="stage-step-card__title">Điểm giao (Trường đua)</h4>
                <p className="stage-step-card__desc">
                  Hạ bốc ngựa an toàn, bác sĩ đối soát thể trạng thực tế, khách hàng nghiệm thu và ký biên bản điện tử POD.
                </p>
              </div>
            </div>

            <div className="corridor-info-bar">
              <div className="corridor-info-item">
                <span className="corridor-info-label">Hình thức xe điều phối</span>
                <span className="corridor-info-value">Xe chuyên dụng 2–9 khoang đệm khí</span>
              </div>
              <div className="corridor-info-item">
                <span className="corridor-info-label">Thời gian trung bình</span>
                <span className="corridor-info-value">Tùy cự ly lộ trình đặt trước</span>
              </div>
              <div className="corridor-info-item">
                <span className="corridor-info-label">Tiêu chuẩn kiểm dịch</span>
                <span className="corridor-info-value">Hộ chiếu FEI + Giấy kiểm dịch động vật sống</span>
              </div>
              <div className="corridor-info-item">
                <span className="corridor-info-label">Chế độ chăm sóc</span>
                <span className="corridor-info-value">01 Tài xế FC + 01 Bác sĩ thú y túc trực</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DỊCH VỤ TIÊU CHUẨN (BENTO GRID STYLE) */}
      <section id="services" className="landing-section landing-section--subtle">
        <div className="landing-container">
          <div className="section-head">
            <span className="section-badge">Dịch Vụ Chuyên Biệt</span>
            <h2 className="section-title">Tiêu Chuẩn Vận Tải Ngựa Đua Hàng Đầu</h2>
            <p className="section-subtitle">
              Được thiết kế toàn diện xoay quanh sự an toàn, phúc lợi và thể lực tốt nhất của chiến mã khi đến đích.
            </p>
          </div>

          <div className="bento-grid">
            {/* LARGE FEATURE CARD */}
            <div className="bento-card bento-card--large">
              <div className="bento-icon-box">
                <Truck size={24} />
              </div>
              <h3 className="bento-card__title">Đội Xe Chuyên Dụng 2–9 Khoang Chuẩn Châu Âu</h3>
              <p className="bento-card__desc">
                Thùng xe được thiết kế với vách ngăn đệm khí composite êm ái, hấp thụ tối đa rung chấn đường dài. 
                Hệ thống điều hòa không khí 2 chiều và quạt thông gió cưỡng bức liên tục cung cấp không khí sạch giàu oxy.
              </p>
              <ul className="bento-feature-list">
                <li><CheckCircle size={15} /> Camera hồng ngoại 360° theo dõi từng buồng ngựa</li>
                <li><CheckCircle size={15} /> Sàn cao su non chống trượt và chống mỏi cơ</li>
                <li><CheckCircle size={15} /> Máng ăn và bình cấp nước tự động ngắt</li>
                <li><CheckCircle size={15} /> Đèn chiếu sáng ánh sáng xanh dịu giúp ngựa thư giãn</li>
              </ul>
              <img
                src="/images/luxury_horse_transport.jpg"
                alt="Xe chuyên dụng vận chuyển ngựa đua"
                className="bento-card__img"
              />
            </div>

            {/* CARD 2: VET & WELFARE */}
            <div className="bento-card">
              <div className="bento-icon-box">
                <Stethoscope size={24} />
              </div>
              <h3 className="bento-card__title">Bác Sĩ Thú Y & Giám Sát Sức Khỏe 24/7</h3>
              <p className="bento-card__desc">
                Mỗi chuyến xe luôn có 01 hộ tống viên được đào tạo chuyên sâu về sơ cứu thú y. 
                Thân nhiệt, nhịp thở và lượng nước tiêu thụ được kiểm tra định kỳ và cập nhật vào app.
              </p>
              <img
                src="/images/horse_vet_care.jpg"
                alt="Chăm sóc thú y cho ngựa đua"
                style={{ height: 140, objectFit: 'cover', borderRadius: 8, marginTop: 10, border: '1px solid #e2e8f0' }}
              />
            </div>

            {/* CARD 3: QUARANTINE & LEGAL */}
            <div className="bento-card">
              <div className="bento-icon-box">
                <FileCheck size={24} />
              </div>
              <h3 className="bento-card__title">Pháp Lý & Hồ Sơ Kiểm Dịch Trọn Gói</h3>
              <p className="bento-card__desc">
                Đội ngũ chuyên viên CBRT hỗ trợ xử lý toàn bộ giấy tờ kiểm dịch động vật sống, xác nhận microchip, 
                và các thủ tục liên quan để ngựa được lưu thông hợp lệ và nhanh chóng.
              </p>
              <ul className="bento-feature-list">
                <li><CheckCircle size={15} /> Hộ chiếu điện tử FEI Digital Passport</li>
                <li><CheckCircle size={15} /> Chứng nhận xét nghiệm dịch tễ</li>
                <li><CheckCircle size={15} /> Giấy phép lưu thông động vật sống</li>
              </ul>
            </div>

            {/* CARD 4: LIVE ANIMAL INSURANCE */}
            <div className="bento-card">
              <div className="bento-icon-box">
                <ShieldCheck size={24} />
              </div>
              <h3 className="bento-card__title">Bảo Hiểm Động Vật Sống Toàn Diện</h3>
              <p className="bento-card__desc">
                Chính sách bảo hiểm chuyên biệt cam kết bảo vệ giá trị ngựa đua kê khai 
                nếu xảy ra tổn hại sức khỏe trong toàn bộ quá trình chuyên chở.
              </p>
            </div>

            {/* CARD 5: REALTIME GPS & IOT */}
            <div className="bento-card">
              <div className="bento-icon-box">
                <Compass size={24} />
              </div>
              <h3 className="bento-card__title">Theo Dõi Vận Đơn Bằng IoT Trực Tuyến</h3>
              <p className="bento-card__desc">
                Người gửi và người nhận ngựa đều có thể tra cứu vị trí xe trên bản đồ số, 
                theo dõi nhiệt độ thùng xe và nhận thông báo khi xe qua từng trạm kiểm soát.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. QUY TRÌNH VẬN CHUYỂN 6 BƯỚC */}
      <section id="journey" className="landing-section">
        <div className="landing-container">
          <div className="section-head">
            <span className="section-badge">Quy Trình Chuẩn Hóa</span>
            <h2 className="section-title">Hành Trình Vận Chuyển Từ A Đến Z</h2>
            <p className="section-subtitle">
              Mỗi đơn vận chuyển trải qua 6 bước khép kín với các mốc trạng thái minh bạch trên hệ thống.
            </p>
          </div>

          <div className="journey-timeline">
            <div className="journey-step">
              <div className="journey-step__badge">01</div>
              <h4 className="journey-step__title">Gửi đơn đặt chuyến</h4>
              <div className="journey-step__state">Trạng thái: PENDING_REVIEW</div>
              <p className="journey-step__desc">
                Chọn tuyến đường trên bản đồ số, chọn ngựa từ hồ sơ Digital Passport và dịch vụ đi kèm.
              </p>
              <div className="journey-step__timeline-tag">Trước ngày đi ≥ 15–20 ngày</div>
            </div>

            <div className="journey-step">
              <div className="journey-step__badge">02</div>
              <h4 className="journey-step__title">Thẩm định hồ sơ</h4>
              <div className="journey-step__state">Trạng thái: APPRAISING</div>
              <p className="journey-step__desc">
                Kiểm dịch viên soát hộ chiếu thú y, điều phối viên phân công xe chuyên dụng, tài xế và hộ tống viên.
              </p>
              <div className="journey-step__timeline-tag">Xử lý trong 12 giờ</div>
            </div>

            <div className="journey-step">
              <div className="journey-step__badge">03</div>
              <h4 className="journey-step__title">Báo giá & Cọc 30%</h4>
              <div className="journey-step__state">Trạng thái: AWAITING_DEPOSIT</div>
              <p className="journey-step__desc">
                Nhận bảng kê chi tiết minh bạch, thanh toán đặt cọc 30% qua VNPay để xác nhận khóa xe chuyên dụng.
              </p>
              <div className="journey-step__timeline-tag">Hiệu lực trong 24 giờ</div>
            </div>

            <div className="journey-step">
              <div className="journey-step__badge">04</div>
              <h4 className="journey-step__title">Làm thủ tục giấy tờ</h4>
              <div className="journey-step__state">Trạng thái: PAPERWORK</div>
              <p className="journey-step__desc">
                Đội ngũ làm việc trực tiếp với cơ quan thú y và hải quan để hoàn tất chứng thư kiểm dịch.
              </p>
              <div className="journey-step__timeline-tag">Trước ngày bốc ngựa</div>
            </div>

            <div className="journey-step">
              <div className="journey-step__badge">05</div>
              <h4 className="journey-step__title">Vận chuyển an toàn</h4>
              <div className="journey-step__state">Trạng thái: IN_TRANSIT</div>
              <p className="journey-step__desc">
                Thanh toán 70% còn lại trước giờ bốc ngựa. Theo dõi xe trực tiếp qua bản đồ GPS và nhật ký chăm sóc y tế.
              </p>
              <div className="journey-step__timeline-tag">Theo thời gian thực 24/7</div>
            </div>

            <div className="journey-step">
              <div className="journey-step__badge">06</div>
              <h4 className="journey-step__title">Bàn giao & Quyết toán</h4>
              <div className="journey-step__state">Trạng thái: COMPLETED</div>
              <p className="journey-step__desc">
                Kiểm tra thể trạng chiến mã, ký biên bản điện tử POD. Đối soát minh bạch các khoản phát sinh nếu có.
              </p>
              <div className="journey-step__timeline-tag">Hoàn tất đơn hàng</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section className="landing-section landing-section--subtle">
        <div className="landing-container">
          <div className="section-head">
            <span className="section-badge">Hỏi Đáp Thường Gặp</span>
            <h2 className="section-title">Những Câu Hỏi Dành Cho Chủ Ngựa Đua</h2>
            <p className="section-subtitle">
              Mọi thắc mắc về điều kiện vận chuyển, kiểm dịch và chính sách bảo hiểm.
            </p>
          </div>

          <div className="faq-grid">
            <div className="faq-card">
              <h4 className="faq-question">Tại sao cần gửi đơn đặt chuyến trước ngày đi tối thiểu 15–20 ngày?</h4>
              <p className="faq-answer">
                Vận chuyển động vật sống giá trị cao đòi hỏi thời gian đối soát xét nghiệm dịch tễ, 
                kiểm tra mã microchip và xin cấp phép chứng nhận kiểm dịch vận chuyển hợp lệ.
              </p>
            </div>

            <div className="faq-card">
              <h4 className="faq-question">Người nhận ở đầu bên kia tra cứu xe bằng cách nào?</h4>
              <p className="faq-answer">
                Người nhận chỉ cần truy cập trang chủ CBRT, nhập mã vận đơn (VD: BK-1) và 4 số cuối số điện thoại 
                là có thể theo dõi vị trí xe thời gian thực mà không cần tạo tài khoản hệ thống.
              </p>
            </div>

            <div className="faq-card">
              <h4 className="faq-question">Nếu xe gặp sự cố hoặc thời tiết xấu trên đường thì xử lý ra sao?</h4>
              <p className="faq-answer">
                Hệ thống kích hoạt quy trình SOS khẩn cấp: điều xe chuyên dụng cứu hộ từ trạm liên vận gần nhất trong bán kính hỗ trợ, 
                đồng thời bác sĩ thú y túc trực đảm bảo ổn định thân nhiệt cho đàn ngựa.
              </p>
            </div>

            <div className="faq-card">
              <h4 className="faq-question">Quy định đặt cọc 30% và thanh toán 70% còn lại?</h4>
              <p className="faq-answer">
                Sau khi quản lý phê duyệt báo giá, khách hàng có 24 giờ để đặt cọc 30% qua cổng thanh toán VNPay để khóa xe. 
                70% chi phí còn lại được thanh toán vào ngày khởi hành khi xe đến điểm bốc ngựa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION BANNER */}
      <section className="landing-cta-banner">
        <div className="cta-banner-box">
          <h2 className="cta-banner-title">Sẵn Sàng Vận Chuyển Chiến Mã Của Bạn?</h2>
          <p className="cta-banner-desc">
            Hãy liên hệ với đội ngũ chuyên viên điều phối logistics để nhận tư vấn lộ trình di chuyển tối ưu 
            và bảng giá trọn gói minh bạch nhất cho trang trại và câu lạc bộ của bạn.
          </p>
          <div className="cta-banner-actions">
            <button
              type="button"
              className="btn-landing-primary"
              style={{ padding: '13px 30px', fontSize: 15 }}
              onClick={handleBookingRedirect}
            >
              <Truck size={18} /> Đặt chuyến vận chuyển ngay
            </button>
            <a
              href="tel:19006879"
              className="btn-landing-outline"
              style={{ padding: '13px 26px', fontSize: 15 }}
            >
              <PhoneCall size={18} /> Gọi Hotline: 1900 6879
            </a>
          </div>
        </div>
      </section>

      {/* 9. GLOBAL FOOTER (CLEAN LIGHT SLATE) */}
      <footer className="landing-footer">
        <div className="landing-footer__grid">
          <div className="landing-footer__col">
            <div className="landing-brand" style={{ marginBottom: 16 }}>
              <div className="landing-brand__emblem">🏇</div>
              <div className="landing-brand__titles">
                <span className="landing-brand__name">CBRT EXPRESS</span>
                <span className="landing-brand__sub">Hệ Thống Vận Tải Ngựa Đua Chuyên Nghiệp</span>
              </div>
            </div>
            <p style={{ lineHeight: 1.6, color: '#475569', maxWidth: 360 }}>
              Dịch vụ vận tải đường bộ chuyên dụng kết nối các trang trại đua và câu lạc bộ cưỡi ngựa hàng đầu. 
              Áp dụng tiêu chuẩn FEI, cam kết phúc lợi động vật sống số 1 trong ngành.
            </p>
            <div style={{ marginTop: 16, color: '#334155', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>🏢 Trụ sở điều hành: Tòa nhà Logistics CBRT, Trung tâm Vận tải Quốc tế</div>
              <div>📍 Trung tâm điều phối miền Nam & miền Bắc</div>
              <div>📞 Tổng đài hỗ trợ: 1900 6879 | Email: dispatch@cbrt-transport.com</div>
            </div>
          </div>

          <div className="landing-footer__col">
            <h4>Tra cứu & Báo giá</h4>
            <ul className="landing-footer__links">
              <li>
                <a href="#command-hub" onClick={() => setActiveTab('track')}>Tra cứu đơn hàng trực tuyến</a>
              </li>
              <li>
                <a href="#command-hub" onClick={() => setActiveTab('calc')}>Tính cước nhanh theo chặng</a>
              </li>
              <li>
                <a href="#command-hub" onClick={() => setActiveTab('matrix')}>Biểu phí niêm yết chuẩn</a>
              </li>
              <li><a href="#corridors">Mạng lưới tuyến đường vận chuyển</a></li>
            </ul>
          </div>

          <div className="landing-footer__col">
            <h4>Dịch vụ & Tiêu chuẩn</h4>
            <ul className="landing-footer__links">
              <li><a href="#services">Xe chuyên dụng 2–9 khoang</a></li>
              <li><a href="#services">Dịch vụ thú y & hộ tống</a></li>
              <li><a href="#services">Hồ sơ kiểm dịch FEI Passport</a></li>
              <li><a href="#services">Bảo hiểm động vật sống</a></li>
              <li><a href="#journey">Quy trình vận chuyển 6 bước</a></li>
            </ul>
          </div>

          <div className="landing-footer__col">
            <h4>Trực ban hỗ trợ 24/7</h4>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, color: '#334155' }}>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>Tổng đài điều phối trực tuyến:</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', margin: '4px 0 10px' }}>1900 6879</div>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>Hỗ trợ kỹ thuật & Giấy tờ:</div>
              <div style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 600 }}>dispatch@cbrt-transport.com</div>
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-landing-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '9px' }}
                  onClick={() => navigate('/login')}
                >
                  Cổng đăng nhập hệ thống
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-footer__bottom">
          <div>
            © 2026 Cross-Border Racehorse Transport Management System (CBRT - WDP301). Bảo lưu mọi quyền.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <span>Tiêu chuẩn FEI Equine Welfare</span>
            <span>·</span>
            <span>Chính sách bảo hiểm động vật sống</span>
            <span>·</span>
            <span>Điều khoản hợp đồng vận chuyển</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
