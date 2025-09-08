// Lightweight usage tracking utility
export function track(kind: string, meta: Record<string, any> = {}) {
  return fetch('/api/usage/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind,                                  // <— canonical
      page: window.location.pathname,
      meta
    })
  }).catch(() => {});
}

// Convenience methods for common tracking events
export const tracking = {
  questionSubmitted: (personas: number = 0) => 
    track('question_submitted', { personas }),
  
  debateStarted: (personas: number = 0) => 
    track('debate_started', { personas }),
  
  answerRequested: () => 
    track('answer_requested'),
  
  ctaClicked: (ctaName: string) => 
    track('cta_clicked', { cta: ctaName }),
  
  pageView: () => 
    track('page_view'),
  
  error: (error: string) => 
    track('error', { error })
};