// useDebateMeta.ts – capture requestId & prompt from SSE "meta"
import * as React from "react";

export function useDebateMeta() {
  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [subject, setSubject] = React.useState<string>("Collective Synthesis");
  
  const onMeta = React.useCallback((d: any) => {
    if (d?.requestId) setRequestId(d.requestId);
    if (d?.subject) setSubject(String(d.subject));
  }, []);
  
  return { requestId, subject, onMeta };
}