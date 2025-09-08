// SynthesisHeader.tsx
import * as React from "react";
import { EmailBriefButton } from "./EmailBriefButton";

export function SynthesisHeader({ 
  requestId, 
  subject,
  defaultEmail 
}: { 
  requestId: string | null; 
  subject?: string;
  defaultEmail?: string | null;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '8px 0',
      borderBottom: '1px solid #e5e7eb',
      marginBottom: '16px'
    }}>
      <div style={{
        fontSize: '14px',
        color: '#6b7280',
        fontWeight: '500'
      }}>
        Executive Brief
      </div>
      <EmailBriefButton 
        requestId={requestId} 
        subject={subject} 
        defaultEmail={defaultEmail} 
      />
    </div>
  );
}