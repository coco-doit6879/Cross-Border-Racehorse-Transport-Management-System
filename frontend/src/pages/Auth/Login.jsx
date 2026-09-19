import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  if (sessionStatus === 'error') {
    return <ErrorState title="Không thể kiểm tra phiên đăng nhập" message={profileError}
      onRetry={() => bootstrapSession({ force: true }).catch(() => {})} />;
  }

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Vui lòng nhập email.';
    if (!form.password) nextErrors.password = 'Vui lòng nhập mật khẩu.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await authApi.login({ email: form.email.trim(), password: form.password });
      const { token, user: loggedInUser } = response?.data || {};

      if (!token || !loggedInUser) {
        throw new Error('Máy chủ trả về phiên đăng nhập không hợp lệ.');
      }

      setSession({ token, user: loggedInUser });
      navigate(location.state?.from || (loggedInUser.role === USER_ROLES.LOGISTICS_MANAGER ? '/manager' : '/'), { replace: true });
    } catch (error) {
      setSubmitError(error?.response?.status === 401
        ? 'Email hoặc mật khẩu không đúng.'
        : getApiErrorMessage(error, 'Không thể đăng nhập. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-card__brand">CBRT</div>
      <span className="eyebrow">Cổng điều hành vận chuyển</span>
      <h1 id="login-title">Đăng nhập</h1>
      <p className="muted-text">Sử dụng tài khoản được cấp để truy cập hệ thống.</p>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <label>
          <span>Email</span>
          <input autoComplete="email" name="email" type="email" value={form.email} onChange={updateField}
            aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
          {errors.email ? <small id="email-error" className="field-error">{errors.email}</small> : null}
        </label>

        <label>
          <span>Mật khẩu</span>
          <input autoComplete="current-password" name="password" type="password" value={form.password}
            onChange={updateField} aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined} />
          {errors.password ? <small id="password-error" className="field-error">{errors.password}</small> : null}
        </label>

        {submitError ? <p className="inline-alert inline-alert--error" role="alert">{submitError}</p> : null}
        <button className="button button--primary button--full" type="submit" disabled={submitting}>
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </section>
  );
};

export default Login;
