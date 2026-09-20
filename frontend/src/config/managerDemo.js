export const isManagerDemoEnabled =
  import.meta.env.DEV && String(import.meta.env.VITE_MANAGER_DEMO).toLowerCase() === 'true';

