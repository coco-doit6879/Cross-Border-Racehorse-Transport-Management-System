import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Upload, message } from 'antd';
import { UploadCloud } from 'lucide-react';
import { horseApi } from '../../services/horseApi';

export const reviewLabels = { PENDING_REVIEW: 'Chờ duyệt sức khỏe', APPROVED: 'Đã duyệt sức khỏe', REJECTED: 'Cần bổ sung / Không đạt' };
export const reviewColors = { PENDING_REVIEW: 'gold', APPROVED: 'green', REJECTED: 'red' };
export const canReviewHorse = (user) => user?.role === 'TRANSPORT_SPECIALIST' || user?.effectivePermissions?.includes('horse:review_health') || user?.permissions?.includes('horse:review_health');
const required = [{ required: true, message: 'Vui lòng bổ sung thông tin này.' }];
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function ProfileFile({ value, onChange, imageOnly = false, disabled = false, onBusy }) {
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [preview, setPreview] = useState(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const open = async () => {
    setOpening(true);
    try {
      if (!/^\/horses\/files\/[a-f0-9]{24}$/i.test(value)) throw new Error('Tệp cũ chưa được tải lên hệ thống. Vui lòng bổ sung.');
      const response = await horseApi.getFile(value);
      setPreview(URL.createObjectURL(response.data));
    } catch (error) { message.error(error.response?.data?.message || error.message); }
    finally { setOpening(false); }
  };
  return <Space direction="vertical" style={{ width: '100%' }}>
    {value && <Button onClick={open} loading={opening}>Xem tệp đã tải lên</Button>}
    {preview && (imageOnly ? <img src={preview} alt="Ảnh nhận dạng ngựa" style={{ maxWidth: '100%', maxHeight: 260 }} /> : <a href={preview} target="_blank" rel="noreferrer">Mở tài liệu trong tab mới</a>)}
    {!disabled && <Upload.Dragger accept={imageOnly ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'} disabled={uploading} showUploadList={false} beforeUpload={async (file) => {
      if (!(imageOnly ? ['image/jpeg', 'image/png'] : ['image/jpeg', 'image/png', 'application/pdf']).includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
        message.error('Chọn tệp đúng định dạng, tối đa 5 MB.'); return Upload.LIST_IGNORE;
      }
      setUploading(true); onBusy?.(1);
      try {
        const response = await horseApi.uploadFile(file);
        onChange?.(response.data.data.url);
        setPreview(null);
        message.success(`Đã tải lên ${file.name}`);
      } catch (error) { message.error(error.response?.data?.message || 'Không thể tải tệp.'); }
      finally { setUploading(false); onBusy?.(-1); }
      return Upload.LIST_IGNORE;
    }}>
      <UploadCloud size={24} />
      <p>{uploading ? 'Đang tải lên…' : value ? 'Chọn tệp thay thế' : 'Kéo thả hoặc chọn tệp từ máy'}</p>
      <small>{imageOnly ? 'JPG / PNG' : 'PDF / JPG / PNG'} · Tối đa 5 MB</small>
    </Upload.Dragger>}
    {!value && disabled && <span>Chưa có tệp</span>}
  </Space>;
}

export default function HorseProfileForm({ horse, onSave, saving }) {
  const [form] = Form.useForm();
  const [uploads, setUploads] = useState(0);
  useEffect(() => {
    form.resetFields();
    if (horse) form.setFieldsValue({ ...horse, dateOfBirth: horse.dateOfBirth?.slice(0, 10), lastVaccinationDate: horse.lastVaccinationDate?.slice(0, 10), bodyPhoto: horse.photos?.[0], facePhoto: horse.photos?.[1] });
  }, [horse, form]);
  const busy = (delta) => setUploads((n) => n + delta);
  return <Form form={form} layout="vertical" onFinish={({ bodyPhoto, facePhoto, ...values }) => onSave({ ...values, photos: [bodyPhoto, facePhoto] })}>
    <Alert type="info" showIcon message="Hồ sơ được gửi đến Chuyên viên Thủ tục & Kiểm dịch để xác minh nhận dạng và duyệt sức khỏe." description="Mỗi lần lưu thay đổi sẽ đưa hồ sơ về trạng thái chờ duyệt." style={{ marginBottom: 24 }} />
    <Card title="Thông tin nhận dạng" style={{ marginBottom: 20 }}>
      <Row gutter={24}>
        <Col xs={24} md={12}><Form.Item name="name" label="Tên ngựa (Tên đăng ký thi đấu)" rules={required}><Input /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="microchipId" label="Mã vi chip (Microchip ID)" rules={[...required, { pattern: /^[A-Za-z0-9]{10,18}$/, message: 'Nhập 10–18 ký tự chữ hoặc số.' }]}><Input maxLength={18} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="breed" label="Giống ngựa" rules={required}><Select options={['Thoroughbred', 'Arabian', 'Warmblood', 'Quarter Horse', 'Khác'].map((value) => ({ value, label: value }))} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="gender" label="Giới tính" rules={required}><Select options={[{ value: 'STALLION', label: 'Đực (Stallion)' }, { value: 'MARE', label: 'Cái (Mare)' }, { value: 'GELDING', label: 'Thiến (Gelding)' }]} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="dateOfBirth" label="Ngày sinh (dùng tính tuổi)" rules={required}><Input type="date" max={today()} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="weightKg" label="Trọng lượng (kg)" rules={[{ required: true, type: 'number', min: 0.1, message: 'Nhập cân nặng lớn hơn 0.' }]}><InputNumber min={0.1} style={{ width: '100%' }} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="color" label="Màu sắc lông chính" rules={required}><Select options={['Nâu đỏ (Bay)', 'Hạt dẻ (Chestnut)', 'Đen (Black)', 'Xám (Grey)', 'Trắng (White)', 'Khác'].map((value) => ({ value, label: value }))} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="identifyingMarks" label="Đặc điểm dị biệt nhận dạng (nếu có)"><Input placeholder="Sao trắng trán, tất trắng chân sau…" /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="bodyPhoto" label="Ảnh toàn thân" rules={required}><ProfileFile imageOnly onBusy={busy} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="facePhoto" label="Ảnh khuôn mặt" rules={required}><ProfileFile imageOnly onBusy={busy} /></Form.Item></Col>
      </Row>
    </Card>
    <Card title="Hồ sơ pháp lý & giấy tờ thú y" style={{ marginBottom: 20 }}>
      <Row gutter={24}>
        <Col xs={24} md={12}><Form.Item name="feiPassportNumber" label="Số hộ chiếu ngựa / FEI" rules={required}><Input /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="lastVaccinationDate" label="Ngày tiêm phòng cúm ngựa gần nhất" extra="Cần hồ sơ tiêm phòng trong vòng 6 tháng để được duyệt." rules={required}><Input type="date" max={today()} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="passportScanUrl" label="Hộ chiếu ngựa (Horse Passport)" rules={required}><ProfileFile onBusy={busy} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="vaccinationRecordUrl" label="Sổ tiêm chủng / Chứng nhận kiểm dịch" rules={required}><ProfileFile onBusy={busy} /></Form.Item></Col>
        <Col span={24}><Form.Item name="medicalHistoryNotes" label="Tiền sử y tế & lưu ý sức khỏe"><Input.TextArea rows={3} /></Form.Item></Col>
      </Row>
    </Card>
    <Button htmlType="submit" type="primary" loading={saving} disabled={uploads > 0}>Gửi hồ sơ kiểm duyệt sức khỏe</Button>
  </Form>;
}
