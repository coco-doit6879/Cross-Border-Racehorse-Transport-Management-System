import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const Login = () => {
  const navigate = useNavigate();
  const { setToken, switchRole } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onFinish = (values) => {
    setLoading(true);
    setTimeout(() => {
      setToken('demo_jwt_token_2026');
      if (values.email?.includes('manager')) {
        switchRole('LOGISTICS_MANAGER');
      } else {
        switchRole('CUSTOMER');
      }
      message.success('Đăng nhập thành công vào hệ thống CBRT!');
      navigate('/');
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
          maxWidth: 960,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          border: '1px solid #E5E7EB'
        }}
      >
        {/* Left Side: Brand Card (Forest Green #0F3E2E) */}
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

            <p style={{ color: '#D1E5DD', fontSize: 14, lineHeight: 1.6, maxWidth: 360 }}>
              Hệ thống quản lý và vận hành thông minh dành riêng cho ngựa đua xuyên biên giới. Giám sát
              hành trình GPS thời gian thực và bảo đảm phúc lợi tối ưu cho đàn ngựa của bạn.
            </p>
          </div>

          <div style={{ fontSize: 11, color: '#88B3A3' }}>
            CROSS-BORDER RACEHORSE TRANSPORTATION • CBRT-2026
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
              Chào mừng trở lại
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0 0' }}>
              Đăng nhập để tiếp tục công việc.
            </p>
          </div>

          <Form
            layout="vertical"
            initialValues={{ email: 'customer@cbrt.com', remember: true }}
            onFinish={onFinish}
          >
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Email *</span>}
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
                { type: 'email', message: 'Email không hợp lệ!' }
              ]}
            >
              <Input placeholder="name@company.com" size="large" />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Mật khẩu *</span>}
              name="password"
              initialValue="password123"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password placeholder="••••••••" size="large" />
            </Form.Item>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20
              }}
            >
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox style={{ fontSize: 13, color: '#4B5563' }}>Ghi nhớ đăng nhập</Checkbox>
              </Form.Item>
              <a href="#forgot" style={{ fontSize: 13, color: '#0F3E2E', fontWeight: 500 }}>
                Quên mật khẩu?
              </a>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                backgroundColor: '#0F3E2E',
                borderColor: '#0F3E2E',
                width: '100%',
                height: 44,
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8
              }}
            >
              Đăng nhập
            </Button>
          </Form>

          <div
            style={{
              marginTop: 24,
              padding: '12px 14px',
              backgroundColor: '#F9FAFB',
              borderRadius: 8,
              fontSize: 12,
              color: '#6B7280',
              lineHeight: 1.4,
              border: '1px solid #E5E7EB'
            }}
          >
            Tài khoản mẫu:
            <br />
            • Khách hàng / Chủ ngựa: <code>customer@cbrt.com</code>
            <br />• Quản lý điều hành: <code>manager@cbrt.com</code>
          </div>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: '#0F3E2E', fontWeight: 600 }}>
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
