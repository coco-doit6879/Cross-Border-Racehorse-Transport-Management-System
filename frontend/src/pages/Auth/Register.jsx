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
      <section className="login-story" aria-label="Giới thiệu CBRT">
        <div className="story-top-row">
          <div className="story-brand">CBRT / EQUINE TRANSPORT</div>
          <div className="story-live-badge"><span className="pulse-dot"></span> LIVE TRACKING</div>
        </div>
        <div className="story-copy">
          <h1>An tâm cho ngựa.<br />Rõ ràng từng chặng.</h1>
          <p>Quản lý hồ sơ, vận chuyển và phúc lợi<br className="desktop-break" /> ngựa được xuyên biên giới.</p>
        </div>
        <div className="story-bottom-info">
          <div className="story-feature-chips">
            <span>🛡️ Kiểm dịch thông quan</span>
            <span>🛰️ Định vị GPS 24/7</span>
            <span>🐴 Phụ xe chuyên biệt</span>
          </div>
          <div className="story-footer">CROSS-BORDER RACEHORSE TRANSPORT</div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-content">
          <p className="eyebrow">Cổng quản lý vận chuyển</p>
          <h2>Đăng ký khách hàng</h2>
          <p className="login-intro">Tạo tài khoản để bắt đầu quản lý hành trình.</p>

          <form className="login-form register-form" onSubmit={handleSubmit}>
            <div className="register-fields">
              <div>
                <label htmlFor="fullName">Họ và tên <span>*</span></label>
                <input id="fullName" name="fullName" type="text" value={form.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" autoComplete="name" required />
              </div>
              <div>
                <label htmlFor="phone">Số điện thoại <span>*</span></label>
                <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="090 123 4567" autoComplete="tel" required />
              </div>
            </div>

            <label htmlFor="email">Email <span>*</span></label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="ten@congty.com" autoComplete="email" required />

            <div className="fixed-role" aria-label="Vai trò tài khoản">
              <span>Loại tài khoản</span>
              <strong>Khách hàng</strong>
            </div>

            <div className="register-fields">
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

            <button className="login-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="login-note">Đã có tài khoản? <Link to="/login">Đăng nhập tại đây</Link></p>
        </div>
      </section>

      <p className="page-caption">CBRT - 2026 / Shared / Dữ liệu minh họa</p>
    </main>
  );
};

export default Register;
