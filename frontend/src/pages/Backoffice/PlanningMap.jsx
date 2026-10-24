import React,{useEffect,useMemo,useState} from 'react';
import {Modal} from 'antd';
import {CircleMarker,MapContainer,Polyline,Popup,TileLayer,useMap,useMapEvents} from 'react-leaflet';
import L from 'leaflet';
import {Coffee,MapPinned,Plus,Trash2,WandSparkles} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import {planningApi} from '../../services/planningApi';
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
function Fit({points}){const map=useMap();useEffect(()=>{const fit=()=>{if(!map.getContainer().clientWidth)return;map.invalidateSize();if(points.length>1)map.fitBounds(L.latLngBounds(points.map(([lng,lat])=>[lat,lng])),{padding:[45,40],maxZoom:11});};const observer=new ResizeObserver(fit);observer.observe(map.getContainer());fit();return()=>observer.disconnect();},[map,points]);return null;}
function Click({onClick}){useMapEvents({click:event=>onClick?.([event.latlng.lng,event.latlng.lat])});return null;}
function MapView({order,stops,road,onClick,error}){
 const endpoints=[order.origin?.coordinates,order.destination?.coordinates];
 const points=useMemo(()=>[endpoints[0],...stops.map(s=>s.coordinates),endpoints[1]].filter(valid),[JSON.stringify(endpoints),JSON.stringify(stops)]);
 if(points.length<2)return <div className="bo-empty-note">Đơn chưa có tọa độ đón/giao hợp lệ.</div>;
 return <div className="bo-map"><MapContainer center={[points[0][1],points[0][0]]} zoom={8} scrollWheelZoom={false}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Fit points={points}/>{road?.path&&<Polyline positions={road.path.map(([lng,lat])=>[lat,lng])} pathOptions={{color:'#526f56',weight:5}}/>}{points.map(([lng,lat],index)=><CircleMarker key={`${index}-${lng}-${lat}`} center={[lat,lng]} radius={index===0||index===points.length-1?10:7} pathOptions={{color:index===0?'#16a085':index===points.length-1?'#db4b5d':'#4f6ec5',fillColor:'white',fillOpacity:1,weight:3}}><Popup>{index===0?'Điểm đón':index===points.length-1?'Điểm giao':stops[index-1]?.name}</Popup></CircleMarker>)}{onClick&&<Click onClick={onClick}/>}</MapContainer><div className="bo-map-info">{onClick&&<p style={{margin:'0 0 7px'}}>Bấm trên bản đồ để thêm trạm nghỉ đề xuất.</p>}{road?`${road.distanceKm.toFixed(1)} km · ${road.driveHours.toFixed(1)} giờ lái`:error?'Chưa tính được đường bộ':'Đang tính đường bộ…'}<br/><small>{stops.length} trạm nghỉ · {stops.reduce((sum,s)=>sum+s.minutes,0)} phút nghỉ</small></div><div className="bo-map-legend"><span>🟢 Đón</span><span>🔴 Trả</span><span>🔵 Trạm nghỉ</span></div></div>;
}
function suggest(road){
 if(!road?.path?.length)return [];
 const count=Math.max(0,Math.ceil(road.driveHours/3.5)-1);
 if(count>40)return [];
 const distances=[0];for(let i=1;i<road.path.length;i++){const a=road.path[i-1],b=road.path[i];distances.push(distances[i-1]+Math.hypot((b[0]-a[0])*Math.cos(a[1]*Math.PI/180),b[1]-a[1]));}
 return Array.from({length:count},(_,i)=>{const target=distances.at(-1)*(i+1)/(count+1);const index=distances.findIndex(d=>d>=target);return {name:`Điểm nghỉ đề xuất ${i+1}`,coordinates:road.path[index],minutes:45};});
}
export default function PlanningMap({order,stops,onChange,onRoad,editable=true}){
 const [revision,setRevision]=useState(0);
 const [open,setOpen]=useState(false),[draft,setDraft]=useState([]),[road,setRoad]=useState(null),[draftRoad,setDraftRoad]=useState(null),[error,setError]=useState(''),[draftError,setDraftError]=useState('');
 const key=JSON.stringify([order.origin?.coordinates,...(open?draft:stops).map(s=>s.coordinates),order.destination?.coordinates]);
 useEffect(()=>{let active=true;const points=JSON.parse(key);if(points.some(p=>!valid(p)))return;
  if(open){setDraftRoad(null);setDraftError('');}else{setRoad(null);onRoad?.(null);setError('');}
  planningApi.road(points).then(response=>{if(!active)return;if(open)setDraftRoad(response.data.data);else{setRoad(response.data.data);onRoad?.(response.data.data);}}).catch(err=>{if(!active)return;const message=err.response?.data?.message||'Không tính được đường bộ. Thử lại hoặc điều chỉnh điểm nghỉ.';if(open)setDraftError(message);else setError(message);});
  return()=>{active=false;};
 },[key,open,revision]);
 const rows=(items,setItems)=><div className="bo-stops">{!items.length?<div className="bo-empty-note"><Coffee size={17}/> Chưa có trạm dừng nghỉ nào.</div>:items.map((stop,index)=><div className="bo-stop-row" key={index}><input aria-label={`Tên trạm ${index+1}`} maxLength={120} value={stop.name} onChange={e=>setItems(items.map((s,i)=>i===index?{...s,name:e.target.value}:s))}/><input aria-label={`Phút nghỉ trạm ${index+1}`} type="number" min={30} max={120} value={stop.minutes} onChange={e=>setItems(items.map((s,i)=>i===index?{...s,minutes:Number(e.target.value)}:s))}/><span>phút</span><button className="bo-button" title="Xóa trạm" onClick={()=>setItems(items.filter((_,i)=>i!==index))}><Trash2 size={13}/></button></div>)}</div>;
 return <section className="bo-card"><div className="bo-card-heading"><h2><MapPinned size={17}/>Bản đồ lộ trình & Trạm dừng nghỉ</h2>{editable&&<div className="bo-actions"><button className="bo-button bo-button-primary" onClick={()=>{setDraft(stops.map(s=>({...s})));setOpen(true);}}>Chọn trạm trên bản đồ</button><button className="bo-button" disabled={!road} onClick={()=>onChange(suggest(road))}><WandSparkles size={13}/>Gợi ý chuẩn ≤ 4h</button></div>}</div><p className="bo-muted">Xe chạy tối đa 4 giờ cần dừng nghỉ 30–45 phút để kiểm tra sức khỏe và cho ngựa uống nước. Điểm nghỉ đề xuất cần được điều phối kiểm tra thực tế.</p>{error&&<div className="bo-alert" role="alert">{error} <button className="bo-button" onClick={()=>setRevision(n=>n+1)}>Thử tính lại tuyến</button></div>}<MapView order={order} stops={stops} road={road} error={error}/>{editable?rows(stops,onChange):<p className="bo-muted">{stops.map(s=>`${s.name} (${s.minutes} phút)`).join(' · ')||'Không có trạm nghỉ trong phương án.'}</p>}<Modal centered title="Chọn trạm nghỉ" open={open} onCancel={()=>setOpen(false)} width={900} className="bo-stop-modal" okText={`Áp dụng ${draft.length} trạm`} cancelText="Hủy" onOk={()=>{onChange(draft);setOpen(false);}} okButtonProps={{disabled:!draftRoad||Boolean(draftError)||draft.some(s=>!s.name.trim()||s.minutes<30||s.minutes>120)}} destroyOnClose><p className="bo-muted">Bấm trên bản đồ để thêm trạm. Thứ tự trạm là thứ tự xe ghé; chỉnh tên và thời gian nghỉ trước khi áp dụng.</p>{draftError&&<p className="bo-alert">{draftError}</p>}<MapView order={order} stops={draft} road={draftRoad} error={draftError} onClick={coordinates=>setDraft(current=>[...current,{name:`Trạm nghỉ ${current.length+1}`,coordinates,minutes:45}])}/>{rows(draft,setDraft)}{draftRoad?.legs.some(leg=>leg.driveHours>4)&&<p className="bo-alert">Còn chặng lái quá 4 giờ; bổ sung trạm để hoàn thiện phương án.</p>}</Modal></section>;
}
