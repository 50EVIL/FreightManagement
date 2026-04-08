import clsx from 'clsx';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const SIZE_MAP = { sm: 16, md: 24, lg: 40 };

export default function LoadingSpinner({ size = 'md', label }: Props) {
  const px = SIZE_MAP[size];
  return (
    <span
      role="status"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      aria-label={label ?? 'Loading'}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{ animation: 'spin 0.8s linear infinite', color: '#2563eb' }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
      {label && <span style={{ fontSize: 14, color: '#6b7280' }}>{label}</span>}
    </span>
  );
}
