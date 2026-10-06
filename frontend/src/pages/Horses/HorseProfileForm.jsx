import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Image, Input, InputNumber, Popconfirm, Row, Select, Space, Spin, Upload, message } from 'antd';
import { Trash2, UploadCloud } from 'lucide-react';
import { horseApi } from '../../services/horseApi';
import { transportScheduleApi } from '../../services/transportScheduleApi';
import { MAX_SOURCE_IMAGE_BYTES, compressHorseImage } from '../../utils/imageCompression';

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
    {value && <Button onClick={open} loading={opening}>{imageOnly ? 'Xem ảnh đã tải lên' : 'Xem tệp đã tải lên'}</Button>}
    {preview && (imageOnly ? <img src={preview} alt="Ảnh nhận dạng ngựa đã tải lên" style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain', border: '1px solid #d9d9d9', borderRadius: 8, background: '#fafafa' }} /> : <a href={preview} target="_blank" rel="noreferrer">Mở tài liệu trong tab mới</a>)}
    {!disabled && <Upload.Dragger accept={imageOnly ? '.jpg,.jpeg,.png,.webp' : '.pdf,.jpg,.jpeg,.png,.webp'} disabled={uploading} showUploadList={false} beforeUpload={async (file) => {
      const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const validType = isImage || (!imageOnly && file.type === 'application/pdf');
      const validSize = isImage ? file.size <= MAX_SOURCE_IMAGE_BYTES : file.size <= 5 * 1024 * 1024;
      if (!validType || !validSize || !file.size) {
        message.error('Chọn ảnh tối đa 25 MB hoặc PDF tối đa 5 MB.'); return Upload.LIST_IGNORE;
      }
      setUploading(true); onBusy?.(1);
      try {
        const uploadFile = isImage ? await compressHorseImage(file) : file;
        const response = await horseApi.uploadFile(uploadFile);
        onChange?.(response.data.data.url);
        setPreview(URL.createObjectURL(uploadFile));
        message.success(isImage ? `Đã nén và tải ${file.name} (${Math.ceil(uploadFile.size / 1024)} KB)` : `Đã tải lên ${file.name}`);
      } catch (error) { message.error(error.response?.data?.message || 'Không thể tải tệp.'); }
      finally { setUploading(false); onBusy?.(-1); }
      return Upload.LIST_IGNORE;
    }}>
      <UploadCloud size={24} />
      <p>{uploading ? 'Đang tải lên…' : value ? 'Chọn tệp thay thế' : 'Kéo thả hoặc chọn tệp từ máy'}</p>
      <small>{imageOnly ? 'JPG / PNG / WebP' : 'PDF / JPG / PNG / WebP'} · Ảnh tự chuyển sang WebP dưới 500 KB</small>
    </Upload.Dragger>}
    {!value && disabled && <span>Chưa có tệp</span>}
  </Space>;
}

function SecureUploadedFile({ url, alt }) {
  const [src, setSrc] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const objectUrlRef = React.useRef('');
  const showBlob = useCallback((blob) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(blob);
    setSrc(objectUrlRef.current);
  }, []);
  useEffect(() => {
    let active = true;
    setSrc(''); setMetadata(null); setFailed(false);
    horseApi.getFileMetadata(url)
      .then(async (response) => {
        if (!active) return;
        const fileMetadata = response.data.data;
        setMetadata(fileMetadata);
        if (fileMetadata.mimeType.startsWith('image/')) {
          const fileResponse = await horseApi.getFile(url);
          if (!active) return;
          showBlob(fileResponse.data);
        }
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    };
  }, [url, showBlob]);
  const openPdf = async () => {
    setOpening(true);
    try {
      const response = await horseApi.getFile(url);
      showBlob(response.data);
    } catch { setFailed(true); }
    finally { setOpening(false); }
  };
  if (failed) return <Alert type="error" showIcon message="Không thể tải tệp" />;
  if (!metadata || (metadata.mimeType.startsWith('image/') && !src)) return <div style={{ minHeight: 160, display: 'grid', placeItems: 'center', background: '#fafafa' }}><Spin /></div>;
  if (metadata.mimeType.startsWith('image/')) return <Image src={src} alt={alt} width="100%" height={180} style={{ objectFit: 'cover', borderRadius: 8 }} />;
  return <Space direction="vertical" style={{ width: '100%', minHeight: 160, justifyContent: 'center', alignItems: 'center' }}>
    <strong style={{ textAlign: 'center', wordBreak: 'break-word' }}>{metadata.name}</strong>
    <span>{Math.ceil(metadata.size / 1024)} KB</span>
    <Button onClick={openPdf} loading={opening}>Chuẩn bị xem PDF</Button>
    {src && <a href={src} target="_blank" rel="noreferrer">Mở PDF trong tab mới</a>}
  </Space>;
}

export function HorsePhotoGallery({ value = [], onChange, disabled = false, onBusy, allowPdf = false }) {
  const files = Array.isArray(value) ? value : value ? [value] : [];
  const filesRef = React.useRef(files);
  const pendingRef = React.useRef(0);
  const [uploading, setUploading] = useState(0);
  useEffect(() => { filesRef.current = files; }, [files]);
  const changeFiles = (next) => { filesRef.current = next; onChange?.(next); };
  const upload = async (source) => {
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(source.type);
    const isPdf = allowPdf && source.type === 'application/pdf';
    const validSize = isImage ? source.size <= MAX_SOURCE_IMAGE_BYTES : source.size <= 5 * 1024 * 1024;
    if ((!isImage && !isPdf) || !source.size || !validSize) {
      message.error(allowPdf ? 'Chọn ảnh tối đa 25 MB hoặc PDF tối đa 5 MB.' : 'Chọn ảnh JPG/PNG/WebP hợp lệ, dung lượng ảnh gốc tối đa 25 MB.');
      return Upload.LIST_IGNORE;
    }
    if (filesRef.current.length + pendingRef.current >= 10) {
      message.error('Mỗi mục được tải tối đa 10 tệp.');
      return Upload.LIST_IGNORE;
    }
    pendingRef.current += 1;
    setUploading((count) => count + 1); onBusy?.(1);
    try {
      const file = isImage ? await compressHorseImage(source) : source;
      const response = await horseApi.uploadFile(file);
      changeFiles([...filesRef.current, response.data.data.url]);
      message.success(isImage ? `Đã nén và tải ${source.name} (${Math.ceil(file.size / 1024)} KB)` : `Đã tải ${source.name}`);
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Không thể nén và tải ảnh.');
    } finally {
      pendingRef.current -= 1;
      setUploading((count) => count - 1); onBusy?.(-1);
    }
    return Upload.LIST_IGNORE;
  };
  return <Space direction="vertical" size={12} style={{ width: '100%' }}>
    {files.length > 0 && <Row gutter={[12, 12]}>
      {files.map((url, index) => <Col xs={12} md={8} lg={6} key={url}>
        <Card size="small" styles={{ body: { padding: 8 } }}>
          <SecureUploadedFile url={url} alt={`Tệp đã tải ${index + 1}`} />
          {!disabled && <Popconfirm title="Xóa tệp này?" okText="Xóa" cancelText="Hủy" onConfirm={() => changeFiles(filesRef.current.filter((file) => file !== url))}>
            <Button danger type="text" icon={<Trash2 size={16} />} block style={{ marginTop: 6 }}>Xóa tệp</Button>
          </Popconfirm>}
        </Card>
      </Col>)}
    </Row>}
    {!disabled && <Upload.Dragger accept={allowPdf ? '.pdf,.jpg,.jpeg,.png,.webp' : '.jpg,.jpeg,.png,.webp'} multiple disabled={files.length >= 10} showUploadList={false} beforeUpload={upload}>
      <UploadCloud size={24} />
      <p>{uploading > 0 ? `Đang xử lý và tải ${uploading} tệp…` : 'Kéo thả hoặc chọn nhiều tệp từ máy'}</p>
      <small>{allowPdf ? 'PDF tối đa 5 MB · Ảnh tự chuyển sang WebP dưới 500 KB' : 'Ảnh tự chuyển sang WebP dưới 500 KB'} · Tối đa 10 tệp</small>
    </Upload.Dragger>}
    {!files.length && disabled && <span>Chưa có tệp</span>}
  </Space>;
}

export default function HorseProfileForm({ horse, onSave, saving }) {
  const [form] = Form.useForm();
  const [uploads, setUploads] = useState(0);
  const [stops, setStops] = useState([]);
  const [stopError, setStopError] = useState('');
  useEffect(() => {
    form.resetFields();
    if (horse) form.setFieldsValue({ ...horse, passportScanUrl: Array.isArray(horse.passportScanUrl) ? horse.passportScanUrl : [horse.passportScanUrl].filter(Boolean), vaccinationRecordUrl: Array.isArray(horse.vaccinationRecordUrl) ? horse.vaccinationRecordUrl : [horse.vaccinationRecordUrl].filter(Boolean), dateOfBirth: horse.dateOfBirth?.slice(0, 10), lastVaccinationDate: horse.lastVaccinationDate?.slice(0, 10) });
  }, [horse, form]);
  useEffect(() => {
    let active = true;
    transportScheduleApi.getCatalog()
      .then((response) => { if (active) setStops(response.data.data.stops || []); })
      .catch(() => { if (active) setStopError('Không thể tải danh sách điểm vận chuyển cố định.'); });
    return () => { active = false; };
  }, []);
  const busy = (delta) => setUploads((n) => n + delta);
  const stopOptions = Object.entries(stops.reduce((groups, stop) => {
    (groups[stop.countryCode] ||= []).push({ value: stop.id, label: stop.name });
    return groups;
  }, {})).map(([label, options]) => ({ label, options }));
  return <Form form={form} layout="vertical" onFinish={onSave}>
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
        <Col xs={24} md={12}><Form.Item name="currentStopId" label="Địa điểm hiện tại của ngựa" extra="Ngựa chỉ được đặt chuyến có điểm đón trùng địa điểm này." rules={required}><Select loading={!stops.length && !stopError} options={stopOptions} placeholder="Chọn điểm tập kết hiện tại" /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="identifyingMarks" label="Đặc điểm dị biệt nhận dạng (nếu có)"><Input placeholder="Sao trắng trán, tất trắng chân sau…" /></Form.Item></Col>
        <Col span={24}><Form.Item name="photos" label="Bộ ảnh nhận dạng ngựa" extra="Tải ít nhất 2 ảnh (nên có ảnh toàn thân và khuôn mặt). Có thể chọn nhiều ảnh cùng lúc." rules={[{ validator: (_, value) => Array.isArray(value) && value.length >= 2 && value.length <= 10 ? Promise.resolve() : Promise.reject(new Error('Vui lòng tải từ 2 đến 10 ảnh ngựa.')) }]}><HorsePhotoGallery onBusy={busy} /></Form.Item></Col>
      </Row>
    </Card>
    <Card title="Hồ sơ pháp lý & giấy tờ thú y" style={{ marginBottom: 20 }}>
      <Row gutter={24}>
        <Col xs={24} md={12}><Form.Item name="feiPassportNumber" label="Số hộ chiếu ngựa / FEI" rules={required}><Input /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="lastVaccinationDate" label="Ngày tiêm phòng cúm ngựa gần nhất" extra="Cần hồ sơ tiêm phòng trong vòng 6 tháng để được duyệt." rules={required}><Input type="date" max={today()} /></Form.Item></Col>
        <Col span={24}><Form.Item name="passportScanUrl" label="Hộ chiếu ngựa (Horse Passport)" rules={[{ validator: (_, value) => Array.isArray(value) && value.length >= 1 && value.length <= 10 ? Promise.resolve() : Promise.reject(new Error('Vui lòng tải từ 1 đến 10 tệp hộ chiếu.')) }]}><HorsePhotoGallery allowPdf onBusy={busy} /></Form.Item></Col>
        <Col span={24}><Form.Item name="vaccinationRecordUrl" label="Sổ tiêm chủng / Chứng nhận kiểm dịch" rules={[{ validator: (_, value) => Array.isArray(value) && value.length >= 1 && value.length <= 10 ? Promise.resolve() : Promise.reject(new Error('Vui lòng tải từ 1 đến 10 tệp tiêm chủng.')) }]}><HorsePhotoGallery allowPdf onBusy={busy} /></Form.Item></Col>
        <Col span={24}><Form.Item name="medicalHistoryNotes" label="Tiền sử y tế & lưu ý sức khỏe"><Input.TextArea rows={3} /></Form.Item></Col>
      </Row>
    </Card>
    {stopError && <Alert type="error" showIcon message={stopError} style={{ marginBottom: 16 }} />}
    <Button htmlType="submit" type="primary" loading={saving} disabled={uploads > 0 || Boolean(stopError)}>Gửi hồ sơ kiểm duyệt sức khỏe</Button>
  </Form>;
}
