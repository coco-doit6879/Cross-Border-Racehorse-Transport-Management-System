import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Form, Select, Upload, Tabs, Tag, message, Popconfirm } from 'antd';
import {
  Plus,
  Search,
  FileCheck2,
  FileText,
  AlertCircle,
  Edit,
  MapPin,
  Trash2,
  Calendar,
  UploadCloud,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function HorseList() {
  const navigate = useNavigate();
  const { horses, fetchHorses, addHorse, updateHorse, loading } = useHorseStore();
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // ALL | READY | MISSING
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState(null);
  const [form] = Form.useForm();
  const [activeModalTab, setActiveModalTab] = useState('identity');

  useEffect(() => {
    fetchHorses().catch(() => {});
  }, [fetchHorses]);

  const readyHorses = horses.filter((h) => h.reviewStatus === 'APPROVED');
  const missingHorses = horses.filter((h) => h.reviewStatus !== 'APPROVED');

  const filteredHorses = horses.filter((h) => {
    if (filterTab === 'READY' && h.reviewStatus !== 'APPROVED') return false;
    if (filterTab === 'MISSING' && h.reviewStatus === 'APPROVED') return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.microchipId && h.microchipId.toLowerCase().includes(q)) ||
      (h.feiPassportNo && h.feiPassportNo.toLowerCase().includes(q)) ||
      (h.breed && h.breed.toLowerCase().includes(q))
    );
  });

  const handleOpenAddModal = () => {
    setEditingHorse(null);
    form.resetFields();
    form.setFieldsValue({
      breed: 'Thuần chủng (Thoroughbred)',
      sex: 'Ngựa đực',
      color: 'Hạt dẻ (Chestnut)',
      currentLocationName: 'Trang trại Thủ Đức, TP.HCM'
    });
    setActiveModalTab('identity');
    setModalOpen(true);
  };

  const handleOpenEditModal = (horse) => {
    setEditingHorse(horse);
    form.setFieldsValue({
      name: horse.name,
      breed: horse.breed,
      sex: horse.sex || 'Ngựa đực',
      age: parseInt(horse.age) || 5,
      weight: horse.weight,
      color: horse.color,
      microchipId: horse.microchipId,
      feiPassportNo: horse.feiPassportNo,
      currentLocationName: horse.currentLocationName || 'Trang trại Thủ Đức, TP.HCM'
    });
    setActiveModalTab('identity');
    setModalOpen(true);
  };

  const handleSaveHorse = async () => {
    try {
      const values = await form.validateFields();
      if (editingHorse) {
        await updateHorse(editingHorse.id, values);
        message.success(`Đã cập nhật thông tin hồ sơ cho ngựa ${values.name}!`);
      } else {
        await addHorse({
          ...values,
          reviewStatus: 'APPROVED',
          documentsCount: '3/3'
        });
        message.success(`Đã thêm thành công hồ sơ ngựa ${values.name}!`);
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '22px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Hồ sơ ngựa
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
            Quản lý nhận dạng, giấy tờ và tình trạng kiểm duyệt trước mỗi chuyến đi.
          </p>
        </div>

        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleOpenAddModal}
          style={{
            height: 42,
            padding: '0 20px',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 8,
            backgroundColor: '#ea580c',
            borderColor: '#ea580c'
          }}
        >
          + Thêm ngựa
        </Button>
      </div>

      {/* 3 Metrics Cards */}
      <div className="horse-metrics">
        <div>
          <span className="horse-metric-icon">
            <FileText size={22} />
          </span>
          <div>
            <strong>{horses.length}</strong>
            <span>Ngựa trong hồ sơ</span>
          </div>
        </div>

        <div>
          <span
            className="horse-metric-icon"
            style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
          >
            <ShieldCheck size={22} />
          </span>
          <div>
            <strong style={{ color: '#059669' }}>{readyHorses.length}</strong>
            <span>Sẵn sàng đặt chuyến</span>
          </div>
        </div>

        <div>
          <span
            className="horse-metric-icon"
            style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
          >
            <AlertCircle size={22} />
          </span>
          <div>
            <strong style={{ color: missingHorses.length > 0 ? '#dc2626' : '#64748b' }}>
              {missingHorses.length}
            </strong>
            <span>Thiếu giấy tờ / Cần bổ sung</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '14px 20px',
          gap: 16,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            style={{
              padding: '7px 18px',
              borderRadius: 20,
              border: filterTab === 'ALL' ? '1px solid #ea580c' : '1px solid #e2e8f0',
              background: filterTab === 'ALL' ? '#ea580c' : '#ffffff',
              color: filterTab === 'ALL' ? '#ffffff' : '#64748b',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Tất cả ({horses.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('READY')}
            style={{
              padding: '7px 18px',
              borderRadius: 20,
              border: filterTab === 'READY' ? '1px solid #ea580c' : '1px solid #e2e8f0',
              background: filterTab === 'READY' ? '#ea580c' : '#ffffff',
              color: filterTab === 'READY' ? '#ffffff' : '#64748b',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Sẵn sàng đặt chuyến ({readyHorses.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('MISSING')}
            style={{
              padding: '7px 18px',
              borderRadius: 20,
              border: filterTab === 'MISSING' ? '1px solid #ea580c' : '1px solid #e2e8f0',
              background: filterTab === 'MISSING' ? '#ea580c' : '#ffffff',
              color: filterTab === 'MISSING' ? '#ffffff' : '#64748b',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Thiếu giấy tờ ({missingHorses.length})
          </button>
        </div>

        <Input
          prefix={<Search size={15} color="#94a3b8" />}
          placeholder="Tìm theo tên ngựa, mã chip, số hộ chiếu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 340, borderRadius: 8 }}
          allowClear
        />
      </div>

      {/* Horse Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 22
        }}
      >
        {filteredHorses.map((horse) => {
          const isReady = horse.reviewStatus === 'APPROVED';

          return (
            <div
              key={horse.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)';
              }}
            >
              {/* Header: Name + Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                  {horse.name}
                </h3>
                {isReady ? (
                  <Tag
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 11,
                      padding: '2px 8px'
                    }}
                  >
                    SẴN SÀNG ĐẶT CHUYẾN
                  </Tag>
                ) : (
                  <Tag
                    style={{
                      background: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 11,
                      padding: '2px 8px'
                    }}
                  >
                    CHỜ DUYỆT SỨC KHỎE
                  </Tag>
                )}
              </div>

              {/* Attributes Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 14px',
                  fontSize: 13,
                  backgroundColor: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #f1f5f9'
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Giống: </span>
                  <strong style={{ color: '#0f172a' }}>{horse.breed || 'Thuần chủng'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Giới tính/Tuổi: </span>
                  <strong style={{ color: '#0f172a' }}>{horse.sex || 'Ngựa đực'} · {horse.age}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Lông/Cân nặng: </span>
                  <strong style={{ color: '#0f172a' }}>{horse.color || 'Bay'} · {horse.weight} kg</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Hộ chiếu FEI: </span>
                  <strong style={{ color: '#ea580c' }}>{horse.feiPassportNo || 'Chưa cấp'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b' }}>Mã vi chip: </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                    {horse.microchipId || 'Chưa gắn chip'}
                  </span>
                </div>
              </div>

              {/* Documents & Quarantine */}
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <FileCheck2 size={15} color="#059669" />
                  <span>Giấy tờ & kiểm dịch ({horse.documentsCount || '3/3'})</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    ✓ Hộ chiếu FEI (Có hiệu lực)
                  </span>
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    ✓ Sổ tiêm chủng (Đã tiêm)
                  </span>
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    ✓ Xét nghiệm EIA (Âm tính)
                  </span>
                </div>
              </div>

              {/* 4 Action Buttons */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  paddingTop: 12,
                  borderTop: '1px solid #f1f5f9'
                }}
              >
                <Button
                  icon={<Edit size={13} />}
                  onClick={() => handleOpenEditModal(horse)}
                  style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                >
                  Chỉnh sửa hồ sơ
                </Button>

                <Button
                  icon={<Calendar size={13} />}
                  onClick={() => navigate(`/horses/${horse.id}`)}
                  style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                >
                  Sổ hành trình
                </Button>

                <Button
                  icon={<MapPin size={13} />}
                  onClick={() => message.info(`Vị trí hiện tại của ${horse.name}: ${horse.currentLocationName || 'Trang trại Thủ Đức, TP.HCM'}`)}
                  style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                >
                  Cập nhật vị trí
                </Button>

                <Popconfirm
                  title={`Xóa hồ sơ ${horse.name}?`}
                  description="Bạn có chắc chắn muốn xóa hồ sơ ngựa này?"
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => message.info(`Đã lưu trữ hồ sơ của ${horse.name}.`)}
                >
                  <Button
                    danger
                    icon={<Trash2 size={13} />}
                    style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                  >
                    Xóa hồ sơ
                  </Button>
                </Popconfirm>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Horse Center Modal */}
      <Modal
        centered
        width={720}
        title={
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            {editingHorse ? `Chỉnh sửa hồ sơ · ${editingHorse.name}` : 'Thêm hồ sơ ngựa mới'}
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        maskClosable={true}
        zIndex={100000}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '10px 0 4px' }}>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              onClick={handleSaveHorse}
              style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
            >
              Lưu hồ sơ ngựa
            </Button>
          </div>
        }
        className="animate-modal-pop"
      >
        <Tabs
          activeKey={activeModalTab}
          onChange={setActiveModalTab}
          items={[
            {
              key: 'identity',
              label: '1. Nhận dạng & Đặc điểm',
              children: (
                <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    <Form.Item
                      name="name"
                      label="Tên ngựa đua"
                      rules={[{ required: true, message: 'Vui lòng nhập tên ngựa' }]}
                    >
                      <Input placeholder="VD: Storm Runner, Mambo..." />
                    </Form.Item>

                    <Form.Item
                      name="breed"
                      label="Giống ngựa"
                      rules={[{ required: true, message: 'Vui lòng chọn giống' }]}
                    >
                      <Select
                        options={[
                          { label: 'Thuần chủng (Thoroughbred)', value: 'Thuần chủng (Thoroughbred)' },
                          { label: 'Ngựa Ả Rập (Arabian)', value: 'Ngựa Ả Rập (Arabian)' },
                          { label: 'Ngựa đua Quarter (Quarter Horse)', value: 'Ngựa đua Quarter (Quarter Horse)' },
                          { label: 'Warmblood Châu Âu', value: 'Warmblood Châu Âu' }
                        ]}
                      />
                    </Form.Item>

                    <Form.Item name="sex" label="Giới tính">
                      <Select
                        options={[
                          { label: 'Ngựa đực (Stallion)', value: 'Ngựa đực' },
                          { label: 'Ngựa đực thiến (Gelding)', value: 'Ngựa đực thiến' },
                          { label: 'Ngựa cái (Mare)', value: 'Ngựa cái' }
                        ]}
                      />
                    </Form.Item>

                    <Form.Item name="age" label="Tuổi (năm)">
                      <Input type="number" min={1} max={30} placeholder="VD: 5" />
                    </Form.Item>

                    <Form.Item name="color" label="Màu lông">
                      <Select
                        options={[
                          { label: 'Nâu đậm (Bay)', value: 'Nâu đậm (Bay)' },
                          { label: 'Hạt dẻ (Chestnut)', value: 'Hạt dẻ (Chestnut)' },
                          { label: 'Đen tuyền (Black)', value: 'Đen tuyền (Black)' },
                          { label: 'Xám bạc (Grey)', value: 'Xám bạc (Grey)' }
                        ]}
                      />
                    </Form.Item>

                    <Form.Item name="weight" label="Cân nặng (kg)">
                      <Input type="number" min={200} max={800} placeholder="VD: 480" />
                    </Form.Item>

                    <Form.Item
                      name="microchipId"
                      label="Mã vi chip (Microchip ID)"
                      rules={[{ required: true, message: 'Vui lòng nhập mã vi chip' }]}
                    >
                      <Input placeholder="VD: 985141005544332" />
                    </Form.Item>

                    <Form.Item
                      name="feiPassportNo"
                      label="Số hộ chiếu FEI (Passport)"
                      rules={[{ required: true, message: 'Vui lòng nhập số hộ chiếu' }]}
                    >
                      <Input placeholder="VD: VN-982367" />
                    </Form.Item>

                    <Form.Item
                      name="currentLocationName"
                      label="Địa điểm hiện tại"
                      style={{ gridColumn: 'span 2' }}
                    >
                      <Input placeholder="VD: Trang trại Thủ Đức, TP.HCM" />
                    </Form.Item>
                  </div>
                </Form>
              )
            },
            {
              key: 'documents',
              label: '2. Giấy tờ & Kiểm dịch (0/3)',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                  <div
                    style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: 10,
                      padding: 16,
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>1. Hộ chiếu FEI (Passport)</strong>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Bản scan có dấu mộc và sơ đồ nhận dạng xoáy lông</div>
                    </div>
                    <Upload showUploadList={false} beforeUpload={() => { message.success('Đã tải lên Hộ chiếu FEI'); return false; }}>
                      <Button icon={<UploadCloud size={14} />}>Tải tệp lên</Button>
                    </Upload>
                  </div>

                  <div
                    style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: 10,
                      padding: 16,
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>2. Sổ tiêm chủng vacxin</strong>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Đầy đủ mũi tiêm cúm ngựa (EI) và uốn ván trong 6 tháng</div>
                    </div>
                    <Upload showUploadList={false} beforeUpload={() => { message.success('Đã tải lên Sổ tiêm chủng'); return false; }}>
                      <Button icon={<UploadCloud size={14} />}>Tải tệp lên</Button>
                    </Upload>
                  </div>

                  <div
                    style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: 10,
                      padding: 16,
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>3. Giấy xét nghiệm EIA (Coggins Test)</strong>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Chứng nhận âm tính bệnh thiếu máu truyền nhiễm ngựa</div>
                    </div>
                    <Upload showUploadList={false} beforeUpload={() => { message.success('Đã tải lên Giấy xét nghiệm EIA'); return false; }}>
                      <Button icon={<UploadCloud size={14} />}>Tải tệp lên</Button>
                    </Upload>
                  </div>
                </div>
              )
            }
          ]}
        />
      </Modal>
    </div>
  );
}
