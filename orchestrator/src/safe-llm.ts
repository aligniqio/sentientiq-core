export async function* callWithFallback(
  primary: () => AsyncGenerator<{text?: string}>, 
  backup?: () => AsyncGenerator<{text?: string}>
) {
  try { 
    for await (const c of primary()) yield c; 
    return; 
  } catch (e: any) {
    const msg = (e?.message || '').toLowerCase();
    const status = e?.status || e?.response?.status;
    const recoverable = 
      status === 401 || 
      status === 429 || 
      status >= 500 || 
      msg.includes('incorrect api key') || 
      msg.includes('overloaded');
    
    if (!recoverable || !backup) throw e;
    for await (const c of backup()) yield c;
  }
}