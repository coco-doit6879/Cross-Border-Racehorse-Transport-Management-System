import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
export default function AuthStory() {
  return <section className="heritage-auth-story">
    <Link to="/" aria-label="CBRT — Trang chủ"><BrandLogo /></Link>
    <div className="heritage-auth-copy"><span className="h-kicker">Chuyên biệt cho từng hành trình</span><h1>Sự chăm sóc<br />đi cùng mỗi<br /><em>chặng đường.</em></h1><p>Hồ sơ ngựa, kế hoạch vận chuyển và tiến độ chuyến đi trong một không gian.</p></div>
    <p className="heritage-auth-caption">Cross-border racehorse transport</p>
  </section>;
}
