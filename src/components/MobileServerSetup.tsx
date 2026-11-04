import { useState, type FormEvent } from "react";
import { saveMobileServerConnection } from "@/lib/mobileServerConnection";

export function MobileServerSetup() {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await saveMobileServerConnection(url.trim(), key.trim());
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Server configuration could not be saved.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={connect} className="space-y-3 text-sm">
      <p>पहले Windows में तैयार किया हुआ अपना क्लिनिक सर्वर जोड़ें।</p>
      <label className="block">
        Supabase Project URL
        <input className="mt-1 w-full rounded border p-2" type="url" required
          value={url} onChange={event => setUrl(event.target.value)} />
      </label>
      <label className="block">
        Publishable / anon key
        <input className="mt-1 w-full rounded border p-2" type="password" required
          autoComplete="off" value={key} onChange={event => setKey(event.target.value)} />
      </label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded bg-blue-800 p-2 font-semibold text-white">
        {busy ? "जाँच हो रही है…" : "जाँचें और सेव करें"}
      </button>
    </form>
  );
}
