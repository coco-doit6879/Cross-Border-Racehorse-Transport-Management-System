import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { horseApi } from '../../services/horseApi';
import './horse-identity.css';

export default function HorseIdentity({ horse, photoOnly = false }) {
  const [image, setImage] = useState('');
  const photo = horse.photos?.find(url => /^\/horses\/files\/[a-f0-9]{24}$/i.test(url));
  useEffect(() => {
    let active = true, objectUrl = '';
    setImage('');
    if (photo) horseApi.getFile(photo).then(response => {
      if (!active || !response.data.type?.startsWith('image/')) return;
      objectUrl = URL.createObjectURL(response.data); setImage(objectUrl);
    }).catch(() => { if (active) setImage(''); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo]);
  const thumbnail = <span className="horse-identity-photo" title={image ? `Ảnh ${horse.name}` : 'Chưa có ảnh nhận dạng khả dụng'}>
      {image ? <img src={image} alt={`Ảnh ngựa ${horse.name}`} onError={() => setImage('')} /> : <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M15 51c1-11 8-17 16-23l-5-2-9 7-7-5 11-13 7-1 4-8 4 9c14 5 18 17 15 36H15Z" fill="#d0dfd0" stroke="#708f75" strokeWidth="1.7" strokeLinejoin="round"/><path d="m35 17-7 6m9-2c7 7 9 15 8 25M17 28l5-2M17 51h36" stroke="#708f75" strokeWidth="1.7" strokeLinecap="round"/><circle cx="28" cy="20" r="1.5" fill="#47654c"/></svg>}
    </span>;
  if (photoOnly) return <Link to={`/horses/${horse._id || horse.id}`} className="horse-dossier-portrait" aria-label={`Xem hồ sơ ${horse.name}`} title={`Xem hồ sơ ${horse.name}`}>{thumbnail}</Link>;
  return <Link to={`/horses/${horse._id}`} className="horse-identity" aria-label={`Xem hồ sơ ${horse.name}, mã chip ${horse.microchipId}`}>
    {thumbnail}
    <span className="horse-identity-info"><strong>{horse.name}</strong><span>Mã chip · {horse.microchipId}</span><small>Xem hồ sơ ↗</small></span>
  </Link>;
}
