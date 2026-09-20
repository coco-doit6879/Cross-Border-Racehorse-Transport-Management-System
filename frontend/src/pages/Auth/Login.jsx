import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import { useAuthStore } from '../../store/useAuthStore';

const Login = () => {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await authApi.login(form);
      const token = response.data?.token || response.data?.accessToken;

      if (!token) {
        throw new Error('Không nhận được thông tin đăng nhập.');
      }

      setToken(token);
      navigate('/');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Email hoặc mật khẩu chưa chính xác.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Giới thiệu CBRT">
        <div className="story-brand">CBRT / EQUINE TRANSPORT</div>
        <div className="story-copy">
          <h1>An tâm cho ngựa.<br />Rõ ràng từng chặng.</h1>
          <p>Quản lý hồ sơ, vận chuyển và phúc lợi<br className="desktop-break" /> ngựa được xuyên biên giới.</p>
        </div>
        <div className="story-footer">CROSS-BORDER RACEHORSE TRANSPORT</div>
      </section>

      <section className="login-panel">
        <div className="login-content">
          <p className="eyebrow">Cổng quản lý vận chuyển</p>
          <h2>Chào mừng trở lại</h2>
          <p className="login-intro">Đăng nhập để tiếp tục công việc.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email <span>*</span></label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="ten@congty.com" autoComplete="email" required />

            <label htmlFor="password">Mật khẩu <span>*</span></label>
            <input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••••••" autoComplete="current-password" required />

            <div className="login-options">
              <label className="remember-option">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <Link to="/forgot-password">Quên mật khẩu?</Link>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="login-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="login-note">Tài khoản được cấp bởi đơn vị quản lý.<br />Liên hệ quản trị viên nếu chưa có tài khoản.</p>
        </div>
      </section>

      <p className="page-caption">CBRT - 2026 / Shared / Dữ liệu minh họa</p>
    </main>
  );
};

export default Login;
