/**
 * Centralized Supabase client instance
 * Prevents multiple GoTrueClient instances warning
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single shared instance
let supabaseClient: any = null;

export function getSupabaseClient() {
  if (!supabaseClient && supabaseUrl && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    });
  }
  return supabaseClient;
}

// Export the client getter as default
export default getSupabaseClient;