import React from 'react';
import {AlertTriangle, DollarSign, Gauge, Inbox, Map, Route, ShieldCheck, Truck, FileCheck} from 'lucide-react';
import {NavLink} from 'react-router-dom';
import {useAuthStore} from '../../store/useAuthStore';
const managerItems=[['/manager','Tổng quan',Gauge],['/manager/intake','Tiếp nhận',Inbox],['/manager/approvals','Duyệt giá',FileCheck],['/incidents/sos','Sự cố',AlertTriangle],['/manager/revenue','Doanh thu',DollarSign],['/manager/trips','Chuyến đi',Route]];
const fleetItems=[['/fleet/trips','Xe và lộ trình',Route],['/fleet/monitor','Giám sát',Map],['/incidents/sos','Sự cố',AlertTriangle],['/fleet/vehicles','Đội xe',Truck]];
const specialistItems=[['/specialist/horses','Duyệt hồ sơ ngựa',ShieldCheck],['/specialist/compliance','Giấy tờ kiểm dịch',FileCheck]];
export default function Sidebar(){
  const role=useAuthStore(state=>state.user?.role);
  const items=role==='LOGISTICS_MANAGER'?managerItems:['FLEET_COORDINATOR','ROUTE_COORDINATOR'].includes(role)?fleetItems:specialistItems;
  return <aside className="app-sidebar"><div className="app-sidebar__brand">MENU</div><nav aria-label="Điều hướng chính">{items.map(([to,label,Icon])=><NavLink end={to==='/manager'} key={to} to={to} className={({isActive})=>`app-sidebar__link ${isActive?'is-active':''}`}><Icon size={16}/><span>{label}</span></NavLink>)}</nav></aside>;
}
