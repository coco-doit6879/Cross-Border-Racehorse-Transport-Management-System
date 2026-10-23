import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Modal,
  Space,
  Table,
  Tag,
  Tabs,
  message
} from 'antd';
import {
  ShieldCheck,
  FileCheck2,
  AlertCircle,
  FileText,
  Eye,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { wdpDemoService } from '../../services/wdpDemoService';

export default function ComplianceQueue() {
  const [params, setParams] = useSearchParams();
  const selectedOrderId = params.get('orderId');

  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | ADDITIONAL | APPROVED
  const [orders, setOrders] = useState([]);
  const [verifiedMap, setVerifiedMap] = useState({});
  const [documentConfirmed, setDocumentConfirmed] = useState(false);
  const [previewDocModal, setPreviewDocModal] = useState(null);

  const loadData = () => {
    const list = wdpDemoService.getOrders();
    setOrders(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingOrders = orders.filter(
    (o) => o.status === 'DOCS_PROCESSING' || (o.orderCode === 'BK-005' && !o.specialistVerified && o.status !== 'PENDING_APPROVAL')
  );
  const approvedOrders = orders.filter((o) => o.specialistVerified || o.status === 'DOCS_VERIFIED' || o.status === 'PRICE_REVIEW' || o.status === 'APPROVED');
  const additionalOrders = [];

  const selectedOrder = orders.find(
    (o) => o._id === selectedOrderId || o.id === selectedOrderId || o.orderCode === selectedOrderId || (selectedOrderId === 'BK-005' && o.orderCode === 'BK-005')
  );

  const handleApproveHorseDocs = () => {
    if (!documentConfirmed) {
      message.warning('Vui lòng đánh dấu xác nhận đã đối chiếu hồ sơ gốc.');
      return;
    }

    wdpDemoService.specialistVerifyBK005();
    message.success('Đã duyệt hồ sơ ngựa BK-005 thành công! Đơn đã chuyển sang bộ phận Điều phối xe.');
    setParams({});
    setDocumentConfirmed(false);
    loadData();
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '22px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
              Thủ tục & Kiểm dịch động vật
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Duyệt hồ sơ ngựa
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Đối chiếu thông tin nhận dạng, hộ chiếu FEI và lịch tiêm chủng trước khi xác nhận an toàn vận chuyển.
          </p>
        </div>

        <Space>
          <Button onClick={loadData}>Làm mới</Button>
        </Space>
      </div>

      {!selectedOrder ? (
        /* MAIN QUEUE VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tabs: Cần duyệt, Chờ bổ sung, Đã duyệt */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '12px 20px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              style={{
                padding: '6px 18px',
                borderRadius: 20,
                border: activeTab === 'PENDING' ? '1px solid #ea580c' : '1px solid #e2e8f0',
                background: activeTab === 'PENDING' ? '#ea580c' : '#ffffff',
                color: activeTab === 'PENDING' ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Cần duyệt ({pendingOrders.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ADDITIONAL')}
              style={{
                padding: '6px 18px',
                borderRadius: 20,
                border: activeTab === 'ADDITIONAL' ? '1px solid #ea580c' : '1px solid #e2e8f0',
                background: activeTab === 'ADDITIONAL' ? '#ea580c' : '#ffffff',
                color: activeTab === 'ADDITIONAL' ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Chờ khách bổ sung (0)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('APPROVED')}
              style={{
                padding: '6px 18px',
                borderRadius: 20,
                border: activeTab === 'APPROVED' ? '1px solid #ea580c' : '1px solid #e2e8f0',
                background: activeTab === 'APPROVED' ? '#ea580c' : '#ffffff',
                color: activeTab === 'APPROVED' ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Đã duyệt ({approvedOrders.length})
            </button>
          </div>

          {/* Orders Table */}
          <Card style={{ borderRadius: 14 }}>
            {activeTab === 'PENDING' ? (
              pendingOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <CheckCircle2 size={40} color="#059669" style={{ margin: '0 auto 12px' }} />
                  <strong>Không còn hồ sơ nào cần duyệt</strong>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Tất cả hồ sơ ngựa đã được kiểm tra đạt chuẩn.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {pendingOrders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '18px 22px',
                        border: '1.5px solid #fed7aa',
                        backgroundColor: '#fff7ed',
                        borderRadius: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: '#ffedd5',
                            color: '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 16
                          }}
                        >
                          BK
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 16, color: '#0f172a' }}>{ord.orderCode}</strong>
                            <Tag color="orange">CẦN THẨM ĐỊNH</Tag>
                          </div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                            Khách hàng: <strong>{ord.customerName}</strong> · Ngựa: <strong style={{ color: '#ea580c' }}>{ord.horses?.join(', ')}</strong>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            Hành trình: {ord.routeLabel} · Khởi hành: {ord.departureTime} ({ord.departureDate})
                          </div>
                        </div>
                      </div>

                      <Button
                        type="primary"
                        onClick={() => setParams({ orderId: ord.orderCode || ord.id })}
                        style={{
                          height: 40,
                          padding: '0 20px',
                          borderRadius: 8,
                          backgroundColor: '#ea580c',
                          borderColor: '#ea580c',
                          fontWeight: 700
                        }}
                      >
                        Thẩm định hồ sơ
                      </Button>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === 'APPROVED' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {approvedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <div>
                      <strong>{ord.orderCode}</strong> · {ord.customerName} · Ngựa: {ord.horses?.join(', ')}
                      <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>✓ Hồ sơ kiểm dịch đã được thẩm định hợp lệ</div>
                    </div>
                    <Tag color="green">ĐÃ DUYỆT</Tag>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                Không có đơn yêu cầu bổ sung
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* DETAIL VERIFICATION VIEW (Đối chiếu hồ sơ 1 ngựa) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <button
            type="button"
            onClick={() => setParams({})}
            style={{
              border: 'none',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Quay lại danh sách hồ sơ cần duyệt
          </button>

          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>
                  Đối chiếu hồ sơ kiểm dịch · Đơn {selectedOrder.orderCode}
                </span>
                <Tag color="orange">1 cá thể ngựa</Tag>
              </div>
            }
            style={{ borderRadius: 14 }}
          >
            {/* Horse Details Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                backgroundColor: '#f8fafc',
                padding: '18px 22px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                marginBottom: 24
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: '#fed7aa',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26
                }}
              >
                🏇
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  Storm Runner (Ngựa đua thuần chủng)
                </h3>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>
                  Mã vi chip: <strong style={{ fontFamily: 'monospace' }}>985141005544332</strong> · Hộ chiếu FEI: <strong style={{ color: '#ea580c' }}>VN-982367</strong>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Chủ sở hữu: <strong>Tran Le Anh Quan</strong> · Cân nặng: 500 kg · Tuổi: 6 năm
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
              Danh mục 3 chứng từ gốc cần thẩm định:
            </h4>

            {/* 3 Document Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {/* Doc 1 */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <FileText size={28} color="#ea580c" />
                  <div>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>
                      1. Hộ chiếu FEI chính thức (FEI Passport)
                    </strong>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Số hiệu VN-982367 · Có dấu mộc Hiệp hội Thể thao Ngựa và sơ đồ xoáy lông nhận dạng.
                    </div>
                  </div>
                </div>

                <Button
                  icon={<Eye size={14} />}
                  onClick={() =>
                    setPreviewDocModal({
                      title: 'Hộ chiếu FEI · Storm Runner (VN-982367)',
                      desc: 'Bản scan gốc đối chiếu: Trùng khớp mã chip 985141005544332, màu lông Hạt dẻ (Chestnut), 4 vệt xoáy trán.'
                    })
                  }
                >
                  Xem chứng từ
                </Button>
              </div>

              {/* Doc 2 */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <FileText size={28} color="#059669" />
                  <div>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>
                      2. Sổ tiêm chủng vắc-xin thú y
                    </strong>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Tiêm phòng Cúm ngựa (Equine Influenza) và Uốn ván ngày 10/06/2026. Còn hiệu lực bảo hộ.
                    </div>
                  </div>
                </div>

                <Button
                  icon={<Eye size={14} />}
                  onClick={() =>
                    setPreviewDocModal({
                      title: 'Sổ tiêm chủng thú y · Storm Runner',
                      desc: 'Bản scan sổ tiêm: Đầy đủ chữ ký bác sĩ thú y chỉ định, hạn miễn dịch đến tháng 12/2026.'
                    })
                  }
                >
                  Xem chứng từ
                </Button>
              </div>

              {/* Doc 3 */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <FileText size={28} color="#0284c7" />
                  <div>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>
                      3. Giấy xét nghiệm EIA (Coggins Test)
                    </strong>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Kết quả: ÂM TÍNH (Negative) với bệnh thiếu máu truyền nhiễm ngựa do Viện Thú y Trung Ương cấp.
                    </div>
                  </div>
                </div>

                <Button
                  icon={<Eye size={14} />}
                  onClick={() =>
                    setPreviewDocModal({
                      title: 'Chứng nhận xét nghiệm Coggins EIA · Storm Runner',
                      desc: 'Phiếu kết quả xét nghiệm huyết thanh: Âm tính với vi rút EIAV, cấp ngày 15/09/2026.'
                    })
                  }
                >
                  Xem chứng từ
                </Button>
              </div>
            </div>

            <Divider style={{ margin: '20px 0' }} />

            {/* Checkbox verification */}
            <div style={{ marginBottom: 20 }}>
              <Checkbox
                checked={documentConfirmed}
                onChange={(e) => setDocumentConfirmed(e.target.checked)}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  Tôi xác nhận đã đối chiếu đầy đủ thông tin nhận dạng vi chip và 3 chứng từ gốc hợp lệ, đạt tiêu chuẩn kiểm dịch vận chuyển.
                </span>
              </Checkbox>
            </div>

            {/* Approval Action Button */}
            <Button
              type="primary"
              size="large"
              disabled={!documentConfirmed}
              onClick={handleApproveHorseDocs}
              style={{
                height: 46,
                padding: '0 32px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 8,
                backgroundColor: '#059669',
                borderColor: '#059669'
              }}
            >
              ✓ Duyệt hồ sơ ngựa BK-005
            </Button>
          </Card>
        </div>
      )}

      {/* Document Preview Modal */}
      <Modal
        centered
        open={Boolean(previewDocModal)}
        onCancel={() => setPreviewDocModal(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setPreviewDocModal(null)} style={{ backgroundColor: '#ea580c' }}>
            Đã kiểm tra chứng từ
          </Button>
        ]}
      >
        <div style={{ padding: '10px 4px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            {previewDocModal?.title}
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            {previewDocModal?.desc}
          </p>
          <div
            style={{
              height: 220,
              backgroundColor: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8'
            }}
          >
            <FileCheck2 size={48} color="#059669" />
            <span style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#334155' }}>
              Chứng nhận số hóa bảo mật · Hợp lệ kiểm dịch
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
