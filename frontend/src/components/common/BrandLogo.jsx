import React from 'react';

// An original CBRT route monogram: a bridle arch and a crossing path.
export default function BrandLogo({
  compact = false
}) {
  return <span className={`brand-lockup ${compact ? 'brand-lockup--compact' : ''}`}>
    <svg className="brand-mark" viewBox="0 0 48 56" fill="none" aria-hidden="true"><path d="M7 43V23C7 12 14 5 24 5s17 7 17 18v20M15 40V23c0-7 3-10 9-10s9 3 9 10v17" stroke="currentColor" strokeWidth="2" /><path d="m5 49 38-21M5 55l38-21" stroke="currentColor" strokeWidth="2" /><path d="M24 20v12" stroke="currentColor" strokeWidth="2" /></svg>
    <span className="brand-wordmark"><strong>CBRT</strong><small>Equine transport</small></span>
  </span>;
}
