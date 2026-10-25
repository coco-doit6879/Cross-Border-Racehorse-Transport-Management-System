import { USER_ROLES } from './constants.js';
import { canAccessPage } from './pageAccess.js';

export const getLoginRedirect = (user, from) => {
  const home = {
    [USER_ROLES.LOGISTICS_MANAGER]: '/manager',
    [USER_ROLES.TRANSPORT_SPECIALIST]: '/specialist/horses',
    [USER_ROLES.FLEET_COORDINATOR]: '/fleet/trips',
    [USER_ROLES.ROUTE_COORDINATOR]: '/fleet/trips'
  }[user?.role] || '/dashboard';

  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || /[\\\s]/.test(from)) return home;
  const pathname = from.split(/[?#]/)[0];
  if (['/login', '/register', '/forbidden'].includes(pathname.replace(/\/$/, ''))) return home;
  return canAccessPage(user, pathname) ? from : home;
};
