import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Pause, Play, ShieldCheck, Truck } from 'lucide-react';
import BrandLogo from './BrandLogo';
import './auth-modern.css';
export default function AuthStory({ bright = false }) {
  const [paused,setPaused] = useState(false);
  return <section className={'heritage-auth-story equine-auth-visual' + (bright ? ' equine-auth-visual--bright' : '') + (paused ? ' is-paused' : '')} aria-label="Hành trình vận chuyển ngựa CBRT">
    <img className="equine-auth-photo" src={bright ? '/images/equine-login-bright.png' : '/images/equine-editorial.png'} alt={bright ? 'Ngựa nâu với vệt trắng trên trán trong đồng cỏ ngập nắng ban mai' : 'Ngựa đua nâu tại chuồng, được chăm sóc trước hành trình vận chuyển'} />
    <div className="equine-auth-shade" />
    <div className="equine-auth-top"><Link to="/" aria-label="CBRT — Trang chủ"><BrandLogo /></Link><Link className="equine-auth-home" to="/" aria-label="Về trang chủ"><ArrowUpRight size={20}/></Link></div>
    <div className="equine-auth-seal"><ShieldCheck size={15}/><span>Chăm sóc trên từng chặng</span></div>
    <div className="equine-auth-bottom"><span className="equine-auth-kicker">EQUINE TRANSPORT · CBRT</span><h1>Mỗi hành trình. <br/>Một sự an tâm.</h1><p>Từ hồ sơ sức khỏe đến chuyến đi,<br/>luôn đồng hành cùng chiến mã của bạn.</p>
      <div className="equine-auth-route" aria-hidden="true"><span className="equine-auth-dot"/><div className="equine-auth-track"><div className="equine-auth-truck"><Truck size={19}/></div></div><span className="equine-auth-dot destination"/></div>
      <div className="equine-auth-route-labels"><span>Chuẩn bị chu đáo</span><span>Đến nơi an toàn</span></div>
    </div>
    <button className="equine-auth-motion" type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused?'Bật chuyển động hình ảnh':'Tạm dừng chuyển động hình ảnh'} aria-pressed={paused}>{paused?<Play size={13}/>:<Pause size={13}/>}</button>
  </section>;
}
