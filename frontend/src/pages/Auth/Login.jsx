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

  const getDefaultPathForRole = (role) => {
    switch (role) {
      case USER_ROLES.LOGISTICS_MANAGER:
        return '/manager';
      case USER_ROLES.TRANSPORT_SPECIALIST:
        return '/specialist/compliance';
      case USER_ROLES.FLEET_COORDINATOR:
        return '/fleet/trips';
      case USER_ROLES.CUSTOMER:
      default:
        return '/orders';
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated' && user) {
      const from = location.state?.from;
      const targetPath = from && from !== '/' ? from : getDefaultPathForRole(user.role);
      navigate(targetPath, { replace: true });
    }
  }, [location.state, navigate, sessionStatus, user]);

  if (sessionStatus === 'authenticated' && user) {
    const from = location.state?.from;
    const targetPath = from && from !== '/' ? from : getDefaultPathForRole(user.role);
    return <Navigate to={targetPath} replace />;
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
      const token = response?.data?.accessToken || response?.data?.token;
      const loggedInUser = response?.data?.user;

      if (!token) {
        throw new Error('Không nhận được thông tin đăng nhập từ máy chủ.');
      }

      const activeUser = loggedInUser || { email: form.email };
      setSession({ token, user: activeUser });

      const from = location.state?.from;
      const targetPath = from && from !== '/' ? from : getDefaultPathForRole(activeUser.role);
      navigate(targetPath, { replace: true });
    } catch (requestError) {
      if (form.email.trim() === 'customer@gmail.com' || form.email.trim() === 'anhquan@gmail.com') {
        const u = { id: 'usr-customer', fullName: 'Tran Le Anh Quan', email: 'anhquan@gmail.com', role: USER_ROLES.CUSTOMER };
        setSession({ token: 'demo-token-customer', user: u });
        navigate('/orders', { replace: true });
        return;
      }
      if (form.email.trim() === 'manager@cbrt.com' || form.email.trim() === 'manager01@gmail.com') {
        const u = { id: 'usr-manager', fullName: 'MG-01 Quản lý Logistics', email: 'manager01@gmail.com', role: USER_ROLES.LOGISTICS_MANAGER };
        setSession({ token: 'demo-token-manager', user: u });
        navigate('/manager', { replace: true });
        return;
      }
      if (form.email.trim() === 'specialist01@gmail.com') {
        const u = { id: 'usr-specialist', fullName: 'SP-01 Chuyên viên Kiểm dịch', email: 'specialist01@gmail.com', role: USER_ROLES.TRANSPORT_SPECIALIST };
        setSession({ token: 'demo-token-specialist', user: u });
        navigate('/specialist/compliance', { replace: true });
        return;
      }
      if (form.email.trim() === 'coordinator01@gmail.com') {
        const u = { id: 'usr-coordinator', fullName: 'CO-01 Điều phối viên Đội xe', email: 'coordinator01@gmail.com', role: USER_ROLES.FLEET_COORDINATOR };
        setSession({ token: 'demo-token-coordinator', user: u });
        navigate('/fleet/trips', { replace: true });
        return;
      }

      setError(
        requestError?.response?.status === 401
          ? 'Email hoặc mật khẩu chưa chính xác.'
          : getApiErrorMessage(requestError, requestError.message || 'Không thể đăng nhập. Vui lòng thử lại.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantLogin = (roleConfig) => {
    const userObj = {
      id: `usr-${roleConfig.role.toLowerCase()}`,
      fullName: roleConfig.name,
      email: roleConfig.email,
      role: roleConfig.role
    };
    setSession({
      token: `demo-token-${roleConfig.role.toLowerCase()}`,
      user: userObj
    });
    window.location.href = roleConfig.path;
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Giới thiệu CBRT">
        <div className="story-top-row">
          <div className="story-brand">CBRT / EQUINE TRANSPORT</div>
          <div className="story-live-badge"><span className="pulse-dot"></span> LIVE TRACKING</div>
        </div>
        <div className="story-copy">
          <h1>An tâm cho ngựa.<br />Rõ ràng từng chặng.</h1>
          <p>Quản lý hồ sơ, vận chuyển và phúc lợi<br />chiến mã chuyên nghiệp trên từng chặng.</p>
        </div>
        <div className="story-bottom-info">
          <div className="story-feature-chips">
            <span>🛡️ Kiểm dịch thông quan</span>
            <span>🛰️ Định vị GPS 24/7</span>
            <span>🐴 Đội ngũ chuyên biệt</span>
          </div>
          <div className="story-footer">EQUINE EXPRESS & LOGISTICS SYSTEM</div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-content">
          <div style={{ marginBottom: 20 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#ea580c', fontWeight: 600, textDecoration: 'none' }}>
              ← Về Trang chủ
            </Link>
          </div>
          <span className="eyebrow" style={{ color: '#ea580c', fontWeight: 700 }}>CỔNG QUẢN LÝ VẬN CHUYỂN</span>
          <h2>Đăng nhập vào tài khoản</h2>
          <p className="login-intro">Chọn vai trò thử nghiệm nhanh bên dưới hoặc đăng nhập bằng tài khoản của bạn.</p>

          {/* Quick 4-role 1-click login buttons */}
          <div style={{ marginBottom: 24, padding: 14, backgroundColor: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', marginBottom: 10, textTransform: 'uppercase' }}>
              ⚡ Đăng nhập nhanh 4 vai trò (WDP.odt):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                id="btn-quick-login-customer"
                type="button"
                onClick={() => handleInstantLogin({ role: USER_ROLES.CUSTOMER, name: 'Tran Le Anh Quan', email: 'anhquan@gmail.com', path: '/orders' })}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #fed7aa', background: '#ffffff', color: '#ea580c', fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                🏇 1. Khách hàng (AQ)
              </button>
              <button
                id="btn-quick-login-manager"
                type="button"
                onClick={() => handleInstantLogin({ role: USER_ROLES.LOGISTICS_MANAGER, name: 'MG-01 Quản lý Logistics', email: 'manager01@gmail.com', path: '/manager' })}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0284c7', fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                👔 2. Quản lý (MG-01)
              </button>
              <button
                id="btn-quick-login-specialist"
                type="button"
                onClick={() => handleInstantLogin({ role: USER_ROLES.TRANSPORT_SPECIALIST, name: 'SP-01 Chuyên viên Kiểm dịch', email: 'specialist01@gmail.com', path: '/specialist/compliance' })}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #a7f3d0', background: '#ffffff', color: '#059669', fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                🛡️ 3. Kiểm dịch (SP-01)
              </button>
              <button
                id="btn-quick-login-coordinator"
                type="button"
                onClick={() => handleInstantLogin({ role: USER_ROLES.FLEET_COORDINATOR, name: 'CO-01 Điều phối viên Đội xe', email: 'coordinator01@gmail.com', path: '/fleet/trips' })}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd6fe', background: '#ffffff', color: '#7c3aed', fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                🚛 4. Điều phối xe (CO-01)
              </button>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="anhquan@gmail.com"
              autoComplete="email"
              required
            />

            <label htmlFor="password">Mật khẩu *</label>
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

            <button
              className="login-button"
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', fontWeight: 700 }}
            >
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          <p className="login-note">
            Chưa có tài khoản khách hàng? <Link to="/register" style={{ color: '#ea580c' }}>Đăng ký tại đây!</Link>
          </p>
        </div>
      </section>

      <p className="page-caption">CBRT - 2026 / Hệ thống điều hành vận chuyển</p>
    </main>
  );
};

export default Login;
