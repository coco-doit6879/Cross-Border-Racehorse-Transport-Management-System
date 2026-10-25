import React,{useEffect,useState} from 'react';
import {Alert,Button,Card,Empty,Select,Timeline} from 'antd';
import {routeApi} from '../../services/routeApi';
import CustomerTripMap from '../Dashboard/CustomerTripMap';
export default function RouteMap(){
 const [routes,setRoutes]=useState([]),[selected,setSelected]=useState(),[error,setError]=useState('');
 const load=async()=>{try{const r=await routeApi.getRoutes();setRoutes(r.data.data);setError('');}catch(e){setError(e.response?.data?.message||'Không thể tải hành trình.');}};
 useEffect(()=>{load();const timer=setInterval(load,30000);return()=>clearInterval(timer);},[]);
 const route=routes.find(r=>r._id===selected)||routes[0];
 return <Card title="Hành trình & điểm check-in" extra={<Button onClick={load}>Làm mới</Button>}>
 <p>Bản đồ tuyến dự kiến và các điểm dừng cố định. Tiến độ dựa trên xác nhận check-in của tài xế.</p>{error&&<Alert type="error" message={error}/>}
 <Select aria-label="Chọn chuyến vận chuyển" style={{width:'100%',marginBottom:20}} value={route?._id} onChange={setSelected} options={routes.map(r=>({value:r._id,label:r.orderId?.bookingCode||r._id}))}/>
 {route?<><CustomerTripMap order={route.orderId} route={route}/><Timeline style={{marginTop:24}} items={[...(route.waypoints||[])].sort((a,b)=>a.sequence-b.sequence).map(w=>({color:w.status==='ARRIVED'?'green':'gray',children:<><strong>{w.name}</strong><p>{w.actualArrival?'Đã check-in: '+new Date(w.actualArrival).toLocaleString('vi-VN'):'Chưa check-in'}</p></>}))}/></>:<Empty description="Chưa có chuyến vận chuyển"/>}</Card>;
}
