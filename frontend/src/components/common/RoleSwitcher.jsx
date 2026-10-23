import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES } from '../../utils/constants';
import { wdpDemoService } from '../../services/wdpDemoService';
import { Button, Tooltip, message } from 'antd';
import { RefreshCw, Users, ShieldCheck, Truck, UserCheck, Sparkles } from 'lucide-react';

export default function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setSession } = useAuthStore();
  const [open, setOpen] = useState(false);

  const roles = [
    {
      role: USER_ROLES.CUSTOMER,
      label: 'Khách hàng',
      name: 'Trần Lê Anh Quân (AQ)',
      email: 'anhquan@gmail.com',
      icon: UserCheck,
      home: '/orders',
      color: '#ea580c'
    },
    {
      role: USER_ROLES.LOGISTICS_MANAGER,
      label: 'Quản lý',
      name: 'MG-01 Quản lý Logistics',
      email: 'manager01@gmail.com',
      icon: ShieldCheck,
      home: '/manager',
      color: '#0284c7'
    },
    {
      role: USER_ROLES.TRANSPORT_SPECIALIST,
      label: 'Kiểm dịch',
      name: 'SP-01 Chuyên viên Kiểm dịch',
      email: 'specialist01@gmail.com',
      icon: Users,
      home: '/specialist/compliance',
      color: '#059669'
    },
    {
      role: USER_ROLES.FLEET_COORDINATOR,
      label: 'Điều phối xe',
      name: 'CO-01 Điều phối viên Đội xe',
      email: 'coordinator01@gmail.com',
      icon: Truck,
      home: '/fleet/trips',
      color: '#7c3aed'
    }
  ];

  const handleSwitchRole = (target) => {
    const userObj = {
      id: `usr-${target.role.toLowerCase()}`,
      fullName: target.name,
      email: target.email,
      role: target.role
    };
    const token = `demo-token-${target.role.toLowerCase()}`;
    setSession({ token, user: userObj });
    window.location.href = target.home;
  };

  const handleResetFlow = () => {
    wdpDemoService.resetDemo();
    message.success('Đã đặt lại luồng mẫu BK-005 và hồ sơ ngựa về ban đầu.');
    window.location.reload();
  };

  const currentRoleObj = roles.find((r) => r.role === user?.role) || roles[0];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #e2e8f0',
        borderRadius: 30,
        padding: '6px 14px',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: currentRoleObj.color
          }}
        />
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{currentRoleObj.label}</span>
      </div>

      <div style={{ width: 1, height: 16, background: '#cbd5e1' }} />

      <div style={{ display: 'flex', gap: 4 }}>
        {roles.map((r) => {
          const isCurrent = user?.role === r.role;
          const Icon = r.icon;
          return (
            <Tooltip key={r.role} title={`Chuyển sang: ${r.label} (${r.name})`}>
              <button
                type="button"
                onClick={() => handleSwitchRole(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 16,
                  border: isCurrent ? `1.5px solid ${r.color}` : '1px solid transparent',
                  background: isCurrent ? `${r.color}15` : 'transparent',
                  color: isCurrent ? r.color : '#64748b',
                  fontSize: 11,
                  fontWeight: isCurrent ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={12} />
                <span>{r.label}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div style={{ width: 1, height: 16, background: '#cbd5e1' }} />

      <Tooltip title="Đặt lại toàn bộ dữ liệu mẫu luồng BK-005 (Reset Flow)">
        <button
          type="button"
          onClick={handleResetFlow}
          style={{
            border: 'none',
            background: 'none',
            padding: '4px 6px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ea580c')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <RefreshCw size={12} />
          <span>Reset</span>
        </button>
      </Tooltip>
    </div>
  );
}
