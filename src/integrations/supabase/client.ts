import { boundedFetch } from "@/lib/boundedFetch";
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const serverConnection = (window as any).electron?.server?.publicConfig() || { url: '', key: '', name: '' };
const url = serverConnection.url || 'https://unconfigured.invalid';
const key = serverConnection.key || 'sb_publishable_unconfigured';
const authenticatedClient = createClient<Database>(url, key, {
  global: { fetch: (input, init) => serverConnection.url ? boundedFetch(input, init) : Promise.reject(new Error('Settings → Server Setup में अपना server जोड़ें।')) },
  auth: { storage: localStorage, persistSession: !(window as any).electron, autoRefreshToken: !(window as any).electron }
});
// Desktop refresh credentials are held by the OS-encrypted main process.
export const supabase = authenticatedClient;
export function usesApiSync() { return false; }
