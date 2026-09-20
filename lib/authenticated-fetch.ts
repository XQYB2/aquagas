import { supabase } from './supabase'

export async function authenticatedJsonHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Your session expired. Please sign in again.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}
