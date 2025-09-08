// EmailBriefButton.tsx – small button that opens the EmailBriefDialog
import * as React from "react";
import { EmailBriefDialog } from "./EmailBriefDialog";

export function EmailBriefButton({ 
  requestId, 
  subject, 
  defaultEmail 
}: { 
  requestId: string | null; 
  subject?: string; 
  defaultEmail?: string | null; 
}) {
  const [open, setOpen] = React.useState(false);
  
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!requestId}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          backgroundColor: !requestId ? '#f3f4f6' : 'white',
          color: !requestId ? '#9ca3af' : '#374151',
          cursor: !requestId ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s',
          ...(requestId && {
            ':hover': {
              backgroundColor: '#f9fafb',
              borderColor: '#d1d5db'
            }
          })
        }}
        onMouseEnter={(e) => {
          if (requestId) {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#d1d5db';
          }
        }}
        onMouseLeave={(e) => {
          if (requestId) {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }
        }}
      >
        📧 Email me this brief
      </button>
      <EmailBriefDialog 
        open={open} 
        onOpenChange={setOpen} 
        requestId={requestId} 
        subject={subject} 
        defaultEmail={defaultEmail} 
      />
    </>
  );
}