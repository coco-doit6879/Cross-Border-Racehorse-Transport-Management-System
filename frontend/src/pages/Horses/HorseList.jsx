import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  Space,
  Popconfirm,
  message,
  Card
} from 'antd';
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';

const { Option } = Select;

const HorseList = () => {
  const navigate = useNavigate();
  const { horses, addHorse, deleteHorse } = useHorseStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBreed, setSelectedBreed] = useState('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Filter horses
  const filteredHorses = horses.filter((h) => {
    const matchQuery =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.microchipId.includes(searchQuery) ||
      (h.feiPassportNo && h.feiPassportNo.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchBreed = selectedBreed === 'ALL' || h.breed === selectedBreed;

    return matchQuery && matchBreed;
  });

  const handleCreateHorse = (values) => {
    const microchipRegex = /^\d{15}$/;
    if (!microchipRegex.test(values.microchipId)) {
      message.error('Mã vi mạch (Microchip ID) phải chứa chính xác 15 chữ số!');
      return;
    }

    addHorse(values);
    message.success(`Đã thêm mới hồ sơ ngựa "${values.name}" vào hệ thống!`);
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDelete = (id, name) => {
    deleteHorse(id);
    message.success(`Đã xóa hồ sơ ngựa "${name}".`);
  };

  const columns = [
    {
      title: 'Tên ngựa',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{text}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Chủ sở hữu: {record.ownerName || 'CLB Đua Sa Đéc'}</div>
        </div>
      )
    },
    {
      title: 'Mã vi mạch (15 chữ số ISO)',
      dataIndex: 'microchipId',
      key: 'microchipId',
      render: (text) => (
        <Tag
          color="geekblue"
          style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12, padding: '2px 8px' }}
        >
          {text}
        </Tag>
      )
    },
    {
      title: 'Số Hộ chiếu FEI',
      dataIndex: 'feiPassportNo',
      key: 'feiPassportNo',
      render: (text) => (
        <span style={{ fontWeight: 600, color: '#0F3E2E' }}>
          {text || <span style={{ color: '#9CA3AF' }}>Chưa cấp</span>}
        </span>
      )
    },
    {
      title: 'Giống',
      dataIndex: 'breed',
      key: 'breed'
    },
    {
      title: 'Tuổi / Cân nặng',
      key: 'age_weight',
      render: (_, record) => (
        <span style={{ fontSize: 13, color: '#374151' }}>
          {record.age} • {record.weight} kg
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'IN_TRANSIT') {
          return (
            <span
              style={{
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6
              }}
            >
              Đang vận chuyển
            </span>
          );
        }
        return (
          <span
            style={{
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Sẵn sàng
          </span>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<Eye size={13} />}
            onClick={() => navigate(`/horses/${record.id}`)}
            style={{
              backgroundColor: '#0F3E2E',
              borderColor: '#0F3E2E',
              color: '#FFFFFF',
              borderRadius: 6,
              fontWeight: 500
            }}
          >
            Hồ sơ & Giấy tờ
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Bạn có chắc chắn muốn xóa hồ sơ ngựa ${record.name}?`}
            onConfirm={() => handleDelete(record.id, record.name)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" icon={<Trash2 size={13} />} danger style={{ borderRadius: 6 }} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Title & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '20px 24px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
            Quản lý Hồ sơ & Đàn ngựa đua
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6B7280' }}>
            Danh mục lý lịch số hóa và hồ sơ hộ chiếu quốc tế (FEI Passports) của đàn ngựa.
          </p>
        </div>

        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setIsModalVisible(true)}
          style={{
            backgroundColor: '#0F3E2E',
            borderColor: '#0F3E2E',
            height: 40,
            padding: '0 20px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8
          }}
        >
          Thêm ngựa mới
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 10,
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16
        }}
      >
        <Input
          prefix={<Search size={15} color="#9CA3AF" />}
          placeholder="Tìm theo tên ngựa, mã chip 15 số, hoặc số FEI..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 420 }}
          allowClear
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Lọc theo giống:</span>
          <Select
            value={selectedBreed}
            onChange={setSelectedBreed}
            style={{ width: 180 }}
            options={[
              { value: 'ALL', label: 'Tất cả giống loài' },
              { value: 'Thoroughbred', label: 'Thoroughbred' },
              { value: 'Arabian', label: 'Arabian' },
              { value: 'Warmblood', label: 'Warmblood' },
              { value: 'Quarter Horse', label: 'Quarter Horse' }
            ]}
          />
        </div>
      </div>

      {/* Horse Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          overflow: 'hidden'
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredHorses}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </div>

      {/* Modal: Thêm Ngựa Mới */}
      <Modal
        title={
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0F3E2E' }}>
            Đăng ký hồ sơ ngựa đua mới
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Thêm hồ sơ"
        cancelText="Hủy bỏ"
        okButtonProps={{
          style: { backgroundColor: '#0F3E2E', borderColor: '#0F3E2E', borderRadius: 6 }
        }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateHorse} style={{ marginTop: 16 }}>
          <Form.Item
            label={<span style={{ fontWeight: 600, fontSize: 13 }}>Tên ngựa *</span>}
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên ngựa' }]}
          >
            <Input placeholder="Ví dụ: Red Comet" />
          </Form.Item>

          <Form.Item
            label={
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Mã vi mạch (Microchip ID) - Đúng 15 chữ số *
              </span>
            }
            name="microchipId"
            extra={
              <span style={{ fontSize: 11, color: '#6B7280' }}>
                Chuẩn quốc tế ISO 11784/11785 dùng quét chip cửa khẩu
              </span>
            }
            rules={[
              { required: true, message: 'Vui lòng nhập mã vi mạch' },
              { pattern: /^\d{15}$/, message: 'Mã vi mạch phải gồm đúng 15 chữ số' }
            ]}
          >
            <Input placeholder="104123456789099" maxLength={15} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Số hộ chiếu FEI</span>}
              name="feiPassportNo"
            >
              <Input placeholder="FEI-2026-XXXX" />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Giống loài *</span>}
              name="breed"
              rules={[{ required: true, message: 'Vui lòng chọn giống loài' }]}
            >
              <Select placeholder="Chọn giống">
                <Option value="Thoroughbred">Thoroughbred (Thuần chủng)</Option>
                <Option value="Arabian">Arabian</Option>
                <Option value="Warmblood">Warmblood</Option>
                <Option value="Quarter Horse">Quarter Horse</Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Tuổi *</span>}
              name="age"
              rules={[{ required: true, message: 'Nhập tuổi' }]}
            >
              <Input placeholder="4 năm" />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Cân nặng (kg) *</span>}
              name="weight"
              rules={[{ required: true, message: 'Nhập cân nặng' }]}
            >
              <Input placeholder="450" />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Giới tính</span>}
              name="gender"
              initialValue="STALLION"
            >
              <Select>
                <Option value="STALLION">Ngựa đực</Option>
                <Option value="MARE">Ngựa cái</Option>
                <Option value="GELDING">Ngựa thiến</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label={<span style={{ fontWeight: 600, fontSize: 13 }}>Tiền sử y tế & ghi chú chăm sóc</span>}
            name="medicalHistory"
          >
            <Input.TextArea rows={2} placeholder="Thông tin tiêm chủng hoặc thể trạng đặc biệt..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HorseList;
