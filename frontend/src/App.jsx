import React, { useEffect } from 'react';
import { ConfigProvider } from 'antd';
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#155b4d',
          borderRadius: 8,
          colorBgContainer: '#ffffff',
          colorBgLayout: '#F8F9FA',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        components: {
          Button: {
            controlHeight: 38,
            borderRadius: 8
          },
          Input: {
            controlHeight: 38,
            borderRadius: 8
          },
          Select: {
            controlHeight: 38,
            borderRadius: 8
          },
          Card: {
            borderRadiusLG: 12
          }
        }
      }}
    >
      <div className="app-container">
        <AppRoutes />
      </div>
    </ConfigProvider>
  );
}

export default App;
