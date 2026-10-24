import React, { useState } from 'react';
import { Modal, Empty } from 'antd';
import { CheckCircle2, LockKeyhole, Search, ArrowRight } from 'lucide-react';
import { idOf, issue } from './planningUtils';
export default function PlanningResourcePicker({
  open,
  onClose,
  kind,
  order,
  data,
  value,
  onChange,
  horseCount = 0,
  excluded = []
}) {
  const [query, setQuery] = useState(''),
    [only, setOnly] = useState(false),
    vehicle = kind === 'vehicle';
  const resources = vehicle ? data.vehicles : data.staff.filter(p => p.role === (kind === 'driver' ? 'DRIVER' : 'ESCORT'));
  const options = resources.map(resource => ({
    resource,
    reason: issue(resource, kind, order, data.orders, data.routes) || (excluded.includes(idOf(resource)) ? 'Đã chọn cho xe khác' : vehicle && horseCount > resource.capacityHorses ? 'Không đủ khoang cho số ngựa' : '')
  }));
  const filtered = options.filter(({
    resource,
    reason
  }) => (!only || !reason) && [resource.plateNumber, resource.name, resource.fullName, resource.username, resource.phone, idOf(resource)].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <Modal title={vehicle ? 'Chọn phương tiện' : kind === 'driver' ? 'Chọn tài xế' : 'Chọn nhân viên hộ tống'} open={open} onCancel={onClose} footer={null} width={850} className="bo-resource-modal heritage-resource-picker" destroyOnClose><p className="bo-muted">{vehicle ? `Cần ${horseCount} khoang cho ngựa đã xếp trên xe này. Kiểm tra sức chứa, giấy tờ và lịch nhận chuyến trước khi chọn.` : 'Chỉ chọn nhân sự đủ điều kiện và không trùng nhiệm vụ.'}</p><div className="bo-picker-toolbar"><label className="bo-search"><Search size={16} /><input aria-label="Tìm tài nguyên" placeholder={vehicle ? 'Biển số, tên hoặc mã xe' : 'Tên, mã hoặc số điện thoại'} value={query} onChange={e => setQuery(e.target.value)} /></label><label><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)} /> Chỉ hiện chọn được</label><small>{options.filter(o => !o.reason).length}/{options.length} đủ điều kiện</small></div><div className="resource-register">{filtered.map(({
        resource,
        reason
      }) => <button type="button" disabled={Boolean(reason)} key={idOf(resource)} aria-pressed={value === idOf(resource)} className={`resource-register-row ${reason ? 'is-blocked' : ''}`} onClick={() => {
        onChange(idOf(resource));
        onClose();
      }}><div><strong>{vehicle ? resource.plateNumber : resource.fullName || resource.username}</strong><small>{vehicle ? resource.name || 'Xe chuyên dụng' : resource.username || 'Nhân sự vận hành'}</small></div><span className="resource-register-capacity">{vehicle ? `${resource.capacityHorses} khoang` : kind === 'driver' ? 'Tài xế' : 'Hộ tống'}</span><span className={`resource-register-state ${reason ? 'is-blocked' : ''}`}>{reason ? <><LockKeyhole size={14} />{reason}</> : value === idOf(resource) ? <><CheckCircle2 size={14} />Đang chọn</> : 'Đủ điều kiện'}</span><ArrowRight size={16} /></button>)}</div>{!filtered.length && <Empty description="Không có lựa chọn phù hợp" />}</Modal>;
}
