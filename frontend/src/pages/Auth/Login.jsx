import PasswordField from '../../components/common/PasswordField';
import AuthStory from '../../components/common/AuthStory';
import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import { ErrorState, LoadingState } from '../../components/operations/PageFeedback';
import { useAuthStore } from '../../store/useAuthStore';
import { getApiErrorMessage } from '../../utils/apiResponse';
import { getLoginRedirect } from '../../utils/loginRedirect';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const user = useAuthStore((state) => state.user);
  const profileError = useAuthStore((state) => state.profileError);
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);
  const setSession = useAuthStore((state) => state.setSession);

  const [form, setForm] = useState({ email: '', password: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (sessionStatus === 'authenticated' && user) {
    return <Navigate to={getLoginRedirect(user, location.state?.from)} replace />;
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
    if (isSubmitting) return;
    if (!form.email.trim() || !form.password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authApi.login({ email: form.email.trim(), password: form.password });
      const token = response?.data?.accessToken || response?.data?.token;
      const loggedInUser = response?.data?.user;

      if (!token || !loggedInUser?.role) {
        throw new Error('Không nhận được thông tin đăng nhập từ máy chủ.');
      }

      const activeUser = loggedInUser;
      setSession({ token, user: activeUser });

      const targetPath = getLoginRedirect(activeUser, location.state?.from);
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
    <main className="login-page equine-auth-page">
      <AuthStory bright />

      <section className="login-panel">
        <div className="login-content">
          <span className="eyebrow">CHÀO MỪNG ĐẾN VỚI CBRT</span>
          <h2>Chào mừng trở lại</h2>
          <p className="login-intro">Đăng nhập để quản lý hồ sơ và hành trình của bạn.</p>

          {location.state?.registrationSuccess && (
            <p className="form-success" role="status">Tạo tài khoản khách hàng thành công. Bạn có thể đăng nhập ngay.</p>
          )}

          <form className="login-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ten@congty.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              readOnly={isSubmitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              required
            />

            <label htmlFor="password">Mật khẩu *</label>
            <PasswordField
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••••••"
              autoComplete="current-password"
              readOnly={isSubmitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              required
            />



            {error && <p id="login-error" className="form-error" role="alert">{error}</p>}

            <button className="login-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          <p className="login-note">
            Chưa có tài khoản khách hàng? <Link to="/register">Đăng ký tại đây</Link><br />
            Tài khoản nhân sự được cấp bởi đơn vị quản lý.
          </p>
        </div>
      </section>

      <p className="page-caption">CBRT - 2026 / Hệ thống điều hành vận chuyển</p>
    </main>
  );
};

export default Login;
