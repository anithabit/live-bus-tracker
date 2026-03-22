import { supabase } from './supabase';

/**
 * Resolve Supabase Auth email for driver login.
 * Accepts full email, or driver_id if drivers row has email/login_email/auth_email.
 */
export async function resolveDriverAuthEmail(identifier) {
  if (!supabase || !identifier?.trim()) return { email: null, error: 'Missing id' };
  const raw = identifier.trim();
  if (raw.includes('@')) return { email: raw, error: null };

  const { data, error } = await supabase.from('drivers').select('*').eq('driver_id', raw).maybeSingle();

  if (error) return { email: null, error: error.message };
  const email = data?.email || data?.login_email || data?.auth_email;
  if (!email) {
    return {
      email: null,
      error:
        'No email linked to this Driver ID. Ask admin to set email on your driver profile.',
    };
  }
  return { email, error: null };
}
