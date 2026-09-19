import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isManagerDemoEnabled } from '../config/managerDemo';
import { managerDemoService } from '../services/managerDemoService';

const ManagerDataContext = createContext(null);

export const ManagerDataProvider = ({ children }) => {
  const [data, setData] = useState(() => isManagerDemoEnabled ? managerDemoService.getData() : null);
  const [loading, setLoading] = useState(isManagerDemoEnabled);
  const [error] = useState(isManagerDemoEnabled ? '' : 'Các API quản lý nhân sự và phân công chưa có contract để tích hợp. Hãy bật chế độ demo trong môi trường development.');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!isManagerDemoEnabled) return undefined;
    setData(managerDemoService.getData());
    setLoading(false);
    return managerDemoService.subscribe(setData);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const execute = useCallback((action, successMessage) => {
    try {
      const result = action();
      setNotice({ tone: 'success', message: successMessage });
      return result;
    } catch (actionError) {
      setNotice({ tone: 'error', message: actionError.message || 'Không thể hoàn tất thao tác.' });
      throw actionError;
    }
  }, []);

  const value = useMemo(() => ({ data, loading, error, notice, setNotice, execute }), [data, loading, error, notice, execute]);
  return <ManagerDataContext.Provider value={value}>{children}</ManagerDataContext.Provider>;
};

export const useManagerData = () => {
  const context = useContext(ManagerDataContext);
  if (!context) throw new Error('useManagerData phải được dùng trong ManagerDataProvider.');
  return context;
};

