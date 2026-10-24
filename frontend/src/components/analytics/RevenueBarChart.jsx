import React, { useState } from 'react';
export const formatShortVnd = value => {
  const n = Number(value || 0);
  return Math.abs(n) >= 1e9 ? `${(n / 1e9).toLocaleString('vi-VN', {
    maximumFractionDigits: 1
  })} tỷ ₫` : Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString('vi-VN', {
    maximumFractionDigits: 1
  })} tr ₫` : `${n.toLocaleString('vi-VN')} ₫`;
};
const money = n => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;
export default function RevenueBarChart({
  monthlyData = [],
  orderData = []
}) {
  const [view, setView] = useState('months'),
    [mode, setMode] = useState('grouped');
  const labels = view === 'orders' ? ['Đã thu', 'Còn phải thu'] : ['Tiền đặt cọc', 'Khoản thu khác'];
  const rows = view === 'orders' ? orderData.slice(0, 5).map(o => ({
    key: o.orderId,
    label: o.bookingCode,
    a: Number(o.totalPaid || 0),
    b: Number(o.outstanding || 0)
  })) : monthlyData.slice(-4).map(m => ({
    key: m.month,
    label: m.month,
    a: Number(m.deposit || 0),
    b: Number(m.balance || 0)
  }));
  const max = Math.max(1, ...rows.map(r => mode === 'stacked' ? r.a + r.b : Math.max(r.a, r.b)));
  return <section className="finance-chart"><header><div><h2>Thu tiền & công nợ</h2><p>{view === 'orders' ? 'Tối đa 5 đơn trong báo cáo. Số đã thu bao gồm VNPAY và khoản thu được ghi nhận.' : 'Tiền thu qua giao dịch theo tháng, phân theo mục đích thanh toán.'}</p></div><div className="finance-chart-controls"><div role="group" aria-label="Dữ liệu biểu đồ"><button aria-pressed={view === 'orders'} onClick={() => setView('orders')}>Theo đơn</button><button aria-pressed={view === 'months'} onClick={() => setView('months')}>Theo tháng</button></div><div role="group" aria-label="Kiểu biểu đồ"><button aria-pressed={mode === 'grouped'} onClick={() => setMode('grouped')}>Cột kép</button><button aria-pressed={mode === 'stacked'} onClick={() => setMode('stacked')}>Cột chồng</button></div></div></header><div className="finance-chart-legend"><span><i />{labels[0]}</span><span><i />{labels[1]}</span></div>
 {rows.length ? <><div className="finance-bars" role="img" aria-label={`Biểu đồ ${labels.join(' và ')}. Số liệu đầy đủ trong bảng bên dưới.`}>{rows.map(r => <div className="finance-bar-column" key={r.key}><div className={`finance-bar-pair ${mode}`}><div className="finance-bar-a" style={{
              height: `${r.a / max * 100}%`
            }} title={`${labels[0]}: ${money(r.a)}`} /><div className="finance-bar-b" style={{
              height: `${r.b / max * 100}%`
            }} title={`${labels[1]}: ${money(r.b)}`} /></div><span>{r.label}</span><small>{formatShortVnd(r.a + r.b)}</small></div>)}</div><details className="finance-chart-data"><summary>Xem số liệu biểu đồ</summary><table><thead><tr><th>{view === 'orders' ? 'Đơn' : 'Tháng'}</th><th>{labels[0]}</th><th>{labels[1]}</th></tr></thead><tbody>{rows.map(r => <tr key={r.key}><td>{r.label}</td><td>{money(r.a)}</td><td>{money(r.b)}</td></tr>)}</tbody></table></details></> : <p className="finance-empty">Chưa có dữ liệu để biểu diễn.</p>}
 </section>;
}
