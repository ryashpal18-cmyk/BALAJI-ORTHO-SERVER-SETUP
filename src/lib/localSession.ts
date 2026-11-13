import { supabase } from "@/integrations/supabase/client";
import { STORAGE_KEYS } from "./appConfig";

export function displaySession(profile: any) {
  localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, "true");
  localStorage.setItem(STORAGE_KEYS.USER_NAME, profile.displayName || profile.email || "Admin");
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, profile.role);
  localStorage.setItem(STORAGE_KEYS.USER_PERMS, JSON.stringify(profile.pages || []));
}

// ─── Mobile / browser: remember the cloud login ──────────────────────────
// Supabase already keeps the refresh token on the phone (persistSession). We also keep the
// last verified access profile so a weak network does not throw the user back to the login form.
const WEB_PROFILE_KEY = "bj-opd-web-profile";
export function rememberWebProfile(profile: any) {
  try { localStorage.setItem(WEB_PROFILE_KEY, JSON.stringify(profile)); } catch { /* storage full: login still works */ }
}
export function forgetWebProfile() { localStorage.removeItem(WEB_PROFILE_KEY); }
const validProfile = (p: any) => p && ["admin", "staff"].includes(p.role) && Array.isArray(p.pages);

/** Returns the verified profile for the saved phone login, or null when the user must sign in again. */
export async function webSessionProfile(): Promise<any | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("session-access");
  if (!error && validProfile(data)) { rememberWebProfile(data); return data; }
  const status = (error as any)?.context?.status;
  if (status === 401 || status === 403) { forgetWebProfile(); return null; }
  // Network / server hiccup: keep the same user's last verified access.
  try {
    const cached = JSON.parse(localStorage.getItem(WEB_PROFILE_KEY) || "null");
    if (validProfile(cached) && cached.userId === session.user.id) return cached;
  } catch { /* corrupt cache → sign in again */ }
  if (error) throw error;
  return null;
}

let connecting: Promise<boolean> | null = null;
let verifiedIdentity = "";
let validUntil = 0;
let lastCloudError = "";
let adoptionTried = false;
export function resetCloudConnection() { verifiedIdentity = ""; validUntil = 0; adoptionTried = false; lastCloudError = ""; }
export function cloudConnectionError() { return lastCloudError; }

export async function ensureCloudSession(): Promise<boolean> {
  const bridge = (window as any).electron;
  if (!bridge?.checkAuth) return !!(await supabase.auth.getSession()).data.session;
  const auth = await bridge.checkAuth();
  if (!auth.valid) return false;
  if (!auth.principal?.localAdmin) return !!(await supabase.auth.getSession()).data.session;
  const identity = auth.principal.sessionKey;
  if (verifiedIdentity === identity && Date.now() < validUntil) return true;
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      let result = await bridge.syncSession();
      // Migrate only this project's existing session. Never read old embedded passwords.
      if (!result?.success && !adoptionTried && bridge.adoptSyncSession) {
        adoptionTried = true;
        const current = (await supabase.auth.getSession()).data.session;
        const ref = new URL((supabase as any).supabaseUrl).hostname.split(".")[0];
        let saved = current;
        if (!saved) {
          try { saved = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || "null"); } catch {}
        }
        if (saved?.access_token && saved?.refresh_token && (await bridge.checkAuth()).principal?.sessionKey === identity) {
          await bridge.adoptSyncSession(saved);
          result = await bridge.syncSession();
          if (result?.success) localStorage.removeItem(`sb-${ref}-auth-token`);
        }
      }
      if (!result?.success) { lastCloudError = result?.error || "Settings → Cloud Sync में cloud connection जोड़ें"; return false; }
      if ((await bridge.checkAuth()).principal?.sessionKey !== identity) return false;
      const { error } = await supabase.auth.setSession(result.session);
      if (error) throw error;
      if ((await bridge.checkAuth()).principal?.sessionKey !== identity) {
        await supabase.auth.signOut({ scope: "local" }); return false;
      }
      verifiedIdentity = identity;
      validUntil = Math.min(Date.now() + 60000, result.session.expires_at * 1000 - 60000);
      lastCloudError = "";
      return true;
    } catch (error: any) { lastCloudError = error?.message || "Cloud connection unavailable"; return false; }
  })();
  try { return await connecting; } finally { connecting = null; }
}
