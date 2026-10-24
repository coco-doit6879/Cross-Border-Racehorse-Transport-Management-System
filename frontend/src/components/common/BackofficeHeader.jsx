import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {Bell,ChevronRight,LogOut,Search} from 'lucide-react';
import {useAuthStore} from '../../store/useAuthStore';
export default function BackofficeHeader(){
 const user=useAuthStore(s=>s.user),logout=useAuthStore(s=>s.logout),navigate=useNavigate(),location=useLocation();
 const [query,setQuery]=useState('');const manager=user?.role==='LOGISTICS_MANAGER';
 const title=location.pathname.includes('intake')?'Tiếp nhận':location.pathname.includes('approvals')?'Duyệt giá':location.pathname.includes('monitor')?'Giám sát':location.pathname.includes('vehicles')?'Đội xe':location.pathname.includes('incidents')?'Sự cố':location.pathname.includes('revenue')?'Doanh thu':location.pathname==='/manager'?'Tổng quan':manager?'Chuyến đi':'Xe và lộ trình';
 return <header className="bo-header"><Link className="bo-brand" to={manager?'/manager':'/fleet/trips'}><img src="/images/landing/logo.png" alt=""/>Vận chuyển Ngựa</Link><div className="bo-identity"><span>{manager?'M':'C'}</span><div><strong>{manager?'MG-01':'CO-01'}</strong><small>{user?.email}</small></div></div><ChevronRight size={15}/><span className="bo-page-label">{title}</span><form onSubmit={e=>{e.preventDefault();navigate(`${manager?'/manager/intake':'/fleet/trips'}?q=${encodeURIComponent(query)}`);}}><Search size={16}/><input aria-label="Tìm đơn hàng, khách hàng" placeholder="Tìm đơn hàng, khách hàng…" value={query} onChange={e=>setQuery(e.target.value)}/></form><button aria-label="Xem sự cố và cảnh báo" onClick={()=>navigate('/incidents/sos')}><Bell size={17}/></button><button aria-label="Đăng xuất" onClick={()=>{logout();navigate('/login');}}><LogOut size={16}/></button></header>;
}
