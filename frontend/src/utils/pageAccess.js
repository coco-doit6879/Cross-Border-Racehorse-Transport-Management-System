import { USER_ROLES as R } from './constants.js';

const coordinators = [R.FLEET_COORDINATOR, R.ROUTE_COORDINATOR];
const operators = [R.LOGISTICS_MANAGER, R.TRANSPORT_SPECIALIST, ...coordinators];
const pages = [
  [/^\/manager\/schedules\/?$/, [R.FLEET_COORDINATOR]],
  [/^\/(?:manager\/)?revenue\/?$/, [R.LOGISTICS_MANAGER]],
  [/^\/manager\/(?:drivers|escorts|trips)(?:\/.*)?$/, [R.LOGISTICS_MANAGER]],
  [/^\/manager\/?$/, operators],
  [/^\/specialist(?:\/.*)?$/, [R.TRANSPORT_SPECIALIST, R.LOGISTICS_MANAGER]],
  [/^\/fleet(?:\/.*)?$/, [R.FLEET_COORDINATOR, R.ROUTE_COORDINATOR, R.LOGISTICS_MANAGER]],
  [/^\/horses(?:\/.*)?$/, [R.CUSTOMER, R.LOGISTICS_MANAGER, R.TRANSPORT_SPECIALIST, R.FLEET_COORDINATOR]],
  [/^\/dashboard\/?$/, [R.CUSTOMER, ...operators]],
  [/^\/overview\/?$/, [R.CUSTOMER, ...operators]],
  [/^\/orders\/create\/?$/, [R.CUSTOMER, R.LOGISTICS_MANAGER, R.TRANSPORT_SPECIALIST, R.FLEET_COORDINATOR]],
  [/^\/orders(?:\/.*)?$/, [R.CUSTOMER, ...operators]],
  [/^\/routes\/tracking\/?$/, [R.CUSTOMER, R.LOGISTICS_MANAGER, ...coordinators]],
  [/^\/incidents\/sos\/?$/, [R.LOGISTICS_MANAGER, ...coordinators]],
  [/^\/payments\/vnpay\/result\/?$/, [R.CUSTOMER]]
];

// Use the same role policy for navigation and direct URL access.
export const canAccessPage = (user, pathname) => {
  const rule = pages.find(([pattern]) => pattern.test(pathname));
  return !rule || rule[1].includes(user?.role);
};
