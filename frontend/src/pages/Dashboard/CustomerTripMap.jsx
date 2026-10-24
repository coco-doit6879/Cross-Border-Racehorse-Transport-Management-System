import React,{useEffect,useMemo} from 'react';
import {MapContainer,TileLayer,Polyline,CircleMarker,Popup,useMap} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
function Bounds({points}){const map=useMap();useEffect(()=>{map.invalidateSize();if(points.length>1)map.fitBounds(L.latLngBounds(points.map(p=>[p[1],p[0]])),{padding:[35,35],maxZoom:12});},[map,points]);return null;}
export default function CustomerTripMap({route,order}){
 const stops=useMemo(()=>route?.waypoints?.length?route.waypoints:[{name:order.origin.address,type:'PICKUP',location:{coordinates:order.origin.coordinates}},...(order.preparation?.plan?.restStops||[]).map(s=>({...s,type:'REST_STOP',location:{coordinates:s.coordinates}})),{name:order.destination.address,type:'DELIVERY',location:{coordinates:order.destination.coordinates}}],[route?.waypoints,order]);
 const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
 const points=useMemo(()=>stops.map(w=>w.location?.coordinates).filter(valid),[stops]);
 const path=route?.plannedPath||order.preparation?.plan?.road?.path;
 const current=route?.currentLocation?.coordinates;
 if(points.length<2)return <p>Đơn chưa có tọa độ hợp lệ để hiển thị bản đồ.</p>;
 return <div className="customer-trip-map"><MapContainer center={[points[0][1],points[0][0]]} zoom={8} scrollWheelZoom={false}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Bounds points={points}/>{path?.length>1&&<Polyline positions={path.map(p=>[p[1],p[0]])} pathOptions={{color:'#f06414',weight:4}}/>}{stops.filter(w=>valid(w.location?.coordinates)).map((w,i)=><CircleMarker key={w._id||i} center={[w.location.coordinates[1],w.location.coordinates[0]]} radius={w.type==='REST_STOP'?7:10} pathOptions={{color:w.status==='ARRIVED'?'#059669':w.type==='DELIVERY'?'#d44854':'#4b69c1',fillColor:'white',fillOpacity:1,weight:3}}><Popup>{w.name}<br/>{w.status==='ARRIVED'?`Đã đến: ${new Date(w.actualArrival).toLocaleString('vi-VN')}`:'Chưa đến'}</Popup></CircleMarker>)}{valid(current)&&<CircleMarker center={[current[1],current[0]]} radius={7} pathOptions={{color:'#172033',fillColor:'#f06414',fillOpacity:1}}><Popup>Vị trí được cập nhật gần nhất từ tài xế</Popup></CircleMarker>}</MapContainer></div>;
}
