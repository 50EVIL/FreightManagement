import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { signOut } from 'aws-amplify/auth';

export default function OnboardingPendingPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthSession()
      .then((s) => {
        const payload = s.tokens?.idToken?.payload;
        setEmail(typeof payload?.email === 'string' ? payload.email : null);
      })
      .catch(() => null);
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: 440, width: '100%', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#111827' }}>Account Pending Setup</h1>
        <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>
          Your account hasn't been linked to a tenant yet. Please contact your freight broker and provide them with your email address so they can complete the setup.
        </p>
        {email && (
          <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 14 }}>
            Your email: <strong>{email}</strong>
          </div>
        )}
        <button
          onClick={() => signOut()}
          style={{ padding: '9px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
