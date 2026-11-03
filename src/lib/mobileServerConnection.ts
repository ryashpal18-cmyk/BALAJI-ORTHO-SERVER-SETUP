const storageKey = "bj-opd-mobile-server";

export function readMobileServerConnection(): { url: string; key: string; name: string } | undefined {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : undefined;
  } catch {
    return undefined;
  }
}

export function saveMobileServerConnection(projectUrl: string, key: string) {
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
      publicKey = JSON.parse(atob(payload)).role === "anon";
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey) throw new Error("Enter the publishable or legacy anon key from your Supabase project.");
  localStorage.setItem(storageKey, JSON.stringify({ url: url.origin, key, name: url.hostname }));
}
