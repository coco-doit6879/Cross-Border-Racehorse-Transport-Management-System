import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ title, subtitle, onClose, children, wide = false }) => {
  useEffect(() => {
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`manager-modal ${wide ? 'manager-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="manager-modal-title">
        <header className="manager-modal__header">
          <div><h2 id="manager-modal-title">{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
          <button type="button" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
        </header>
        <div className="manager-modal__body">{children}</div>
      </section>
    </div>
  );
};

export default Modal;

