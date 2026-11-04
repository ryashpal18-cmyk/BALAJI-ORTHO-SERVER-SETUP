import { serverConnection, supabase } from "@/integrations/supabase/client";
import { saveClinicProfile, type ClinicProfile } from "./clinicProfile";

type CloudProfile = ClinicProfile & { revision: string };
type SyncState = { profile: ClinicProfile; revision: string | null; pending: string | null };

let active: Promise<void> | undefined;

export function syncClinicProfile(admin: boolean, useCloud = false) {
  if (!serverConnection.url || !navigator.onLine) return Promise.resolve();
  if (active) return useCloud ? active.catch(() => {}).then(() => syncClinicProfile(admin, true)) : active;
  active = performSync(admin, useCloud).finally(() => { active = undefined; });
  return active;
}

async function performSync(admin: boolean, useCloud: boolean) {
  const bridge = (window as any).electron;
  const state: SyncState | undefined = admin && bridge?.clinicSyncState ? await bridge.clinicSyncState() : undefined;
  const table = () => (supabase as any).from("bjopd_clinic_profile");
  const columns = "name,doctor,phone,address,registration_prefix,invoice_prefix,revision";
  const { data, error } = await table().select(columns).eq("id", true).maybeSingle();
  if (error) throw Error(error.message);
  let remote = data as CloudProfile | null;

  if (useCloud && !remote) throw Error("Server पर Clinic Info उपलब्ध नहीं है।");
  if (state?.profile.name && !useCloud && (state.pending || !remote)) {
    const revision = state.pending || crypto.randomUUID();
    if (remote?.revision !== revision) {
      if (remote && remote.revision !== state.revision) {
        throw Error("Server की Clinic Info दूसरे PC पर बदली है। Settings में Server की जानकारी लोड करें, फिर बदलाव दोबारा सेव करें।");
      }
      const next = { ...state.profile, revision };
      const query = remote
        ? table().update(next).eq("id", true).eq("revision", state.revision)
        : table().insert({ id: true, ...next });
      const result = await query.select(columns).maybeSingle();
      if (result.error) throw Error(result.error.message);
      if (!result.data) throw Error("Server की Clinic Info बदल गई। दोबारा sync करें।");
      remote = result.data;
    }
  }
  if (!remote) return;
  if (state) {
    const saved = await bridge.acceptClinicCloud({ row: remote, expected: { revision: state.revision, pending: state.pending } });
    if (saved) saveClinicProfile(saved);
  } else {
    saveClinicProfile(remote);
  }
}
