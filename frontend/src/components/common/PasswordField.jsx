import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const label = props.id === 'confirmPassword' ? 'mật khẩu xác nhận' : 'mật khẩu';

  return (
    <div className="equine-password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setVisible(value => !value)}
        aria-controls={props.id}
        aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label}`}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
