import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, ClipboardCheck, CreditCard, FileCheck2, Flag, FolderOpen, Globe2, MapPinned, Menu, Phone, Search, Send, Truck, UserRound, X } from 'lucide-react';
import './guest-landing.css';

const asset = (name) => `/images/landing/${name}.png`;
const slides = [
  { badge: 'Xe chuyên dụng 2 – 9 ngăn', title: 'Vận chuyển ngựa đua', accent: 'Việt Nam · Lào · Campuchia', description: 'Xe nguyên chuyến chỉ chở ngựa của bạn, mỗi xe có tài xế và nhân viên chăm sóc riêng. Bạn theo dõi xe đang ở đâu trên bản đồ.', action: 'Đặt chuyến ngay', target: 'booking' },
  { badge: 'Kiểm dịch & thủ tục trọn gói', title: 'Hồ sơ thú y được', accent: 'kiểm dịch viên xác minh', description: 'Bạn chỉ nộp hồ sơ ngựa. Giấy kiểm dịch, hải quan và giấy chuyển đi do chúng tôi làm, bạn xem tiến độ từng giấy trên hệ thống.', action: 'Xem quy trình', target: 'journey' },
  { badge: 'Báo giá cố định', title: 'Biết trước chi phí', accent: 'trước khi đặt chuyến', description: 'Xem bảng giá cước theo hạng xe và quãng đường. Báo giá chính thức đã gồm nhiên liệu, cầu đường, không phụ thu ngoài phiếu.', action: 'Xem bảng giá', target: 'pricing' },
];
const benefits = [
  [Truck, 'Xe chuyên dụng', 'Xe nguyên chuyến với khoang phù hợp số ngựa của bạn.'],
  [FolderOpen, 'Hỗ trợ giấy tờ', 'Đội ngũ phụ trách kiểm dịch và thủ tục cho chuyến đi.'],
  [MapPinned, 'Theo dõi hành trình', 'Cập nhật tiến độ đơn và hành trình vận chuyển trên hệ thống.'],
];
const services = [
  ['domestic', 'NỘI ĐỊA', 'Vận chuyển nội địa', 'Giữa các kho và câu lạc bộ trong nước, có trạm nghỉ cho ngựa.'],
  ['cross-border', 'XUYÊN BIÊN GIỚI', 'Vận chuyển xuyên biên giới', 'Việt Nam – Lào, Việt Nam – Campuchia, nhà xe làm thủ tục cửa khẩu.'],
  ['veterinary', 'KIỂM DỊCH', 'Kiểm dịch & thủ tục', 'Giấy kiểm dịch, tờ khai hải quan do nhà xe làm trọn gói.'],
  ['care', 'CHĂM SÓC', 'Chăm sóc & bảo hiểm', 'Hệ thống đi kèm, khoang đơn mở rộng, bảo hiểm động vật sống theo giống.'],
];
const steps = [
  [Send, 'Gửi đơn', 'Chọn điểm đón, điểm giao trên bản đồ, chọn ngựa từ Hồ sơ ngựa, dịch vụ và bảo hiểm.', 'Trước ngày đi ≥ 20 ngày'],
  [Search, 'Thẩm định', 'Quản lý tiếp nhận. Kiểm dịch viên duyệt hồ sơ ngựa. Điều phối viên chọn xe, tài xế, hộ tống và lập lộ trình.', 'Song song, trước khi báo giá'],
  [CreditCard, 'Báo giá & đặt cọc', 'Báo giá cố định có hiệu lực 24 giờ. Đặt cọc 30% để nhận Vận đơn.', 'Trong 24 giờ'],
  [FolderOpen, 'Làm giấy tờ', 'Nhà xe làm giấy kiểm dịch (và hải quan nếu đi quốc tế), bạn chỉ cần xem tiến độ từng giấy đã nộp.', 'Trước ngày đi'],
  [Truck, 'Vận chuyển', 'Ngày bốc ngựa bạn trả 70% còn lại. Tài xế check-in từng mốc, hộ tống ghi nhật ký sức khỏe, bạn xem xe trên bản đồ.', 'Theo lộ trình'],
  [ClipboardCheck, 'Bàn giao & quyết toán', 'Ký biên bản giao nhận. Chi phí có sự cố liên quan đến ngựa mới có khoản phát sinh có chứng từ, sau đó bạn đánh giá chuyến đi.', 'Trong 24 giờ sau khi có quyết toán'],
];
const fares = [
  [50, 4515000, 6321000, 8579000], [150, 7245000, 10143000, 13766000],
  [300, 11340000, 15876000, 21546000], [600, 17640000, 24696000, 33516000],
  [1000, 23940000, 33516000, 45486000], [1500, 31815000, 44541000, 60449000],
];
const insurance = [ ['Thoroughbred', 20000000], ['Arabian', 16000000], ['American Quarter Horse', 12000000], ['Friesian', 17000000], ['Andalusian', 16000000], ['Lusitano', 16000000], ['Appaloosa', 10000000], ['American Paint Horse', 11000000], ['Morgan', 11000000], ['Tennessee Walking Horse', 11000000], ['Standardbred', 14000000], ['Hanoverian', 18000000], ['Akhal-Teke', 19000000], ['Mustang', 10000000], ['Clydesdale', 12000000], ['Shire', 12000000], ['Belgian Draft', 10000000], ['Percheron', 11000000], ['Haflinger', 9000000], ['Shetland Pony', 7000000], ['Khác', 8000000] ];
const money = (value) => `${value.toLocaleString('vi-VN')} đ`;
const fixedFees = [
  ['Nhân sự (01 tài xế + 01 hộ tống), mỗi xe', '1.890.000 đ/ngày'],
  ['Nhiên liệu và phí cầu đường, mỗi xe', '992.000 đ/100 km'],
  ['Khoang đơn mở rộng', '1.500.000 đ/ngựa'], ['Thức ăn · Gói nâng cao', '300.000 đ/ngựa'],
  ['Thức ăn · Gói thể thao', '500.000 đ/ngựa'], ['Cữ nước · Mỗi 2 giờ', '50.000 đ/ngựa'],
  ['Cữ nước · Mỗi giờ', '100.000 đ/ngựa'], ['Thủ tục kiểm dịch (nội địa)', 'Đã gồm trong cước'],
  ['Thủ tục kiểm dịch và hải quan (quốc tế)', '300.000 đ/chuyến'],
  ...insurance.map(([breed, price]) => [`Bảo hiểm Động vật Sống · ${breed}`, `${money(price)}/ngựa`]),
];
function Brand() {
  return <a className="guest-brand" href="#home"><img src={asset('logo')} alt="" /><strong>Vận chuyển Ngựa</strong></a>;
}
function PriceTable() {
  return <div className="guest-price-content" id="guest-pricing">
    <div className="guest-price-columns">
      <div className="guest-price-card"><h3><Truck size={18} /> Cước vận chuyển, mỗi xe</h3><div className="guest-table-scroll"><table><thead><tr><th>QUÃNG ĐƯỜNG</th><th>LIGHT (2 NGĂN)</th><th>MEDIUM (4 ĐẾN 6 NGĂN)</th><th>HEAVY (9 NGĂN)</th></tr></thead><tbody>{fares.map(([km, ...prices]) => <tr key={km}><th>{km} km</th>{prices.map((price, i) => <td key={i}>{money(price)}</td>)}</tr>)}</tbody></table></div></div>
      <div className="guest-price-card"><h3><Globe2 size={18} /> Các khoản cố định khác</h3><table><thead><tr><th>HẠNG MỤC</th><th>ĐƠN GIÁ</th></tr></thead><tbody>{fixedFees.map(([label, price]) => <tr key={label}><td>{label}</td><td>{price}</td></tr>)}</tbody></table></div>
    </div>
    <div className="guest-price-notes">{[
      'Đặt cọc 30% để nhận vận đơn, 70% còn lại trả vào ngày bốc ngựa.',
      'Đặt trước tối thiểu 20 ngày so với ngày khởi hành.',
      'Giá cố định, chưa gồm VAT, đã gồm nhiên liệu và cầu đường. Báo giá chính thức có hiệu lực 24 giờ, không phụ thu ngoài phiếu.',
      'Chi phí phát sinh khi có sự cố liên quan đến ngựa (thuốc, viện phí, chuồng đêm) có chứng từ và có bảng quyết toán. Xe hỏng, tắc đường do nhà xe chịu.',
      'Phí lưu xe chờ 400.000 đ/giờ chỉ tính khi xe phải chờ do lỗi phía khách hoặc người nhận.',
    ].map((note) => <p key={note}><FileCheck2 size={13} />{note}</p>)}</div>
  </div>;
}

export default function GuestLandingPage() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState('tracking');
  const [country, setCountry] = useState('VN');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [phone, setPhone] = useState('');
  const [trackingNotice, setTrackingNotice] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);
  const booking = () => navigate('/login', { state: { from: '/orders/create' } });
  const showTab = (next) => {
    setTab(next);
    setMenuOpen(false);
    document.getElementById('guest-lookup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const performAction = (target) => {
    if (target === 'booking') booking();
    else if (target === 'pricing') showTab('pricing');
    else document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth' });
  };
  const submitTracking = (event) => {
    event.preventDefault();
    setTrackingNotice('Tra cứu công khai chưa được kết nối. Vui lòng đăng nhập để xem đơn hàng của bạn hoặc liên hệ nhà xe kèm mã đơn.');
  };
  const current = slides[slide];
  return <div className="guest-home" id="home">
    <div className="guest-topbar"><div className="guest-container">Vận chuyển ngựa đua đường bộ · Việt Nam · Lào · Campuchia</div></div>
    <header className="guest-header"><div className="guest-container guest-header-inner">
      <Brand />
      <button className="guest-menu-toggle" type="button" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'guest-nav is-open' : 'guest-nav'} aria-label="Điều hướng chính" onClick={(event) => { if (event.target.closest('a')) setMenuOpen(false); }}>
        <a className="is-active" href="#home">Trang chủ</a>
        <div className="guest-nav-dropdown"><button type="button">Tra cứu <ChevronDown size={13} /></button><div className="guest-nav-submenu"><button type="button" onClick={() => showTab('tracking')}>Tra cứu đơn hàng</button><button type="button" onClick={() => showTab('pricing')}>Bảng giá</button></div></div>
        <a href="#network">Mạng lưới</a><a href="#services">Dịch vụ</a><a href="#journey">Quy trình</a>
        <button className="guest-button guest-button-outline" onClick={booking}>Đặt chuyến</button>
        <Link className="guest-button" to="/login">Đăng nhập / Đăng ký</Link>
      </nav>
    </div></header>
    <main>
      <section className="guest-hero" aria-roledescription="carousel" aria-label="Dịch vụ vận chuyển ngựa" style={{ backgroundImage: `linear-gradient(90deg, rgba(15,23,42,.94) 0%, rgba(15,23,42,.65) 42%, rgba(15,23,42,.12) 100%), url('${asset(`hero-${slide + 1}`)}')` }}>
        <div className="guest-container guest-hero-inner"><div className="guest-hero-copy"><span className="guest-hero-badge">{current.badge}</span><h1>{current.title}<span>{current.accent}</span></h1><p>{current.description}</p><button className="guest-button" onClick={() => performAction(current.target)}>{current.action}</button></div></div>
        <div className="guest-slide-dots">{slides.map((item, i) => <button type="button" key={item.title} aria-label={`Banner ${i + 1}: ${item.title}`} aria-current={i === slide ? 'true' : undefined} className={i === slide ? 'is-active' : ''} onClick={() => setSlide(i)} />)}</div>
      </section>
      <div className="guest-container guest-lookup-area" id="guest-lookup">
        <div className="guest-tabs" role="tablist" aria-label="Tra cứu và bảng giá"><button id="tracking-tab" role="tab" aria-selected={tab === 'tracking'} aria-controls="tracking-panel" className={tab === 'tracking' ? 'is-active' : ''} onClick={() => setTab('tracking')}>Tra cứu đơn hàng</button><button id="pricing-tab" role="tab" aria-selected={tab === 'pricing'} aria-controls="pricing-panel" className={tab === 'pricing' ? 'is-active' : ''} onClick={() => setTab('pricing')}>Bảng giá</button></div>
        <div className="guest-lookup-card" role="tabpanel" id={`${tab}-panel`} aria-labelledby={`${tab}-tab`}>
          {tab === 'pricing' ? <PriceTable /> : <><form className="guest-tracking-form" onSubmit={submitTracking}><label className="guest-input"><Search size={18} /><input aria-label="Mã đơn cần tra cứu" placeholder="Nhập mã đơn cần tra cứu (ví dụ: BK-1 hoặc VD-…, cách nhau bởi dấu phẩy)" value={trackingCode} onChange={(e) => { setTrackingCode(e.target.value); setTrackingNotice(''); }} required /></label><label className="guest-input guest-phone"><Phone size={17} /><input aria-label="4 số cuối SĐT người đặt" placeholder="4 số cuối SĐT người đặt" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} required /></label><button className="guest-button" type="submit">Tìm kiếm</button></form>{trackingNotice && <div className="guest-tracking-notice" role="status">{trackingNotice} <Link to="/login">Đăng nhập <ArrowRight size={13} /></Link></div>}</>}
        </div>
        <div className="guest-benefits">{benefits.map(([Icon, title, description]) => <div className="guest-benefit" key={title}><span className="guest-icon-small"><Icon size={21} /></span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div>
      </div>
      <section className="guest-network guest-container" id="network">
        <div className="guest-section-heading"><h2>MẠNG LƯỚI PHỦ SÓNG 3 NƯỚC</h2><p>Tuyến nội địa Việt Nam và tuyến xuyên biên giới Việt Nam – Lào, Việt Nam – Campuchia qua<br className="guest-desktop-break" /> các cửa khẩu đường bộ quốc tế. Bạn chọn điểm đón và điểm giao trên bản đồ, nhà xe chọn cửa<br className="guest-desktop-break" /> khẩu và các trạm nghỉ dọc đường.</p></div>
        <div className="guest-countries">{[['VN', 'Việt Nam', 'Nội địa & xuất phát'], ['LA', 'Lào', 'Tuyến xuyên biên giới'], ['KH', 'Campuchia', 'Tuyến xuyên biên giới']].map(([code, name, caption]) => <button key={code} type="button" className={`guest-country ${country === code ? 'is-active' : ''}`} aria-pressed={country === code} onClick={() => setCountry(code)}><span className={`guest-flag guest-flag-${code.toLowerCase()}`} aria-hidden="true"><img src={asset(`flag-${code.toLowerCase()}`)} alt="" /></span><strong>{name}</strong><small>{caption}</small></button>)}</div>
        <p className="guest-route-caption" aria-live="polite">{country === 'VN' ? 'Tuyến vận chuyển nội địa, kết nối các điểm phục vụ trên toàn quốc.' : `Tuyến vận chuyển xuyên biên giới Việt Nam – ${country === 'LA' ? 'Lào' : 'Campuchia'}, qua cửa khẩu đường bộ quốc tế.`}</p>
        <div className="guest-route"><svg viewBox="0 0 900 200" aria-hidden="true"><path d="M40 60 C190 -45 270 95 450 130 S650 180 860 50" /><circle cx="40" cy="60" r="10" /><circle className="guest-route-rest" cx="450" cy="130" r="11" /></svg><div className="guest-route-label guest-route-start"><strong>Điểm nhận</strong><small>Đón ngựa</small></div><div className="guest-route-label guest-route-middle"><strong>{country === 'VN' ? 'Trạm nghỉ' : 'Cửa khẩu · Trạm nghỉ'}</strong><small>Chăm sóc trên đường</small></div><div className="guest-route-label guest-route-end"><Truck size={31} /><strong>Điểm giao</strong><small>Bàn giao ngựa</small></div></div>
        <div className="guest-route-legend"><span>■ Cửa khẩu</span><span>⊙ Trạm nghỉ</span></div>
        <div className="guest-network-scope"><h3>Phạm vi mạng lưới</h3><div><p><small>ĐIỂM PHỤC VỤ</small><span><MapPinned size={16} />10+ điểm nhận, giao và đối tác trong mạng lưới.</span></p><p><small>TUYẾN QUỐC TẾ</small><span><Flag size={16} />10+ cửa khẩu kết nối các tuyến trong khu vực.</span></p></div></div>
      </section>
      <section className="guest-about"><div className="guest-about-copy"><div><h2>VỀ CHÚNG TÔI</h2><p>Chúng tôi chuyên vận chuyển ngựa đua bằng đường bộ. Mỗi đơn có kiểm dịch viên xác minh hồ sơ thú y, điều phối viên chọn xe, tài xế, hộ tống và lập lộ trình riêng, quản lý duyệt báo giá trước khi bạn đặt cọc. Có sự cố, quản lý duyệt phương án xử lý và trực tiếp liên hệ bạn.</p><a href="#journey">Xem quy trình <ArrowRight size={17} /></a></div></div><div className="guest-about-facts">{[[Globe2, '3 QUỐC GIA', 'Việt Nam, Lào, Campuchia'], [Truck, 'XE NGUYÊN CHUYẾN', 'Light, Medium, Heavy: từ 2 đến 9 ngăn. Không ghép ngựa của đơn khác'], [UserRound, 'KIỂM DỊCH VIÊN RIÊNG', 'Duyệt hồ sơ ngựa, làm giấy kiểm dịch, hải quan và báo tiến độ từng giấy cho bạn'], [Flag, '10+ CỬA KHẨU', 'Các tuyến kết nối Việt Nam với Lào và Campuchia']].map(([Icon, title, description]) => <div key={title}><span className="guest-icon-large"><Icon size={32} /></span><h3>{title}</h3><p>{description}</p></div>)}</div></section>
      <section className="guest-services guest-container" id="services"><h2>DỊCH VỤ</h2><div className="guest-services-grid">{services.map(([photo, label, title, description]) => <article key={photo}><a href="#journey" className="guest-service-photo"><img src={asset(photo)} alt={title} loading="lazy" /><span>{label}</span></a><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section className="guest-journey" id="journey"><div className="guest-container"><div className="guest-section-heading"><h2>QUY TRÌNH VẬN CHUYỂN</h2><p>Từ lúc gửi đơn đến khi bạn nghiệm thu ngựa tại điểm đến.</p></div><div className="guest-steps">{steps.map(([Icon, title, description, time], index) => <article key={title}><span className="guest-icon-small"><Icon size={21} /></span><h3>{index + 1}. {title}</h3><p>{description}</p><strong>{time}</strong></article>)}</div></div></section>
      <section className="guest-cta"><p>Đặt trước tối thiểu 20 ngày. Báo giá cố định, hiệu lực 24 giờ. Đặt cọc 30% để nhận Vận đơn.</p><button type="button" onClick={booking}>Đặt chuyến ngay</button></section>
    </main>
    <footer className="guest-footer"><div className="guest-container"><div className="guest-footer-grid"><div><Brand /><p>Vận chuyển ngựa đua đường bộ trong Việt Nam và giữa Việt Nam với Lào, Campuchia.</p></div><div><h3>Tra cứu</h3><button onClick={() => showTab('tracking')}>Tra cứu đơn hàng</button><button onClick={() => showTab('pricing')}>Bảng giá</button><a href="#network">Mạng lưới</a></div><div><h3>Khách hàng</h3><Link to="/login">Đăng nhập</Link><Link to="/register">Đăng ký</Link><button onClick={booking}>Đặt chuyến</button></div></div><div className="guest-footer-bottom">Hệ thống vận chuyển ngựa đua chuyên nghiệp</div></div></footer>
  </div>;
}



