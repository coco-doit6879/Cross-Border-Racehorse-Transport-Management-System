import React from 'react';
import { ConfigProvider } from 'antd';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0F3E2E',
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
