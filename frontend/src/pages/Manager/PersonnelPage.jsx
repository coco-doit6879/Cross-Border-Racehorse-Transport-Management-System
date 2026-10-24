import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Popconfirm, Table, Tag, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import userApi from '../../services/userApi';
import { Workspace } from '../../components/operations/OperationsUI';
export default function PersonnelPage({ role }) {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [selected, setSelected] = useState(params.get('create') === '1' ? {} : null), [saving, setSaving] = useState(false);
  const [form] = Form.useForm(); const apiRole = role === 'driver' ? 'DRIVER' : 'ESCORT';
  const load = async () => { setLoading(true); setError(''); try { const r = await userApi.getUsers(); setRows(r.data.data.filter(u => u.role === apiRole)); } catch(e) { setError(e.response?.data?.message || 'Không thể tải nhân sự.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [apiRole]);
  const open = row => { form.resetFields(); form.setFieldsValue(row); setSelected(row); };
  const close = () => { if (saving) return; setSelected(null); if (params.has('create')) setParams({}); };
  const save = async values => {
    setSaving(true);
    try { const payload = { ...values, role: apiRole }; if(selected._id) await userApi.updateUser(selected._id, payload); else await userApi.createUser(payload); setSelected(null); setParams({}); message.success('Đã lưu nhân sự.'); await load(); }
    catch(e) { message.error(e.response?.data?.message || 'Không thể lưu nhân sự.'); } finally { setSaving(false); }
  };
  const deactivate = async id => { try { await userApi.deleteUser(id); message.success('Đã ngừng hoạt động tài khoản.'); await load(); } catch(e) { message.error(e.response?.data?.message || 'Không thể ngừng hoạt động.'); } };
  return <Workspace title={role === 'driver' ? 'Tài xế' : 'Nhân viên hộ tống'} description="Quản lý tài khoản và thông tin liên hệ của nhân sự vận chuyển." actions={<Button type="primary" onClick={() => open({})}>Thêm nhân sự</Button>}>
    {error && <Alert type="error" message={error} action={<Button onClick={load}>Thử lại</Button>} />}
    <Table scroll={{x:800}} rowKey="_id" loading={loading} dataSource={rows} columns={[
      { title:'Họ tên', dataIndex:'fullName' }, { title:'Email', dataIndex:'email' }, { title:'Điện thoại', dataIndex:'phone' },
      { title:'Trạng thái', render:(_,r) => <Tag>{r.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</Tag> },
      { title:'Thao tác', render:(_,r) => <><Button onClick={() => open(r)}>Chỉnh sửa</Button> <Popconfirm title="Ngừng hoạt động tài khoản này?" onConfirm={() => deactivate(r._id)}><Button danger disabled={!r.isActive}>Ngừng hoạt động</Button></Popconfirm></> }
    ]} />
    <Modal title={selected?._id ? 'Chỉnh sửa nhân sự' : 'Tạo tài khoản nhân sự'} open={selected !== null} onCancel={close} onOk={() => form.submit()} confirmLoading={saving}>
      <Form form={form} layout="vertical" onFinish={save} disabled={saving}>
        <Form.Item name="fullName" label="Họ tên" rules={[{required:true}]}><Input /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{required:true,type:'email'}]}><Input /></Form.Item>
        <Form.Item name="phone" label="Điện thoại" rules={[{required:true}]}><Input /></Form.Item>
        {!selected?._id && <Form.Item name="password" label="Mật khẩu ban đầu" rules={[{required:true,min:6}]}><Input.Password autoComplete="new-password" /></Form.Item>}
      </Form>
    </Modal>
  </Workspace>;
}
