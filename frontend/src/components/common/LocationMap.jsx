import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Leaflet Pin Icons (Green for Origin, Red for Destination)
const createPinIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          background-color: ${color};
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid white;
          margin-bottom: 2px;
        ">
          ${label}
        </div>
        <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="${color}"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [24, 32],
    iconAnchor: [12, 32]
  });
};

const originIcon = createPinIcon('#10B981', 'Điểm đón (Origin)');
const destinationIcon = createPinIcon('#EF4444', 'Điểm giao (Destination)');

// Helper component to auto-fit map view to markers
const MapController = ({ originCoords, destCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (originCoords && destCoords) {
      const bounds = L.latLngBounds([
        [originCoords[1], originCoords[0]],
        [destCoords[1], destCoords[0]]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (originCoords) {
      map.setView([originCoords[1], originCoords[0]], 12);
    } else if (destCoords) {
      map.setView([destCoords[1], destCoords[0]], 12);
    }
  }, [map, originCoords, destCoords]);

  return null;
};

const LocationMap = ({ originLocation, destinationLocation, height = '340px' }) => {
  const originCoords = originLocation?.coordinates; // [lng, lat]
  const destCoords = destinationLocation?.coordinates; // [lng, lat]

  const defaultCenter = originCoords
    ? [originCoords[1], originCoords[0]]
    : destCoords
    ? [destCoords[1], destCoords[0]]
    : [10.7769, 106.7009]; // Default Ho Chi Minh City

  const polylinePositions = (originCoords && destCoords)
    ? [
        [originCoords[1], originCoords[0]],
        [destCoords[1], destCoords[0]]
      ]
    : [];

  return (
    <div style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController originCoords={originCoords} destCoords={destCoords} />

        {originCoords && (
          <Marker position={[originCoords[1], originCoords[0]]} icon={originIcon}>
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>📍 Điểm đón (Pickup):</strong>
                <div>{originLocation.formattedAddress}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                  Tọa độ: [{originCoords[0].toFixed(4)}, {originCoords[1].toFixed(4)}]
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {destCoords && (
          <Marker position={[destCoords[1], destCoords[0]]} icon={destinationIcon}>
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>🏁 Điểm giao (Delivery):</strong>
                <div>{destinationLocation.formattedAddress}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                  Tọa độ: [{destCoords[0].toFixed(4)}, {destCoords[1].toFixed(4)}]
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {polylinePositions.length === 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: '#0F3E2E', weight: 3, dashArray: '6, 8', opacity: 0.8 }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationMap;
