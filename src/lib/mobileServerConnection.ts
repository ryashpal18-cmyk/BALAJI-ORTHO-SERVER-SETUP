const storageKey = "bj-opd-mobile-server";

export function readMobileServerConnection(): { url: string; key: string; name: string } | undefined {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : undefined;
  } catch {
    return undefined;
  }
}

export async function saveMobileServerConnection(projectUrl: string, key: string) {
  if (readMobileServerConnection()) {
    throw new Error("To change clinics, clear this app's data before connecting a new server.");
  }

  const url = new URL(projectUrl);
  if (url.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) || url.origin !== projectUrl.replace(/\/$/, "")) {
    throw new Error("Enter your clinic's Supabase project URL, such as https://project-id.supabase.co.");
  }

  let publicKey = /^sb_publishable_[\w-]+$/.test(key);
  if (!publicKey) {
    try {
      const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(payload));
      publicKey = claims.role === "anon" && claims.ref === url.hostname.split(".")[0];
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey) throw new Error("Enter the publishable or legacy anon key from your Supabase project.");
  const response = await fetch(url.origin + "/auth/v1/settings", {
    headers: { apikey: key }, signal: AbortSignal.timeout(10000), redirect: "error",
  }).catch(() => null);
  if (!response?.ok) throw new Error("कनेक्शन जाँच असफल। इंटरनेट, Project URL और public key जाँचें।");
  if (readMobileServerConnection()) throw new Error("Server connection already saved.");
  localStorage.setItem(storageKey, JSON.stringify({ url: url.origin, key, name: url.hostname }));
}
