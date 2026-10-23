import React, { useState } from 'react';
import { Button, Empty, Input, Modal, Radio } from 'antd';

// Controlled field: the form remains the single source of the saved assignment.
export default function ResourcePicker({ value, onChange, options, title, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value);
  const filtered = options.filter(option => `${option.label} ${option.description || ''}`.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN')));
  return <>
    <div className="resource-selection"><div><strong>{selected?.label || 'Chưa chọn'}</strong><div className="ops-secondary">{selected?.description || title}</div></div><Button disabled={disabled} onClick={() => { setQuery(''); setOpen(true); }}>{selected ? 'Thay đổi' : title}</Button></div>
    <Modal centered title={title} open={open} footer={null} onCancel={() => setOpen(false)} width={700} styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}>
      <Input aria-label={`Tìm kiếm ${title.toLowerCase()}`} placeholder="Tìm theo tên, biển số hoặc số điện thoại…" value={query} onChange={event => setQuery(event.target.value)} allowClear style={{ marginBottom: 20 }} />
      <Radio.Group value={value} onChange={event => { onChange?.(event.target.value); setOpen(false); }} style={{ width: '100%' }}>
        <div className="resource-options">{filtered.map(option => <Radio key={option.value} value={option.value} disabled={option.disabled} className="resource-option"><strong>{option.label}</strong><div className="ops-secondary">{option.description}</div>{option.disabled && <div className="resource-unavailable">{option.reason || 'Hiện chưa khả dụng'}</div>}</Radio>)}</div>
      </Radio.Group>
      {!filtered.length && <Empty description="Không có lựa chọn phù hợp." />}
    </Modal>
  </>;
}
