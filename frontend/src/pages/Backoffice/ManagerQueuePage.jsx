import React,{useEffect,useState} from 'react';
import {Alert,Table} from 'antd';
import {useSearchParams} from 'react-router-dom';
import usePlanning from './usePlanning';
import PlanningFilters,{matches} from './PlanningFilters';
import OrderReviewModal from './OrderReviewModal';
import {date,datetime,idOf,readyForQuote,routeLabel} from './planningUtils';
export default function ManagerQueuePage({mode='intake'}){
 const {data,loading,error,load}=usePlanning(),[params]=useSearchParams(),[query,setQuery]=useState(params.get('q')||''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[tab,setTab]=useState('pending'),[selectedId,setSelectedId]=useState(null);
 useEffect(()=>{setTab('pending');setSelectedId(null);},[mode]);useEffect(()=>{setQuery(params.get('q')||'');},[params]);
 const quote=mode==='quote',orders=data.orders.filter(o=>!['CANCELLED','REJECTED','COMPLETED'].includes(o.status));
 const pending=quote?orders.filter(o=>readyForQuote(o)):orders.filter(o=>o.status==='PENDING_APPROVAL'&&o.depositStatus==='PAID');
 const done=quote?orders.filter(o=>o.preparation?.assignedAt):orders.filter(o=>['APPROVED','DOCS_PROCESSING','CLEARED_FOR_TRANSPORT'].includes(o.status));
 const filtered=(tab==='pending'?pending:done).filter(o=>matches(o,query,from,to));
 const selected=data.orders.find(o=>idOf(o)===selectedId);
 return <section className="bo-page"><h1>{quote?'Phân công tài xế, phụ xe':'Tiếp nhận đơn hàng'}</h1><p>{quote?'Đơn đã thanh toán đủ và được điều phối xác nhận. Chọn tài xế và phụ xe để phát hành vận đơn.':'Kiểm tra đơn đã đặt cọc, duyệt để khách thanh toán phần còn lại.'}</p>{error&&<Alert type="error" message={error} action={<button className="bo-button" onClick={load}>Thử lại</button>}/>}<div className="bo-table-panel"><div className="bo-tabs"><button className={tab==='pending'?'is-active':''} onClick={()=>setTab('pending')}>{quote?'Chờ phân công':'Chờ tiếp nhận'} <b>{pending.length}</b></button><button className={tab==='done'?'is-active':''} onClick={()=>setTab('done')}>{quote?'Đã phân công':'Đã duyệt đơn'} <b>{done.length}</b></button></div><PlanningFilters {...{query,setQuery,from,setFrom,to,setTo}}/><Table rowKey="_id" loading={loading} dataSource={filtered} scroll={{x:900}} pagination={{pageSize:10,hideOnSinglePage:true}} columns={[
 {title:'Mã đơn',render:(_,o)=><><strong>{o.bookingCode}</strong><div className="bo-secondary">{o.origin?.countryCode===o.destination?.countryCode?'Trong nước':'Quốc tế'}</div></>},
 {title:'Khách hàng',render:(_,o)=>o.customerId?.fullName||'Chưa cập nhật'},
 {title:'Tuyến',render:(_,o)=><span title={routeLabel(o)}>{routeLabel(o).length>36?routeLabel(o).slice(0,36)+'…':routeLabel(o)}</span>},
 {title:'Khởi hành',render:(_,o)=>date(o.requestedDepartureDate)},
 {title:quote?'Ngựa / xe':'Ngựa',render:(_,o)=>`${o.horseIds.length} con${quote?` · ${o.preparation?.plan?.vehicles?.length||0} xe`:''}`},
 ...(!quote?[{title:'Gửi lúc',render:(_,o)=>datetime(o.createdAt)}]:[]),
 {title:'Trạng thái',render:(_,o)=><span className={`bo-pill ${quote?'bo-pill-orange':'bo-pill-blue'}`}>{quote?o.preparation?.assignedAt?'Đã phân công':'Chờ phân công':o.status!=='PENDING_APPROVAL'?'Đã duyệt đơn':'Chờ tiếp nhận'}</span>},
 {title:'Thao tác',align:'right',render:(_,o)=><button className="bo-button bo-button-primary" onClick={()=>setSelectedId(idOf(o))}>{quote?'Phân công tài xế, phụ xe':o.status!=='PENDING_APPROVAL'?'Xem đơn':'Tiếp nhận'}</button>},
 ]}/><div className="bo-table-count">Hiển thị {filtered.length} đơn hàng</div></div>{selected&&<OrderReviewModal order={selected} data={data} mode={mode} onClose={()=>setSelectedId(null)} onSaved={load}/>}</section>;
}

