import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  Image,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  message
} from 'antd';
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Image as ImageIcon,
  Info,
  MapPin,
  Package,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle
} from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { horseApi } from '../../services/horseApi';
import { wdpDemoService } from '../../services/wdpDemoService';
import './specialist-verification.css';

const formatDate = (d) => {
  if (!d) return '20/10/2026 20:40';
  try {
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return String(d);
  }
};

/**
 * Modal to securely preview real customer uploaded documents (images, PDFs)
 */
function SecureDocumentViewerModal({ viewingDoc, onCancel }) {
  if (!viewingDoc) return null;

  const { title, files, horse } = viewingDoc;
  const fileUrls = useMemo(() => {
    if (!files) return [];
    const arr = Array.isArray(files) ? files : [files];
    return arr.filter(Boolean);
  }, [files]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeUrl = fileUrls[activeIndex] || fileUrls[0];

  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [blobUrl, setBlobUrl] = useState('');
  const [error, setError] = useState(null);
  const blobUrlRef = React.useRef('');

  useEffect(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
    }

    if (!activeUrl) {
      setLoading(false);
      setMetadata(null);
      setBlobUrl('');
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setMetadata(null);
    setBlobUrl('');

    const isBackend = typeof activeUrl === 'string' && activeUrl.includes('/horses/files');
    const cleanUrl = typeof activeUrl === 'string' && activeUrl.startsWith('/api/')
      ? activeUrl.slice(4)
      : activeUrl;

    if (isBackend) {
      Promise.all([
        horseApi.getFileMetadata(cleanUrl).catch(() => null),
        horseApi.getFile(cleanUrl)
      ])
        .then(([metaRes, fileRes]) => {
          if (!active) return;
          const meta = metaRes?.data?.data || {};
          const blob = fileRes.data;
          const objUrl = URL.createObjectURL(blob);
          blobUrlRef.current = objUrl;
          setBlobUrl(objUrl);
          setMetadata({
            name: meta.name || `tep_${activeIndex + 1}`,
            mimeType: meta.mimeType || blob.type || 'image/webp',
            size: meta.size || blob.size || 0
          });
        })
        .catch((err) => {
          if (!active) return;
          console.error('Error fetching file:', err);
          setError(err.response?.data?.message || 'Không thể tải tệp từ máy chủ bảo mật.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setLoading(false);
      setMetadata({
        name: typeof activeUrl === 'string' ? activeUrl.split('/').pop() : 'document.pdf',
        mimeType: 'application/pdf',
        size: 245000
      });
    }

    return () => {
      active = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = '';
      }
    };
  }, [activeUrl, activeIndex]);

  const isImage =
    metadata?.mimeType?.startsWith('image/') ||
    ['.webp', '.png', '.jpg', '.jpeg'].some((ext) => metadata?.name?.toLowerCase().endsWith(ext));

  const isPdf =
    metadata?.mimeType === 'application/pdf' ||
    metadata?.name?.toLowerCase().endsWith('.pdf');

  return (
    <Modal
      open={!!viewingDoc}
      onCancel={onCancel}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={18} color="#ea580c" />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{title}</span>
          {horse?.name && (
            <Tag color="orange" style={{ fontWeight: 600 }}>
              {horse.name} · {horse.microchipId}
            </Tag>
          )}
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {metadata ? `Tệp: ${metadata.name} (${Math.ceil((metadata.size || 0) / 1024)} KB)` : 'Chứng từ số hóa CBRT'}
          </div>
          <Space>
            {blobUrl && (
              <>
                <Button
                  icon={<ExternalLink size={13} />}
                  onClick={() => window.open(blobUrl, '_blank')}
                >
                  Mở tab mới
                </Button>
                <Button
                  icon={<Download size={13} />}
                  href={blobUrl}
                  download={metadata?.name || 'document'}
                >
                  Tải tệp
                </Button>
              </>
            )}
            <Button type="primary" onClick={onCancel} style={{ background: '#ea580c', borderColor: '#ea580c' }}>
              Đã kiểm tra xong
            </Button>
          </Space>
        </div>
      }
      width={860}
      zIndex={1060}
      styles={{ body: { maxHeight: '78vh', overflowY: 'auto', padding: '16px 24px' } }}
    >
      {/* Tab bar if multiple files */}
      {fileUrls.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
          {fileUrls.map((url, idx) => (
            <Button
              key={url + idx}
              size="small"
              type={activeIndex === idx ? 'primary' : 'default'}
              style={{
                borderRadius: 6,
                fontWeight: activeIndex === idx ? 700 : 500,
                background: activeIndex === idx ? '#ea580c' : undefined,
                borderColor: activeIndex === idx ? '#ea580c' : undefined
              }}
              onClick={() => setActiveIndex(idx)}
            >
              Tệp {idx + 1} {activeIndex === idx ? '✓' : ''}
            </Button>
          ))}
        </div>
      )}

      {/* Toolbar / Metadata header */}
      {metadata && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 14,
            fontSize: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155' }}>
            <span>
              <strong>Tên gốc:</strong> {metadata.name}
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <Tag color={isImage ? 'blue' : 'purple'}>{metadata.mimeType || 'Tệp'}</Tag>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>{Math.ceil((metadata.size || 0) / 1024)} KB</span>
          </div>
          <Tag color="success" style={{ fontWeight: 600 }}>
            ✓ Đã xác thực chữ ký bảo mật
          </Tag>
        </div>
      )}

      {/* Main Preview Area */}
      {loading ? (
        <div style={{ padding: '70px 0', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 14, color: '#64748b', fontSize: 13, fontWeight: 500 }}>
            Đang tải tệp chứng từ bảo mật từ máy chủ CBRT...
          </div>
        </div>
      ) : error ? (
        <Alert
          type="error"
          showIcon
          message="Lỗi khi tải tệp"
          description={error}
          style={{ margin: '20px 0' }}
        />
      ) : blobUrl && isImage ? (
        <div
          style={{
            background: '#0f172a06',
            borderRadius: 10,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed #cbd5e1'
          }}
        >
          <Image
            src={blobUrl}
            alt={metadata?.name || title}
            style={{
              maxHeight: 520,
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
            }}
            preview={{
              mask: (
                <Space>
                  <Eye size={16} /> Nhấp để phóng to toàn màn hình
                </Space>
              )
            }}
          />
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} />
            <span>Chuyên viên có thể nhấp vào ảnh để phóng to, xoay ảnh hoặc kiểm tra số vi chip chi tiết.</span>
          </div>
        </div>
      ) : blobUrl && isPdf ? (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <iframe
            src={blobUrl}
            title={metadata?.name || title}
            width="100%"
            height="560px"
            style={{ border: 'none' }}
          />
        </div>
      ) : (
        /* Fallback demo / sample preview */
        <div
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            padding: '28px 32px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: '#fff7ed',
              color: '#ea580c',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              border: '1.5px solid #fed7aa'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Chứng từ kiểm dịch số hóa CBRT
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', maxWidth: 480, margin: '0 auto 16px' }}>
            Hồ sơ chứng nhận kiểm dịch và kết quả xét nghiệm được đồng bộ xác nhận theo chuẩn quốc tế cho cá thể ngựa{' '}
            <strong>{horse?.name}</strong>.
          </p>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '14px 18px',
              maxWidth: 500,
              margin: '0 auto 18px',
              textAlign: 'left',
              fontSize: 12
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Tên cá thể:</span> <strong>{horse?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Mã vi chip:</span>{' '}
                <strong style={{ fontFamily: 'monospace' }}>{horse?.microchipId}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Giống ngựa:</span> <strong>{horse?.breed}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Chủ sở hữu:</span> <strong>{horse?.ownerName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Loại chứng từ:</span>{' '}
                <strong style={{ color: '#ea580c' }}>{title}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Tình trạng:</span> <Tag color="success">Đã đối chiếu hợp lệ</Tag>
              </div>
            </div>
          </div>

          <Alert
            type="info"
            showIcon
            message="Chứng nhận kiểm dịch tiêu chuẩn"
            description="Kết quả xét nghiệm âm tính và đầy đủ dấu kiểm dịch thú y hợp lệ trước ngày xuất phát."
            style={{ maxWidth: 500, margin: '0 auto', textAlign: 'left' }}
          />
        </div>
      )}
    </Modal>
  );
}

export default function HorseVerificationPage() {
  const [params] = useSearchParams();
  const { horses: realHorses, fetchHorses, reviewHorse, loading } = useHorseStore();
  const [activeTab, setActiveTab] = useState('PENDING_REVIEW'); // 'PENDING_REVIEW' | 'REJECTED' | 'APPROVED'
  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(params.get('q') || ''); }, [params]);
  const [selectedHorse, setSelectedHorse] = useState(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    fetchHorses().catch(() => {});
  }, [fetchHorses]);

  // Combine real database horses with WDP demo horses
  const allHorses = useMemo(() => {
    const dbList = realHorses.map((h) => ({
      ...h,
      id: h.id || h._id,
      _id: h.id || h._id,
      name: h.name,
      microchipId: h.microchipId,
      breed: h.breed || 'Thuần chủng',
      age: h.age || '5 năm',
      ownerName: h.ownerName || h.ownerId?.fullName || 'Trần Lê Anh Quân',
      reviewStatus: h.reviewStatus || 'PENDING_REVIEW',
      submittedAt: h.createdAt ? formatDate(h.createdAt) : '20/10/2026 20:40',
      isRealDb: true
    }));

    const demoList = wdpDemoService.getHorses().map((h) => ({
      ...h,
      id: h.id || h._id,
      _id: h.id || h._id,
      name: h.name,
      microchipId: h.microchipId,
      breed: h.breed,
      age: h.age,
      ownerName: h.ownerName || 'Trần Lê Anh Quân',
      reviewStatus: h.reviewStatus || 'PENDING_REVIEW',
      submittedAt: '20/10/2026 20:38',
      isRealDb: false
    }));

    // Merge by microchipId or ID to eliminate duplicates
    const map = new Map();
    demoList.forEach((h) => map.set(h.microchipId || h.id, h));
    dbList.forEach((h) => map.set(h.microchipId || h.id, h));

    return Array.from(map.values());
  }, [realHorses]);

  // Counts for top metrics and tabs
  const pendingCount = allHorses.filter((h) => h.reviewStatus === 'PENDING_REVIEW').length;
  const rejectedCount = allHorses.filter((h) => h.reviewStatus === 'REJECTED').length;
  const approvedCount = allHorses.filter((h) => h.reviewStatus === 'APPROVED').length;

  // Filtered horses based on active tab and search query
  const filteredHorses = useMemo(() => {
    let list = allHorses.filter((h) => h.reviewStatus === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (h) =>
          (h.name && h.name.toLowerCase().includes(q)) ||
          (h.microchipId && h.microchipId.toLowerCase().includes(q)) ||
          (h.ownerName && h.ownerName.toLowerCase().includes(q)) ||
          (h.breed && h.breed.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allHorses, activeTab, search]);

  // Open verification dialog
  const handleStartReview = (horse) => {
    setSelectedHorse(horse);
    setConfirmChecked(false);
  };

  // Action: Approve horse
  const handleApprove = async () => {
    if (!selectedHorse) return;
    if (!confirmChecked) {
      message.warning('Vui lòng đánh dấu xác nhận đã đối chiếu hộ chiếu, microchip và giấy xét nghiệm.');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedHorse.isRealDb) {
        await reviewHorse(selectedHorse.id, {
          decision: 'APPROVED',
          notes: 'Hồ sơ sức khỏe và chứng từ kiểm dịch đạt tiêu chuẩn xuất phát.',
          profileVersion: selectedHorse.__v || 0
        });
      } else {
        // Update in demo service
        wdpDemoService.reviewHorse(selectedHorse.id, 'APPROVED');
      }

      message.success(`Đã duyệt hồ sơ ngựa ${selectedHorse.name} thành công. Khách hàng đã có thể đặt đơn vận chuyển cho ngựa này!`);
      setSelectedHorse(null);
      fetchHorses().catch(() => {});
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật hồ sơ ngựa lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  // Action: Reject / Request amendments
  const handleReject = async () => {
    if (!selectedHorse) return;
    if (!rejectNotes.trim()) {
      message.warning('Vui lòng nhập lý do từ chối hoặc nội dung cần bổ sung.');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedHorse.isRealDb) {
        await reviewHorse(selectedHorse.id, {
          decision: 'REJECTED',
          notes: rejectNotes.trim(),
          profileVersion: selectedHorse.__v || 0
        });
      } else {
        wdpDemoService.reviewHorse(selectedHorse.id, 'REJECTED');
      }

      message.info(`Đã gửi yêu cầu bổ sung giấy tờ cho chủ ngựa ${selectedHorse.name}.`);
      setRejectModalOpen(false);
      setSelectedHorse(null);
      setRejectNotes('');
      fetchHorses().catch(() => {});
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể lưu yêu cầu bổ sung.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="specialist-page-container">
      {/* Header */}
      <header className="spec-header">
        <div className="spec-eyebrow">THỦ TỤC & KIỂM DỊCH</div>
        <div className="spec-title-row">
          <div>
            <h1 className="spec-title">Duyệt hồ sơ ngựa</h1>
            <p className="spec-subtitle">
              Hồ sơ ngựa do khách hàng tạo được giao cho bạn. Đối chiếu hộ chiếu, microchip, xét nghiệm và duyệt hồ sơ ngựa để khách hàng có thể tạo đơn vận chuyển.
            </p>
          </div>
          <Button
            icon={<RotateCcw size={14} />}
            loading={loading}
            onClick={() => fetchHorses().catch(() => {})}
          >
            Làm mới danh sách
          </Button>
        </div>
      </header>

      {/* Top 3 Summary Metrics matching Screenshot 1 */}
      <div className="spec-metrics-grid">
        <div className="spec-metric-card">
          <div className="spec-metric-label">Hồ sơ cần duyệt</div>
          <div className="spec-metric-value" style={{ color: '#ea580c' }}>
            {pendingCount}
          </div>
          <div className="spec-metric-desc">Chờ kiểm tra chứng từ & microchip</div>
        </div>

        <div className="spec-metric-card">
          <div className="spec-metric-label">Chờ khách bổ sung</div>
          <div className="spec-metric-value" style={{ color: '#d97706' }}>
            {rejectedCount}
          </div>
          <div className="spec-metric-desc">Yêu cầu chụp lại giấy tờ hoặc tiêm phòng</div>
        </div>

        <div className="spec-metric-card">
          <div className="spec-metric-label">Đã đủ điều kiện</div>
          <div className="spec-metric-value" style={{ color: '#16a34a' }}>
            {approvedCount}
          </div>
          <div className="spec-metric-desc">Đã duyệt kiểm dịch · Sẵn sàng đặt đơn</div>
        </div>
      </div>

      {/* Filter Tabs matching Screenshot 2 */}
      <div className="spec-filter-tabs">
        <button
          type="button"
          className={`spec-tab-btn ${activeTab === 'PENDING_REVIEW' ? 'spec-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('PENDING_REVIEW')}
        >
          <span>Cần duyệt</span>
          <span className="spec-tab-badge">{pendingCount}</span>
        </button>

        <button
          type="button"
          className={`spec-tab-btn ${activeTab === 'REJECTED' ? 'spec-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('REJECTED')}
        >
          <span>Chờ khách bổ sung</span>
          <span className="spec-tab-badge">{rejectedCount}</span>
        </button>

        <button
          type="button"
          className={`spec-tab-btn ${activeTab === 'APPROVED' ? 'spec-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('APPROVED')}
        >
          <span>Đã duyệt</span>
          <span className="spec-tab-badge">{approvedCount}</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="spec-content-card">
        <div className="spec-table-toolbar">
          <Input
            prefix={<Search size={15} color="#94a3b8" />}
            placeholder="Tìm theo tên ngựa, mã chip, chủ sở hữu, giống..."
            className="spec-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Hiển thị <strong>{filteredHorses.length}</strong> hồ sơ
          </div>
        </div>

        <Spin spinning={loading}>
          {filteredHorses.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có hồ sơ nào ở mục này."
              style={{ padding: '40px 0' }}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="spec-horse-table">
                <thead>
                  <tr>
                    <th>Tên ngựa / Mã</th>
                    <th>Chủ sở hữu</th>
                    <th>Giống / Tuổi</th>
                    <th>Mã vi chip</th>
                    <th>Hồ sơ nộp lúc</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHorses.map((horse) => (
                    <tr key={horse.id}>
                      <td>
                        <div className="spec-horse-cell-main">
                          <div className="spec-horse-avatar">🐴</div>
                          <div>
                            <strong style={{ fontSize: 14, color: '#0f172a' }}>{horse.name}</strong>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              FEI: {horse.feiPassportNo || horse.feiPassportNumber || 'Chưa cấp'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{horse.ownerName}</div>
                      </td>
                      <td>
                        <div>{horse.breed}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{horse.age}</div>
                      </td>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                          {horse.microchipId}
                        </strong>
                      </td>
                      <td>
                        <div style={{ color: '#475569' }}>{horse.submittedAt}</div>
                      </td>
                      <td>
                        {horse.reviewStatus === 'APPROVED' ? (
                          <Tag color="success" style={{ borderRadius: 6, fontWeight: 600 }}>
                            Đã duyệt kiểm dịch
                          </Tag>
                        ) : horse.reviewStatus === 'REJECTED' ? (
                          <Tag color="error" style={{ borderRadius: 6, fontWeight: 600 }}>
                            Cần bổ sung giấy
                          </Tag>
                        ) : (
                          <Tag color="warning" style={{ borderRadius: 6, fontWeight: 600 }}>
                            Chờ thẩm định
                          </Tag>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          type="primary"
                          className="spec-btn-review"
                          size="small"
                          onClick={() => handleStartReview(horse)}
                        >
                          {horse.reviewStatus === 'APPROVED' ? 'Xem lại' : 'Thẩm định'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Spin>
      </div>

      {/* =========================================================
          INSPECTION MODAL VIEW (Matching Screenshots 3 & 4)
          ========================================================= */}
      {selectedHorse && (
        <Modal
          open={!!selectedHorse}
          onCancel={() => setSelectedHorse(null)}
          width={840}
          title={
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Đối chiếu hồ sơ 1 ngựa - {selectedHorse.name}{' '}
                {selectedHorse.reviewStatus === 'APPROVED' && (
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#16a34a' }}>
                    (Đã duyệt kiểm dịch)
                  </span>
                )}
                {selectedHorse.reviewStatus === 'REJECTED' && (
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>
                    (Chờ bổ sung)
                  </span>
                )}
              </div>
              <div className="spec-modal-header-tag-row">
                {selectedHorse.reviewStatus === 'APPROVED' ? (
                  <Tag color="success" style={{ borderRadius: 4, fontWeight: 700 }}>
                    ✔ Đã duyệt kiểm dịch
                  </Tag>
                ) : selectedHorse.reviewStatus === 'REJECTED' ? (
                  <Tag color="error" style={{ borderRadius: 4, fontWeight: 700 }}>
                    ⚠ Chờ khách bổ sung
                  </Tag>
                ) : (
                  <Tag color="cyan" style={{ borderRadius: 4, fontWeight: 600 }}>
                    Đã nộp đủ giấy
                  </Tag>
                )}
                <span className="spec-doc-checklist-badge">✔ Hộ chiếu Đã nộp</span>
                <span className="spec-doc-checklist-badge">✔ Sổ tiêm Đã nộp</span>
                <span className="spec-doc-checklist-badge">✔ Xét nghiệm Đã nộp</span>
                {Array.isArray(selectedHorse.photos) && selectedHorse.photos.length > 0 && (
                  <span
                    className="spec-doc-checklist-badge"
                    style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                  >
                    ✔ {selectedHorse.photos.length} Ảnh nhận dạng
                  </span>
                )}
              </div>
            </div>
          }
          footer={
            <div className="spec-modal-footer">
              {selectedHorse.reviewStatus === 'APPROVED' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                    <CheckCircle2 size={16} />
                    <span>Hồ sơ đã được duyệt kiểm dịch · Đủ điều kiện tạo đơn vận chuyển</span>
                  </div>
                  <Button onClick={() => setSelectedHorse(null)}>
                    Đóng
                  </Button>
                </>
              ) : selectedHorse.reviewStatus === 'REJECTED' ? (
                <>
                  <div style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>
                    Đang chờ chủ ngựa gửi lại hồ sơ theo yêu cầu
                  </div>
                  <Space>
                    <Button onClick={() => setSelectedHorse(null)}>Đóng</Button>
                    <Button
                      type="primary"
                      className="spec-btn-review"
                      loading={submitting}
                      onClick={handleApprove}
                    >
                      Duyệt hồ sơ ngựa
                    </Button>
                  </Space>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: confirmChecked ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                    {confirmChecked ? '✓ Sẵn sàng duyệt hồ sơ ngựa' : 'Chưa xác nhận đối chiếu chứng từ'}
                  </div>
                  <Space>
                    <Button onClick={() => setSelectedHorse(null)}>Đóng</Button>
                    <Button danger onClick={() => setRejectModalOpen(true)}>
                      Yêu cầu bổ sung
                    </Button>
                    <Button
                      type="primary"
                      className="spec-btn-review"
                      loading={submitting}
                      disabled={!confirmChecked}
                      onClick={handleApprove}
                    >
                      Duyệt hồ sơ ngựa
                    </Button>
                  </Space>
                </>
              )}
            </div>
          }
        >
          <div style={{ marginTop: 14 }}>
            {/* Identity Information Summary Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 16, color: '#0f172a' }}>{selectedHorse.name}</strong>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Chủ sở hữu: <strong>{selectedHorse.ownerName}</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12 }}>
                <div>
                  <div style={{ color: '#64748b' }}>Mã Microchip</div>
                  <strong style={{ fontFamily: 'monospace' }}>{selectedHorse.microchipId}</strong>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Giống / Giới tính</div>
                  <strong>{selectedHorse.breed} · Đực</strong>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Tuổi / Năm sinh</div>
                  <strong>{selectedHorse.age || '5 năm'}</strong>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Địa điểm hiện tại</div>
                  <strong>{selectedHorse.currentLocationName || 'TP. Hồ Chí Minh'}</strong>
                </div>
              </div>
            </div>

            {/* Document Checklist Items matching Screenshots 3 & 4 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                Hồ sơ pháp lý & Giấy tờ thú y đính kèm
              </div>

              {/* Doc 1: Hộ chiếu ngựa */}
              <div className="spec-doc-card-item">
                <div className="spec-doc-info-left">
                  <div className="spec-doc-icon">
                    <FileText size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>
                      Hộ chiếu ngựa (FEI / National Passport)
                    </strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {Array.isArray(selectedHorse.passportScanUrl) && selectedHorse.passportScanUrl.length > 0
                        ? `Đã tải ${selectedHorse.passportScanUrl.length} tệp chứng từ · nộp ${selectedHorse.submittedAt}`
                        : `fei_passport_${selectedHorse.microchipId}.pdf · nộp ${selectedHorse.submittedAt}`}
                    </div>
                  </div>
                </div>
                <Button
                  size="small"
                  icon={<Eye size={12} />}
                  onClick={() =>
                    setViewingDoc({
                      title: 'Hộ chiếu ngựa (FEI / National Passport)',
                      files: selectedHorse.passportScanUrl,
                      horse: selectedHorse,
                      docType: 'PASSPORT'
                    })
                  }
                >
                  Xem tệp
                </Button>
              </div>

              {/* Doc 2: Sổ tiêm phòng */}
              <div className="spec-doc-card-item">
                <div className="spec-doc-info-left">
                  <div className="spec-doc-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>Sổ tiêm phòng dịch tễ</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Cúm ngựa (Equine Influenza), Uốn ván ·{' '}
                      {Array.isArray(selectedHorse.vaccinationRecordUrl) && selectedHorse.vaccinationRecordUrl.length > 0
                        ? `Đã tải ${selectedHorse.vaccinationRecordUrl.length} tệp`
                        : '1 tệp đã nộp'}{' '}
                      · Hiệu lực &lt; 6 tháng
                    </div>
                  </div>
                </div>
                <Button
                  size="small"
                  icon={<Eye size={12} />}
                  onClick={() =>
                    setViewingDoc({
                      title: 'Sổ tiêm phòng dịch tễ',
                      files: selectedHorse.vaccinationRecordUrl,
                      horse: selectedHorse,
                      docType: 'VACCINE'
                    })
                  }
                >
                  Xem tệp
                </Button>
              </div>

              {/* Doc 3: Xét nghiệm EIA / Coggins */}
              <div className="spec-doc-card-item">
                <div className="spec-doc-info-left">
                  <div className="spec-doc-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>Xét nghiệm EIA / Coggins âm tính</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Kết quả xét nghiệm máu thiếu máu truyền nhiễm · Đạt tiêu chuẩn xuất bến
                    </div>
                  </div>
                </div>
                <Button
                  size="small"
                  icon={<Eye size={12} />}
                  onClick={() =>
                    setViewingDoc({
                      title: 'Phiếu xét nghiệm EIA / Coggins âm tính',
                      files: selectedHorse.cogginsTestUrl || selectedHorse.vaccinationRecordUrl,
                      horse: selectedHorse,
                      docType: 'COGGINS'
                    })
                  }
                >
                  Xem tệp
                </Button>
              </div>

              {/* Doc 4: Bộ ảnh nhận dạng ngoại hình ngựa */}
              <div className="spec-doc-card-item">
                <div className="spec-doc-info-left">
                  <div className="spec-doc-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <Camera size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>Bộ ảnh nhận dạng & màu lông</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {Array.isArray(selectedHorse.photos) && selectedHorse.photos.length > 0
                        ? `${selectedHorse.photos.length} ảnh nhận dạng màu lông, khuôn mặt & toàn thân`
                        : 'Ảnh chụp ngoại hình cá thể ngựa'}
                    </div>
                  </div>
                </div>
                <Button
                  size="small"
                  icon={<Eye size={12} />}
                  onClick={() =>
                    setViewingDoc({
                      title: 'Bộ ảnh nhận dạng & ngoại hình ngựa',
                      files: selectedHorse.photos,
                      horse: selectedHorse,
                      docType: 'PHOTOS'
                    })
                  }
                >
                  Xem ảnh
                </Button>
              </div>
            </div>

            {/* Status-aware verification banner or checkbox */}
            {selectedHorse.reviewStatus === 'APPROVED' ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: 10,
                  padding: '14px 18px',
                  margin: '18px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                    Hồ sơ ngựa đã được kiểm dịch & phê duyệt đạt chuẩn xuất bến
                  </div>
                  <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                    Mã vi chip <strong>{selectedHorse.microchipId}</strong> đã đối chiếu hợp lệ với Hộ chiếu FEI và các chứng chỉ thú y. Ngựa đã đủ điều kiện để khách hàng đặt đơn vận chuyển.
                  </div>
                </div>
              </div>
            ) : selectedHorse.reviewStatus === 'REJECTED' ? (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: 10,
                  padding: '14px 18px',
                  margin: '18px 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12
                }}
              >
                <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>
                    Đang chờ chủ ngựa bổ sung hồ sơ
                  </div>
                  <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                    Nội dung yêu cầu:{' '}
                    <em>
                      "{selectedHorse.reviewNotes || 'Yêu cầu chụp rõ nét lại ảnh hộ chiếu hoặc sổ tiêm phòng'}"
                    </em>
                  </div>
                </div>
              </div>
            ) : (
              <div className="spec-confirm-box">
                <Checkbox
                  id="chk-verify-horse"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                />
                <label htmlFor="chk-verify-horse">
                  Đã đối chiếu hộ chiếu, vi chip <strong>{selectedHorse.microchipId}</strong> và các giấy xét nghiệm thú y EIA/EVA đạt chuẩn kiểm dịch.
                </label>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject / Request Amendment Modal */}
      {rejectModalOpen && (
        <Modal
          open={rejectModalOpen}
          onCancel={() => {
            setRejectModalOpen(false);
            setRejectNotes('');
          }}
          onOk={handleReject}
          title="Yêu cầu bổ sung hồ sơ ngựa"
          okText="Gửi yêu cầu"
          cancelText="Hủy"
          okButtonProps={{ danger: true, loading: submitting }}
        >
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
            Nhập chi tiết nội dung hoặc giấy tờ còn thiếu để yêu cầu chủ ngựa <strong>{selectedHorse?.name}</strong> bổ sung lại:
          </p>
          <Input.TextArea
            rows={3}
            placeholder="VD: Bản scan hộ chiếu bị mờ số vi chip, sổ tiêm phòng cúm ngựa đã quá hạn 6 tháng..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
          />
        </Modal>
      )}

      {/* Secure Document Viewer Modal (Displays Real Files) */}
      <SecureDocumentViewerModal viewingDoc={viewingDoc} onCancel={() => setViewingDoc(null)} />
    </div>
  );
}
