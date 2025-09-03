import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

interface Insight {
  id: string
  question: string
  answer: string
  confidence: number
  factors: Array<{
    label: string
    weight: number
  }>
  created_at: string
}

/**
 * Ask the PhD collective a question
 * This is the ENTIRE product
 */
export async function askPhDs(question: string): Promise<Insight> {
  // Call the backend (EC2 through ALB)
  const response = await fetch(`${import.meta.env.VITE_INTEL_API_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })
  
  if (!response.ok) {
    throw new Error('PhDs are thinking...')
  }
  
  const insight = await response.json() as Insight
  
  // Store in Supabase for history
  await supabase
    .from('insights')
    .insert(insight)
  
  return insight
}

/**
 * Get recent insights
 */
export async function getRecentInsights(limit = 10): Promise<Insight[]> {
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}