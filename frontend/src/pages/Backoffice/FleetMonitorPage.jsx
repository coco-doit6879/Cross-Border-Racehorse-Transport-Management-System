import React,{useEffect} from 'react';
import {Alert,Empty} from 'antd';
import {useNavigate} from 'react-router-dom';
import usePlanning from './usePlanning';
import {datetime,idOf,routeLabel} from './planningUtils';
import RouteMap from '../Routes/RouteMap';
export default function FleetMonitorPage(){
 const {data,error,load}=usePlanning(),navigate=useNavigate();
 useEffect(()=>{const timer=setInterval(load,30000);return()=>clearInterval(timer);},[load]);
 return <section className="bo-page"><h1>Giám sát</h1><p>Theo dõi chuyến đang chạy, vị trí GPS và các điểm cần điều phối can thiệp.</p>{error&&<Alert type="error" message={error}/>}<div className="bo-monitor-grid">{data.routes.map(route=>{const order=data.orders.find(o=>idOf(o)===idOf(route.orderId));const updated=route.currentLocation?.updatedAt;const stale=!updated||Date.now()-new Date(updated).getTime()>120000;return <section className="bo-card" key={idOf(route)}><div className="bo-card-heading"><h2>{order?.bookingCode||'Chuyến vận chuyển'}</h2><span className={`bo-pill ${route.status==='INCIDENT_HANDLING'?'bo-pill-red':stale?'bo-pill-orange':'bo-pill-green'}`}>{route.status==='INCIDENT_HANDLING'?'Có sự cố':stale?'Chậm GPS':'GPS cập nhật'}</span></div><p style={{fontSize:12}}>{order?routeLabel(order):'Chưa có thông tin tuyến'}</p><p className="bo-muted">Xe: {route.vehiclePlateNumber||'—'}<br/>Cập nhật: {datetime(updated)}<br/>Tốc độ: {route.currentLocation?.speedKmh??'—'} km/h</p><button className="bo-button" onClick={()=>navigate('/incidents/sos')}>Xem sự cố & cảnh báo</button></section>;})}</div>{data.routes.length===0&&<div className="bo-card"><Empty description="Chưa có chuyến đang vận chuyển để giám sát."/></div>}<RouteMap/></section>;
}
