interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: Props) {
  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={cancelBtnStyle}>{cancelLabel}</button>
          <button
            onClick={onConfirm}
            style={{ ...confirmBtnStyle, background: isDestructive ? '#dc2626' : '#2563eb' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const dialogStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: 24, maxWidth: 400, width: '90%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db',
  background: '#fff', cursor: 'pointer', fontSize: 14,
};
const confirmBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 6, border: 'none',
  color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
};
