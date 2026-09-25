import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Spin, Tag, Alert } from 'antd';
import { Search, MapPin, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { geocodingApi } from '../../services/geocodingApi';

const AddressSearchSelector = ({
  label = 'Địa chỉ',
  countryCode = 'VN',
  placeholder = 'Nhập tên đường, quận/huyện, thành phố để tìm kiếm...',
  confirmedLocation = null,
  onConfirmLocation,
  onClearLocation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const searchTimeoutRef = useRef(null);

  // Clear or reset local state when confirmedLocation is cleared externally
  useEffect(() => {
    if (!confirmedLocation) {
      setSelectedResult(null);
      setSearchTerm('');
      setResults([]);
    }
  }, [confirmedLocation]);

  // Handle Search Input Change with Debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setErrorMsg('');

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val || val.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await geocodingApi.searchAddress(val.trim(), countryCode);
        const data = res?.data?.data || [];
        setResults(data);
        if (data.length === 0) {
          setErrorMsg('Không tìm thấy tọa độ phù hợp cho địa chỉ này. Vui lòng nhập chi tiết hơn.');
        }
      } catch (err) {
        setErrorMsg('Không thể kết nối dịch vụ bản đồ. Vui lòng thử lại sau.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelectResult = (item) => {
    setSelectedResult(item);
    setResults([]);
  };

  const handleConfirm = () => {
    if (!selectedResult) return;
    onConfirmLocation({
      address: selectedResult.formattedAddress,
      countryCode: selectedResult.countryCode || countryCode,
      coordinates: selectedResult.coordinates // [lng, lat]
    });
  };

  const handleReSelect = () => {
    if (onClearLocation) onClearLocation();
    setSelectedResult(null);
    setSearchTerm('');
    setResults([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 1. Confirmed State Display */}
      {confirmedLocation ? (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 10,
            backgroundColor: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CheckCircle2 size={20} color="#16A34A" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ✓ Vị trí đã được xác nhận định vị
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2 }}>
                {confirmedLocation.address}
              </div>
              <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>Quốc gia: <strong>{confirmedLocation.countryCode}</strong></span>
                <span>
                  Tọa độ GeoJSON [kinh độ, vĩ độ]:{' '}
                  <code style={{ background: '#DCFCE7', padding: '1px 6px', borderRadius: 4, color: '#166534', fontWeight: 600 }}>
                    [{confirmedLocation.coordinates[0].toFixed(4)}, {confirmedLocation.coordinates[1].toFixed(4)}]
                  </code>
                </span>
              </div>
            </div>
          </div>

          <Button
            type="text"
            size="small"
            icon={<RefreshCw size={14} />}
            onClick={handleReSelect}
            style={{ color: '#15803D', fontWeight: 600 }}
          >
            Chọn lại
          </Button>
        </div>
      ) : (
        /* 2. Unconfirmed / Search State */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
          <Input
            prefix={<Search size={16} color="#6B7280" />}
            suffix={loading ? <Spin size="small" /> : null}
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            allowClear
            style={{ borderRadius: 8, height: 42, fontSize: 14 }}
          />

          {/* Error / Warning Alert */}
          {errorMsg && (
            <Alert
              type="warning"
              message={errorMsg}
              showIcon
              style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6 }}
            />
          )}

          {/* Live Search Results List Dropdown */}
          {results.length > 0 && !selectedResult && (
            <div
              style={{
                position: 'absolute',
                top: 46,
                left: 0,
                right: 0,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                zIndex: 100,
                maxHeight: 260,
                overflowY: 'auto',
                padding: 6
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', padding: '6px 10px', textTransform: 'uppercase' }}>
                Kết quả tìm kiếm geocoding ({results.length}):
              </div>

              {results.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectResult(item)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    transition: 'background-color 0.15s ease',
                    marginBottom: 2
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <MapPin size={18} color="#0F3E2E" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                      {item.formattedAddress}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                      Quốc gia: {item.countryCode} • Tọa độ: [{item.coordinates[0].toFixed(4)}, {item.coordinates[1].toFixed(4)}]
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Option Preview & Explicit Confirmation Button */}
          {selectedResult && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #93C5FD',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <MapPin size={20} color="#2563EB" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>
                    Địa điểm đã chọn (Chờ xác nhận)
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2 }}>
                    {selectedResult.formattedAddress}
                  </div>
                  <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>
                    GeoJSON Coordinates: [{selectedResult.coordinates[0].toFixed(4)}, {selectedResult.coordinates[1].toFixed(4)}]
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <Button size="small" onClick={() => setSelectedResult(null)}>
                  Hủy chọn
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleConfirm}
                  style={{ backgroundColor: '#2563EB', borderColor: '#2563EB', fontWeight: 600 }}
                >
                  ✓ Xác nhận vị trí này
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressSearchSelector;
