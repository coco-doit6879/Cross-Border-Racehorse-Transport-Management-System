import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Upload,
  message,
  Tag,
  Modal,
  Space
} from 'antd';
import {
  ArrowLeft,
  Save,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';

const { Option } = Select;

const PassportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { horses, updateHorse, uploadDocument } = useHorseStore();

  const horse = horses.find((h) => h.id === id || h.microchipId === id) || horses[0];

  const [form] = Form.useForm();
  const [docCodeInput, setDocCodeInput] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('HEALTH_CERT');

  useEffect(() => {
    if (horse) {
      form.setFieldsValue({
        name: horse.name,
        microchipId: horse.microchipId,
        feiPassportNo: horse.feiPassportNo,
        breed: horse.breed,
        age: horse.age,
        weight: horse.weight,
        gender: horse.gender,
        color: horse.color,
        medicalHistory: horse.medicalHistory
      });
    }
  }, [horse, form]);

  if (!horse) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Không tìm thấy hồ sơ ngựa!</p>
        <Button onClick={() => navigate('/horses')}>Quay lại danh sách</Button>
      </div>
    );
  }

  const handleSave = (values) => {
    // Validate 15-digit microchip
    const microchipRegex = /^\d{15}$/;
    if (!microchipRegex.test(values.microchipId)) {
      message.error('Mã vi mạch (Microchip ID) phải chứa chính xác 15 chữ số theo chuẩn ISO 11784/11785!');
      return;
    }

    updateHorse(horse.id, values);
    message.success(`Đã lưu cập nhật thông tin hồ sơ cho ngựa ${values.name}!`);
  };

  const handleMockUpload = (docType) => {
    const fileName =
      docType === 'HEALTH_CERT'
        ? `Giay_Kham_Suc_Khoe_${horse.name.replace(/\s+/g, '')}.pdf`
        : `Tai_Lieu_${Date.now()}.pdf`;

    uploadDocument(horse.id, docType, {
      fileName,
      fileSize: '1.8 MB'
    });

    message.success(`Đã tải lên tệp ${fileName}! Trạng thái chuyển sang 'Chờ kiểm duyệt'.`);
  };

  const renderStatusTag = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span
            style={{
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Đã duyệt
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span
            style={{
              backgroundColor: '#FEF08A',
              color: '#92400E',
              border: '1px solid #FDE047',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Chờ kiểm duyệt
          </span>
        );
      case 'REJECTED':
      default:
        return (
          <span
            style={{
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Cần bổ sung
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Bar: Horse Title + Save Action Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '16px 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/horses')}
            style={{ borderRadius: 6 }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
              {horse.name}
            </h1>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              Hồ sơ nhận dạng và tài liệu y tế lưu hành kiểm dịch xuyên biên giới
            </div>
          </div>
        </div>

        <Button
          type="primary"
          icon={<Save size={16} />}
          onClick={() => form.submit()}
          style={{
            backgroundColor: '#0F3E2E',
            borderColor: '#0F3E2E',
            height: 40,
            padding: '0 24px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8
          }}
        >
          Lưu lại
        </Button>
      </div>

      {/* 2. Main 2-Columns Layout (Exact Figma 03-horse-profile 1) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.2fr',
          gap: 24,
          alignItems: 'start'
        }}
      >
        {/* Column Left: Thông tin nhận dạng */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 24
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 20 }}>
            Thông tin nhận dạng
          </div>

          <Form form={form} layout="vertical" onFinish={handleSave}>
            {/* Tên ngựa */}
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Tên ngựa *</span>}
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên ngựa' }]}
            >
              <Input placeholder="Ví dụ: Thunder Bolt" />
            </Form.Item>

            {/* Mã chip 15 chữ số */}
            <Form.Item
              label={
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  Mã chip - Đúng 15 chữ số *
                </span>
              }
              name="microchipId"
              extra={
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  Chuẩn ISO 11784/11785 dùng để tra cứu tại cửa khẩu kiểm dịch.
                </span>
              }
              rules={[
                { required: true, message: 'Vui lòng nhập mã chip' },
                { pattern: /^\d{15}$/, message: 'Mã chip bắt buộc phải gồm đúng 15 chữ số' }
              ]}
            >
              <Input placeholder="104123456789012" maxLength={15} />
            </Form.Item>

            {/* Số hộ chiếu FEI & Giống */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Số hộ chiếu FEI *</span>}
                name="feiPassportNo"
                rules={[{ required: true, message: 'Vui lòng nhập số hộ chiếu FEI' }]}
              >
                <Input placeholder="FEI-2026-0871" />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Giống</span>}
                name="breed"
              >
                <Select placeholder="Chọn giống">
                  <Option value="Thoroughbred">Thoroughbred (Thuần chủng)</Option>
                  <Option value="Arabian">Arabian</Option>
                  <Option value="Warmblood">Warmblood</Option>
                  <Option value="Quarter Horse">Quarter Horse</Option>
                </Select>
              </Form.Item>
            </div>

            {/* Tuổi & Cân nặng */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Tuổi</span>}
                name="age"
              >
                <Input placeholder="5 năm" />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Cân nặng</span>}
                name="weight"
              >
                <Input suffix="kg" placeholder="470" />
              </Form.Item>
            </div>

            {/* Giới tính */}
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Giới tính</span>}
              name="gender"
            >
              <Select placeholder="Chọn giới tính">
                <Option value="STALLION">Ngựa đực (Stallion)</Option>
                <Option value="MARE">Ngựa cái (Mare)</Option>
                <Option value="GELDING">Ngựa thiến (Gelding)</Option>
              </Select>
            </Form.Item>

            {/* Tiền sử y tế / Ghi chú */}
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Tiền sử y tế & lưu ý</span>}
              name="medicalHistory"
            >
              <Input.TextArea rows={3} placeholder="Ghi chú bệnh lý hoặc dặn dò khi vận chuyển..." />
            </Form.Item>
          </Form>

          {/* Footer note in Figma */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#F9FAFB',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              fontSize: 12,
              color: '#6B7280'
            }}
          >
            Thông tin được dùng cho kiểm dịch và đối chiếu khi bàn giao.
          </div>
        </div>

        {/* Column Right: Tài liệu vận chuyển (Compliance Docs) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 24
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
              Tài liệu vận chuyển
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 18 }}>
            Giấy tờ tuân thủ và hồ sơ kiểm dịch quốc tế (ISO 11784/11785)
          </div>

          {/* List of 3 Standard Documents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {horse.documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  padding: '14px 16px',
                  backgroundColor: '#FAFAFA'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                      {doc.title}
                    </div>
                    {doc.fileName ? (
                      <div style={{ fontSize: 12, color: '#4B5563', marginTop: 3 }}>
                        {doc.fileName} • {doc.fileSize || '1.5 MB'}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3, fontStyle: 'italic' }}>
                        Chưa có tệp
                      </div>
                    )}
                  </div>
                  <div>{renderStatusTag(doc.status)}</div>
                </div>

                {/* Show rejection reason if exists */}
                {doc.rejectionReason && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#B91C1C'
                    }}
                  >
                    <strong>Lý do từ chối:</strong> {doc.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Drag and Drop Zone */}
          <div
            onClick={() => handleMockUpload(selectedDocType)}
            style={{
              border: '2px dashed #0F3E2E',
              backgroundColor: '#F7FAF8',
              borderRadius: 10,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: 16,
              transition: 'all 0.2s'
            }}
          >
            <UploadCloud size={32} color="#0F3E2E" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F3E2E' }}>
              + Kéo thả PDF / ảnh hoặc chọn tệp
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              Chọn loại giấy tờ cần tải lên bên dưới
            </div>
          </div>

          {/* Document Type Selector for Upload */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#4B5563', marginBottom: 4 }}>
              Loại tài liệu cần tải lên:
            </div>
            <Select
              value={selectedDocType}
              onChange={setSelectedDocType}
              style={{ width: '100%' }}
            >
              <Option value="HEALTH_CERT">Giấy khám sức khỏe (Đang cần bổ sung)</Option>
              <Option value="VACCINATION">Chứng nhận tiêm phòng</Option>
              <Option value="FEI_PASSPORT">Hộ chiếu FEI</Option>
            </Select>
          </div>

          {/* Document / Barcode input code */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#4B5563', marginBottom: 4 }}>
              Mã quét hoặc mã tài liệu:
            </div>
            <Input
              placeholder="VD: DOC-HLTH-2026-9811"
              value={docCodeInput}
              onChange={(e) => setDocCodeInput(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassportDetail;
