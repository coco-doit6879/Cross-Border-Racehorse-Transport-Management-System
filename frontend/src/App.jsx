import React, { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useAuthStore } from './store/useAuthStore';
import { isManagerDemoEnabled } from './config/managerDemo';

function App() {
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);

  useEffect(() => {
    if (isManagerDemoEnabled) return undefined;
    bootstrapSession().catch(() => {
      // The store keeps the recoverable profile error for the route guard.
    });
    return undefined;
  }, [bootstrapSession]);

  return (
    <div className="app-container">
      <AppRoutes />
    </div>
  );
}

export default App;
