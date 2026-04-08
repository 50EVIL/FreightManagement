import type { ConnoteStatus } from '@/types/connote';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/connote';

interface Props {
  status: ConnoteStatus;
}

export default function StatusBadge({ status }: Props) {
  const color = STATUS_COLORS[status] ?? '#6b7280';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.3,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
