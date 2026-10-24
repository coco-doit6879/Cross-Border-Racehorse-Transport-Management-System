import AuthStory from '../../components/common/AuthStory';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { confirmPassword, ...userData } = form;
      await authApi.register(userData);
      navigate('/login', { replace: true, state: { registrationSuccess: true } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Không thể tạo tài khoản lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page register-page">
      <AuthStory />

      <section className="login-panel">
        <div className="login-content">
          <div style={{ marginBottom: 20 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              ← Về Trang chủ
            </Link>
          </div>
          <p className="eyebrow">CỔNG QUẢN LÝ VẬN CHUYỂN</p>
          <h2>Đăng ký tài khoản</h2>
          <p className="login-intro">Tạo tài khoản chủ ngựa để bắt đầu đặt chuyến và quản lý hồ sơ.</p>

          <form className="login-form register-form" onSubmit={handleSubmit}>
            <div className="register-fields">
              <div>
                <label htmlFor="fullName">Họ và tên <span>*</span></label>
                <input id="fullName" name="fullName" type="text" value={form.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" autoComplete="name" required />
              </div>
              <div>
                <label htmlFor="phone">Số điện thoại <span>*</span></label>
                <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Ví dụ: 090 123 4567" autoComplete="tel" required />
              </div>
            </div>

            <label htmlFor="email">Email <span>*</span></label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="example@gmail.com" autoComplete="email" required />

            <div style={{ marginTop: 16 }}>
              <label htmlFor="address" style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                Trang trại / Địa chỉ thường trú
              </label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="VD: Trang trại Tân Bình, TP. Hồ Chí Minh"
                onChange={handleChange}
              />
            </div>

            <div className="fixed-role" aria-label="Vai trò tài khoản" style={{ marginTop: 14 }}>
              <span>Loại tài khoản:</span>
              <strong style={{ color: '#2563eb' }}>Khách hàng (Chủ ngựa / CLB Đua)</strong>
            </div>

            <div className="register-fields" style={{ marginTop: 14 }}>
              <div>
                <label htmlFor="password">Mật khẩu <span>*</span></label>
                <input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••••••" autoComplete="new-password" minLength="8" required />
              </div>
              <div>
                <label htmlFor="confirmPassword">Xác nhận mật khẩu <span>*</span></label>
                <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••••••" autoComplete="new-password" minLength="8" required />
              </div>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="login-button" type="submit" disabled={isSubmitting} style={{ marginTop: 20 }}>
              {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
            </button>
          </form>

          <p className="login-note" style={{ marginTop: 20 }}>
            Đã có tài khoản? <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>Đăng nhập tại đây</Link>
          </p>
        </div>
      </section>

      <p className="page-caption">CBRT - 2026 / Shared / Dữ liệu minh họa</p>
    </main>
  );
};

export default Register;
