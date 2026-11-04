import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fields = [
  ["document", "बिल / स्टेटमेंट / मासिक PDF"],
  ["receipt", "Payment confirmation"],
  ["bulk", "Bulk / follow-up"],
  ["festival", "Festival greetings"],
] as const;

type Templates = Partial<Record<(typeof fields)[number][0], string>>;
type ApiStatus = { active: boolean; configured: boolean; phoneId: string; displayPhone: string; language: string; templates: Templates };
type ApiBridge = {
  apiStatus: () => Promise<ApiStatus>;
  apiConnect: (input: { phoneId: string; token: string; language: string; templates: Templates }) => Promise<ApiStatus>;
  useQr: () => Promise<ApiStatus>;
};

export function WhatsAppApiSettings() {
  const bridge: ApiBridge | undefined = (window as any).electron?.whatsapp;
  const [status, setStatus] = useState<ApiStatus>();
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [language, setLanguage] = useState("hi");
  const [templates, setTemplates] = useState<Templates>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function apply(result: ApiStatus) {
    setStatus(result);
    setPhoneId(result.phoneId);
    setLanguage(result.language);
    setTemplates(result.templates);
    setToken("");
  }

  useEffect(() => {
    if (!bridge?.apiStatus) return;
    let active = true;
    bridge.apiStatus().then(result => { if (active) apply(result); })
      .catch(() => { if (active) setError("WhatsApp API सेटिंग पढ़ी नहीं जा सकी।"); });
    return () => { active = false; };
  }, [bridge]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bridge || busy) return;
    if (!status?.active && !window.confirm("WhatsApp queue अब सेट किए गए Meta नंबर से भेजेगी। API मोड चालू करें?")) return;
    setError("");
    setBusy(true);
    try {
      apply(await bridge.apiConnect({ phoneId: phoneId.trim(), token: token.trim(), language: language.trim(), templates }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "WhatsApp API कनेक्शन जाँच असफल हुई।");
    } finally {
      setBusy(false);
    }
  }

  async function useQr() {
    if (!bridge || busy || !window.confirm("सेव किया API token हटाएँ और WhatsApp queue को QR मोड पर वापस लाएँ?")) return;
    setError("");
    setBusy(true);
    try { apply(await bridge.useQr()); }
    catch { setError("QR मोड पर वापस नहीं जा सके।"); }
    finally { setBusy(false); }
  }

  if (!bridge?.apiStatus) return null;

  return (
    <Card>
      <CardHeader><CardTitle>WhatsApp भेजने का तरीका</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p role="status">{status?.active
          ? status.configured ? `Meta Cloud API · ${status.displayPhone}` : "Meta Cloud API · credentials दोबारा जोड़ें"
          : "WhatsApp Web · QR मोड"}</p>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <details open={status?.active || undefined}>
          <summary className="cursor-pointer">Meta WhatsApp Cloud API सेटअप (वैकल्पिक)</summary>
          <form className="mt-3 space-y-3" onSubmit={connect}>
            <p className="text-sm">Meta WhatsApp Manager से अपना Phone Number ID, Access Token और स्वीकृत templates लें। सिर्फ सहमति देने वाले प्राप्तकर्ताओं को संदेश भेजें।</p>
            <Label htmlFor="wa-api-phone-id">Phone Number ID</Label>
            <Input id="wa-api-phone-id" inputMode="numeric" required maxLength={30} value={phoneId} disabled={busy || !status} onChange={e => setPhoneId(e.target.value)} />
            <Label htmlFor="wa-api-token">Access Token</Label>
            <Input id="wa-api-token" type="password" autoComplete="new-password" required maxLength={4096} value={token} disabled={busy || !status} onChange={e => setToken(e.target.value)} />
            <Label htmlFor="wa-api-language">Template language code (hi, en_US)</Label>
            <Input id="wa-api-language" required maxLength={8} value={language} disabled={busy || !status} onChange={e => setLanguage(e.target.value)} />
            <p className="text-sm">PDF template में Document header और body में एक positional variable (क्लिनिक का नाम) रखें। Text templates में header media के बिना body में एक positional variable (संदेश) रखें। कम से कम एक template जोड़ें।</p>
            {fields.map(([kind, label]) => (
              <div key={kind}>
                <Label htmlFor={`wa-template-${kind}`}>{label} template</Label>
                <Input id={`wa-template-${kind}`} maxLength={128} value={templates[kind] ?? ""} disabled={busy || !status}
                  onChange={e => setTemplates(current => ({ ...current, [kind]: e.target.value.trim() }))} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || !status}>API जाँचें और चालू करें</Button>
              {status?.active && <Button type="button" variant="outline" disabled={busy} onClick={() => void useQr()}>QR मोड पर लौटें</Button>}
            </div>
            <p className="text-xs text-muted-foreground">जाँच Meta नंबर और token की है। Template approval और delivery Meta में देखें।</p>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
