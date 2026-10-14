import React, { useState } from 'react';
import { Card, Radio, Tooltip, Typography, Space } from 'antd';
import { BarChart3, TrendingUp, Layers, Columns, Package } from 'lucide-react';

const { Text, Title } = Typography;

export const formatShortVnd = (value) => {
  const num = Number(value || 0);
  if (num === 0) return '0 ₫';
  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ ₫';
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace('.0', '') + ' tr ₫';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(0) + ' k ₫';
  }
  return num.toLocaleString('vi-VN') + ' ₫';
};

const formatFullVnd = (val) => Number(val || 0).toLocaleString('vi-VN') + ' ₫';

const formatMonthLabel = (mStr) => {
  if (!mStr) return '';
  const parts = mStr.split('-');
  if (parts.length === 2) {
    return `T${parseInt(parts[1], 10)}/${parts[0].slice(2)}`;
  }
  return mStr;
};

export default function RevenueBarChart({ monthlyData = [], orderData = [] }) {
  const [viewType, setViewType] = useState('orders'); // 'orders' | 'months'
  const [chartMode, setChartMode] = useState('grouped'); // 'grouped' | 'stacked'
  const [hoveredKey, setHoveredKey] = useState(null);

  // Take the last 4 months
  const filteredMonths = React.useMemo(() => {
    if (!monthlyData.length) return [];
    return monthlyData.slice(-4);
  }, [monthlyData]);

  // Prepare chart items based on viewType
  const chartItems = React.useMemo(() => {
    if (viewType === 'orders') {
      return (orderData || []).slice(0, 5).map((ord) => {
        const cVal = Number(ord.contractValue || 0);
        const dep = ord.depositStatus === 'PAID' ? Math.round(cVal * 0.2) : 0;
        const bal = ord.paymentStatus === 'PAID' ? Math.max(0, (ord.totalPaid || 0) - dep) : 0;
        return {
          key: String(ord.orderId || ord.bookingCode),
          label: ord.bookingCode,
          subLabel: ord.customerName ? ord.customerName.split(' ')[0] : '',
          deposit: dep,
          balance: bal,
          outstanding: Number(ord.outstanding || 0),
          total: Number(ord.totalPaid || 0),
          contractValue: cVal
        };
      });
    } else {
      return filteredMonths.map((m) => ({
        key: m.month,
        label: formatMonthLabel(m.month),
        subLabel: m.month,
        deposit: Number(m.deposit || 0),
        balance: Number(m.balance || 0),
        outstanding: 0,
        total: Number(m.total || 0),
        contractValue: Number(m.total || 0)
      }));
    }
  }, [viewType, orderData, filteredMonths]);

  // Find max value to calibrate Y-axis scale
  const maxVal = Math.max(
    ...chartItems.map((item) => {
      if (chartMode === 'stacked') {
        return (item.deposit || 0) + (item.balance || 0);
      }
      return Math.max(item.deposit || 0, item.balance || 0, item.outstanding || 0, item.contractValue || 0);
    }),
    12_000_000
  );

  const niceMax = Math.ceil(maxVal / 4_000_000) * 4_000_000;
  const gridSteps = [niceMax, niceMax * 0.75, niceMax * 0.5, niceMax * 0.25, 0];

  const totalAllRevenue = chartItems.reduce((acc, cur) => acc + Number(cur.total || 0), 0);
  const totalDeposit = chartItems.reduce((acc, cur) => acc + Number(cur.deposit || 0), 0);
  const totalBalance = chartItems.reduce((acc, cur) => acc + Number(cur.balance || 0), 0);

  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: 12,
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        background: '#ffffff',
        marginBottom: 24
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#EBF5F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F3E2E'
            }}
          >
            <BarChart3 size={20} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#103C32', fontSize: 17, fontWeight: 700 }}>
              Biểu Đồ Cột Doanh Thu & Thu Tiền Trực Quan
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              So sánh trực quan tỷ lệ tiền cọc (20%), thanh toán đủ (80%) và công nợ
            </Text>
          </div>
        </div>

        {/* View Mode Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Radio.Group
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="orders">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Package size={13} /> Theo Đơn Hàng
              </span>
            </Radio.Button>
            <Radio.Button value="months">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={13} /> Theo Tháng
              </span>
            </Radio.Button>
          </Radio.Group>

          <Radio.Group
            value={chartMode}
            onChange={(e) => setChartMode(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="grouped">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Columns size={13} /> Cột kép
              </span>
            </Radio.Button>
            <Radio.Button value="stacked">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Layers size={13} /> Cột chồng
              </span>
            </Radio.Button>
          </Radio.Group>
        </div>
      </div>

      {/* Legend & Quick metrics summary */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: '10px 16px',
          background: '#F8FAF9',
          borderRadius: 8,
          marginBottom: 20,
          border: '1px solid #EBF1EE'
        }}
      >
        <Space size="large" wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: '#2563EB',
                display: 'inline-block'
              }}
            />
            <Text style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
              Tiền Đặt Cọc (20%): <strong>{formatShortVnd(totalDeposit)}</strong>
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: '#0F3E2E',
                display: 'inline-block'
              }}
            />
            <Text style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
              Thanh Toán Nốt (80%): <strong>{formatShortVnd(totalBalance)}</strong>
            </Text>
          </div>

          {viewType === 'orders' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: '#F59E0B',
                  display: 'inline-block'
                }}
              />
              <Text style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                Công Nợ Còn Thiếu
              </Text>
            </div>
          )}
        </Space>

        <div style={{ fontSize: 12, color: '#64748B' }}>
          Đơn vị: <strong>Triệu đồng (tr ₫)</strong> · Rê chuột vào cột để xem chi tiết
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div
        style={{
          position: 'relative',
          height: 290,
          paddingLeft: 60,
          paddingBottom: 42,
          boxSizing: 'border-box'
        }}
      >
        {/* Y-axis grid lines and labels */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 42,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pointerEvents: 'none'
          }}
        >
          {gridSteps.map((stepVal, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                borderBottom: '1px dashed #E2E8F0',
                position: 'relative'
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: -9,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#94A3B8',
                  background: '#ffffff',
                  paddingRight: 6
                }}
              >
                {formatShortVnd(stepVal)}
              </span>
            </div>
          ))}
        </div>

        {/* Bars Container */}
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-around',
            position: 'relative',
            zIndex: 1
          }}
        >
          {chartItems.map((item) => {
            const deposit = Number(item.deposit || 0);
            const balance = Number(item.balance || 0);
            const outstanding = Number(item.outstanding || 0);

            const depositPct = Math.min(100, (deposit / niceMax) * 100);
            const balancePct = Math.min(100, (balance / niceMax) * 100);
            const outstandingPct = Math.min(100, (outstanding / niceMax) * 100);
            const totalPct = Math.min(100, ((deposit + balance) / niceMax) * 100);

            const isHovered = hoveredKey === item.key;

            const tooltipContent = (
              <div style={{ padding: 4 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 2 }}>
                  {viewType === 'orders' ? `Vận đơn: ${item.label}` : `Kỳ: ${item.label}`}
                </div>
                <div>🔹 Đặt cọc (20%): <strong>{formatFullVnd(deposit)}</strong></div>
                <div>🔸 Thanh toán đủ (80%): <strong>{formatFullVnd(balance)}</strong></div>
                {outstanding > 0 && (
                  <div style={{ color: '#FCD34D' }}>
                    ⏳ Còn thiếu: <strong>{formatFullVnd(outstanding)}</strong>
                  </div>
                )}
                <div style={{ fontWeight: 600, marginTop: 4, color: '#A3D4C0', borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: 2 }}>
                  💰 Thực thu: {formatFullVnd(deposit + balance)}
                </div>
              </div>
            );

            return (
              <Tooltip key={item.key} title={tooltipContent} placement="top" arrow>
                <div
                  onMouseEnter={() => setHoveredKey(item.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    flex: 1,
                    maxWidth: 120,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '0 6px',
                    position: 'relative',
                    transition: 'transform 0.2s',
                    transform: isHovered ? 'scale(1.03)' : 'scale(1)'
                  }}
                >
                  {/* Top value badge */}
                  <div
                    style={{
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: isHovered ? '#0F3E2E' : '#475569',
                      whiteSpace: 'nowrap',
                      marginBottom: 4
                    }}
                  >
                    {deposit + balance > 0 ? formatShortVnd(deposit + balance) : ''}
                  </div>

                  {/* Bars Area */}
                  <div
                    style={{
                      width: '100%',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center'
                    }}
                  >
                    {/* Grouped Bars Mode */}
                    {chartMode === 'grouped' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          gap: 6,
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        {/* Deposit Bar */}
                        <div
                          style={{
                            width: viewType === 'orders' ? 22 : 28,
                            height: `${depositPct}%`,
                            minHeight: deposit > 0 ? 8 : 2,
                            background: deposit > 0 ? '#2563EB' : '#F1F5F9',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.4s ease'
                          }}
                        />
                        {/* Balance Bar */}
                        <div
                          style={{
                            width: viewType === 'orders' ? 22 : 28,
                            height: `${balancePct}%`,
                            minHeight: balance > 0 ? 8 : 2,
                            background: balance > 0 ? '#0F3E2E' : '#F1F5F9',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.4s ease'
                          }}
                        />
                        {/* Outstanding Bar (Orders view only) */}
                        {viewType === 'orders' && (
                          <div
                            style={{
                              width: 22,
                              height: `${outstandingPct}%`,
                              minHeight: outstanding > 0 ? 8 : 2,
                              background: outstanding > 0 ? '#F59E0B' : '#F1F5F9',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.4s ease'
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Stacked Bars Mode */}
                    {chartMode === 'stacked' && (
                      <div
                        style={{
                          width: 44,
                          height: `${totalPct}%`,
                          minHeight: deposit + balance > 0 ? 8 : 2,
                          display: 'flex',
                          flexDirection: 'column-reverse',
                          borderRadius: '5px 5px 0 0',
                          overflow: 'hidden',
                          background: deposit + balance > 0 ? 'transparent' : '#F1F5F9'
                        }}
                      >
                        <div
                          style={{
                            height:
                              deposit + balance > 0
                                ? `${(deposit / (deposit + balance)) * 100}%`
                                : '0%',
                            background: '#2563EB',
                            width: '100%'
                          }}
                        />
                        <div
                          style={{
                            height:
                              deposit + balance > 0
                                ? `${(balance / (deposit + balance)) * 100}%`
                                : '0%',
                            background: '#0F3E2E',
                            width: '100%'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* X-axis Label below bar */}
                  <div
                    style={{
                      height: 36,
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTop: '2px solid #E2E8F0',
                      marginTop: 4
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isHovered ? '#0F3E2E' : '#334155'
                      }}
                    >
                      {item.label}
                    </span>
                    {item.subLabel && (
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>{item.subLabel}</span>
                    )}
                  </div>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
