import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import { ErrorState, LoadingState } from '../../components/operations/PageFeedback';
import { useAuthStore } from '../../store/useAuthStore';
import { getApiErrorMessage } from '../../utils/apiResponse';
import { USER_ROLES } from '../../utils/constants';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const user = useAuthStore((state) => state.user);
  const profileError = useAuthStore((state) => state.profileError);
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);
  const setSession = useAuthStore((state) => state.setSession);

  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStatus === 'authenticated' && user) {
      navigate(location.state?.from || (user.role === USER_ROLES.LOGISTICS_MANAGER ? '/manager' : '/'), { replace: true });
    }
  }, [location.state, navigate, sessionStatus, user]);

  if (sessionStatus === 'authenticated' && user) {
    return <Navigate to={location.state?.from || (user.role === USER_ROLES.LOGISTICS_MANAGER ? '/manager' : '/')} replace />;
  }

  if (sessionStatus === 'idle' || sessionStatus === 'checking') {
    return <LoadingState label="Đang kiểm tra phiên đăng nhập…" />;
  }

  if (sessionStatus === 'error' && profileError) {
    return (
      <ErrorState
        title="Không thể kiểm tra phiên đăng nhập"
        message={profileError}
        onRetry={() => bootstrapSession({ force: true }).catch(() => {})}
      />
    );
  }

  const handleChange = (event) => {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authApi.login({ email: form.email.trim(), password: form.password });
      const { token, user: loggedInUser } = response?.data || {};

      if (!token) {
        throw new Error('Không nhận được thông tin đăng nhập từ máy chủ.');
      }

      const activeUser = loggedInUser || { email: form.email };
      setSession({ token, user: activeUser });

      const targetPath = location.state?.from || (activeUser.role === USER_ROLES.LOGISTICS_MANAGER ? '/manager' : '/');
      navigate(targetPath, { replace: true });
    } catch (requestError) {
      setError(
        requestError?.response?.status === 401
          ? 'Email hoặc mật khẩu chưa chính xác.'
          : getApiErrorMessage(requestError, requestError.message || 'Không thể đăng nhập. Vui lòng thử lại.')
      );
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
          <p className="eyebrow">Cổng điều hành vận chuyển</p>
          <h2>Chào mừng trở lại</h2>
          <p className="login-intro">Đăng nhập để tiếp tục công việc.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email <span>*</span></label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ten@congty.com"
              autoComplete="email"
              required
            />

            <label htmlFor="password">Mật khẩu <span>*</span></label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
            />

            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <Link to="/forgot-password">Quên mật khẩu?</Link>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="login-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          <p className="login-note">
            Tài khoản được cấp bởi đơn vị quản lý.<br />
            Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Đăng ký ngay</Link>
          </p>
        </div>
      </section>

      <p className="page-caption">CBRT - 2026 / Shared / Dữ liệu minh họa</p>
    </main>
  );
};

export default Login;
