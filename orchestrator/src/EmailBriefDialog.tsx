// EmailBriefDialog.tsx
import * as React from "react";

export type EmailBriefDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string | null;
  subject?: string;
  defaultEmail?: string | null;
};

function isEmail(s?: string | null) {
  if (!s) return false;
  return /^(?:[a-z0-9_+.%-]+)@(?:[a-z0-9.-]+)\.[a-z]{2,}$/i.test(s.trim());
}

export function EmailBriefDialog({ open, onOpenChange, requestId, subject, defaultEmail }: EmailBriefDialogProps) {
  const [email, setEmail] = React.useState(defaultEmail || "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (defaultEmail && !email) setEmail(defaultEmail);
  }, [defaultEmail]);

  async function send() {
    setError(null);
    if (!requestId) { setError("No debate in progress."); return; }
    if (!isEmail(email)) { setError("Enter a valid email address."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/debate/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, email, subject })
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      // Simple success notification
      alert(`Brief sent to ${email}`);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      setError("Could not send brief. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>Email me this brief</h2>
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
          We'll package the Moderator's synthesis and key quotes and send it to your inbox.
        </p>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Email
          </label>
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Subject
          </label>
          <input
            type="text"
            value={subject || "Collective Synthesis"}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#f5f5f5'
            }}
          />
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={loading || !isEmail(email)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: loading || !isEmail(email) ? '#ccc' : '#7c3aed',
              color: 'white',
              cursor: loading || !isEmail(email) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}