import { USER_ROLES } from './constants';

export const PERMISSIONS = {
  BOOKING_APPROVE: 'booking:approve',
  ROUTE_DISPATCH: 'route:dispatch',
  ROUTE_VIEW: 'route:view',
  SOS_MANAGE: 'sos:manage'
};

const ROLE_PERMISSIONS = {
  [USER_ROLES.LOGISTICS_MANAGER]: [
    'user:manage',
    'horse:manage_all',
    PERMISSIONS.BOOKING_APPROVE,
    PERMISSIONS.ROUTE_VIEW,
    PERMISSIONS.SOS_MANAGE,
    'audit:view',
    'analytics:view'
  ],
  [USER_ROLES.ROUTE_COORDINATOR]: [
    PERMISSIONS.ROUTE_VIEW,
    PERMISSIONS.ROUTE_DISPATCH,
    PERMISSIONS.SOS_MANAGE,
    'analytics:view'
  ]
};

export const hasPermission = (user, permission) =>
  Boolean(user?.role && ROLE_PERMISSIONS[user.role]?.includes(permission));

export const hasRole = (user, roles) => Boolean(user?.role && roles.includes(user.role));
