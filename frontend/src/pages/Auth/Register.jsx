import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Select, message, Alert } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';

const { Option } = Select;

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = (values) => {
    setLoading(true);
    setTimeout(() => {
      message.success('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
      navigate('/login');
      setLoading(false);
    }, 400);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1040,
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E5E7EB'
        }}
      >
        {/* Left Side: Brand Card (Forest Green) */}
        <div
          style={{
            backgroundColor: '#0F3E2E',
            color: '#FFFFFF',
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: '#FFFFFF',
                  color: '#0F3E2E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 14
                }}
              >
                C
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.5 }}>CBRT</span>
              <span style={{ opacity: 0.5, margin: '0 4px' }}>/</span>
              <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: 1 }}>EQUINE TRANSPORT</span>
            </div>

            <h1
              style={{
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.3,
                marginBottom: 16
              }}
            >
              An tâm cho ngựa.
              <br />
              Rõ ràng từng chặng.
            </h1>

            <p style={{ color: '#D1E5DD', fontSize: 14, lineHeight: 1.6 }}>
              Hệ thống quản lý và vận hành thông minh dành riêng cho ngựa đua xuyên biên giới.
            </p>
          </div>

          <div style={{ fontSize: 11, color: '#88B3A3' }}>
            CROSS-BORDER RACEHORSE TRANSPORTATION • CBRT-2026
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
              Đăng ký tài khoản mới
            </h2>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0' }}>
              Vui lòng điền đầy đủ các thông tin dưới đây để đăng ký tham gia hệ thống vận chuyển CBRT.
            </p>
          </div>

          {/* Yellow Alert Box from Figma */}
          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: '#92400E',
              marginBottom: 18
            }}
          >
            Mỗi tài khoản mới sẽ được Ban quản trị duyệt trước khi kích hoạt chính thức.
          </div>

          <Form layout="vertical" onFinish={onFinish}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 12 }}>Họ và tên người đại diện *</span>}
                name="fullName"
                rules={[{ required: true, message: 'Nhập họ tên' }]}
              >
                <Input placeholder="Nguyễn Văn An" />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 12 }}>Email công việc *</span>}
                name="email"
                rules={[
                  { required: true, message: 'Nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' }
                ]}
              >
                <Input placeholder="an.nguyen@example.com" />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 12 }}>Tên cá nhân / Trang trại *</span>}
                name="clubName"
                rules={[{ required: true, message: 'Nhập tên trang trại / CLB' }]}
              >
                <Input placeholder="Trang trại Sa Đéc Miền Tây" />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 12 }}>Vai trò mong muốn *</span>}
                name="role"
                initialValue="CUSTOMER"
                rules={[{ required: true, message: 'Chọn vai trò' }]}
              >
                <Select>
                  <Option value="CUSTOMER">Chủ ngựa / CLB đua (Customer)</Option>
                  <Option value="LOGISTICS_MANAGER">Quản lý điều hành (Manager)</Option>
                  <Option value="DRIVER">Tài xế / Chuyên viên hộ tống</Option>
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 12 }}>Mật khẩu mới *</span>}
                name="password"
                rules={[{ required: true, message: 'Nhập mật khẩu' }]}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 12 }}>Xác nhận mật khẩu *</span>}
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                    }
                  })
                ]}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
            </div>

            <Form.Item
              name="agreement"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(new Error('Vui lòng đồng ý với điều khoản'))
                }
              ]}
            >
              <Checkbox style={{ fontSize: 12, color: '#4B5563' }}>
                Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của CBRT.
              </Checkbox>
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                backgroundColor: '#0F3E2E',
                borderColor: '#0F3E2E',
                width: '100%',
                height: 42,
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8
              }}
            >
              Đăng ký tài khoản →
            </Button>
          </Form>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: '#0F3E2E', fontWeight: 600 }}>
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
