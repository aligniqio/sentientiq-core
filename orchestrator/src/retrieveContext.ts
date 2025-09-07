import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase: SupabaseClient | null =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Tenant-aware context retrieval via pgvector
export async function retrieveContext(prompt: string, topK = 6, tenantId?: string): Promise<string[]> {
  if (!supabase) return [];
  try {
    if (tenantId) {
      const { data, error } = await supabase.rpc('match_documents_for_tenant', {
        query_text: prompt,
        match_count: topK,
        p_tenant: tenantId,
      });
      if (error || !Array.isArray(data)) return [];
      return data.map((r: any) => r.content || '').filter(Boolean);
    } else {
      const { data } = await supabase.rpc('match_documents', {
        query_text: prompt,
        match_count: topK,
      });
      return Array.isArray(data) ? data.map((r: any) => r.content || '').filter(Boolean) : [];
    }
  } catch {
    return [];
  }
}

// Export supabase client for other uses
export { supabase };