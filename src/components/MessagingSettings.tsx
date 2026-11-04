import { useEffect, useState, type FormEvent } from "react";
import { WhatsAppApiSettings } from "@/components/WhatsAppApiSettings";
import { WhatsAppConnection } from "@/components/WhatsAppConnection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runSync } from "@/lib/offlineSync";

type SmsStatus = { configured: boolean; deviceId: string; error: string };
type MessagingBridge = {
  smsStatus: () => Promise<SmsStatus>;
  smsConnect: (input: { apiKey: string; deviceId: string }) => Promise<SmsStatus>;
  smsDisconnect: () => Promise<SmsStatus>;
};

export function MessagingSettings() {
  const bridge: MessagingBridge | undefined = (window as any).electron?.messaging;
  const [status, setStatus] = useState<SmsStatus>();
  const [deviceId, setDeviceId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bridge) return;
    let active = true;
    bridge.smsStatus().then(result => {
      if (!active) return;
      setStatus(result);
      setDeviceId(result.deviceId);
    }).catch(() => { if (active) setError("SMS सेटिंग पढ़ी नहीं जा सकी।"); });
    return () => { active = false; };
  }, [bridge]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bridge || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await bridge.smsConnect({ apiKey, deviceId });
      setStatus(result);
      setDeviceId(result.deviceId);
      setApiKey("");
      setNotice("TextBee डिवाइस सत्यापित और सेव हुआ। यह जाँच कोई SMS नहीं भेजती।");
      void runSync({ retrySmsConfig: true }).catch(() => {});
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "TextBee कनेक्शन जाँच असफल हुई।");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!bridge || busy || !window.confirm("SMS कनेक्शन हटाएँ? Pending SMS सुरक्षित रहेंगे।")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setStatus(await bridge.smsDisconnect());
      setDeviceId("");
      setApiKey("");
    } catch {
      setError("SMS कनेक्शन हटाया नहीं जा सका।");
    } finally {
      setBusy(false);
    }
  }

  if (!bridge) return <p>SMS और WhatsApp gateway सेटअप BJ OPD Windows EXE में उपलब्ध है।</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>SMS · TextBee</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={connect} className="space-y-3">
            <p className="text-sm">TextBee खाते में अपना SIM वाला Android फोन जोड़ें। Dashboard से API Key और Device ID कॉपी करें।</p>
            <p className="text-sm" role="status">{notice || (status?.configured ? "TextBee कनेक्शन सेव है।" : "SMS कनेक्शन जोड़ें।")}</p>
            {(error || status?.error) && <p role="alert" className="text-sm text-destructive">{error || status?.error}</p>}
            <div className="space-y-1">
              <Label htmlFor="textbee-device">Device ID</Label>
              <Input id="textbee-device" required maxLength={128} autoComplete="off" value={deviceId}
                disabled={busy || !status} onChange={event => setDeviceId(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="textbee-key">API Key</Label>
              <Input id="textbee-key" required maxLength={512} type="password" autoComplete="new-password" value={apiKey}
                disabled={busy || !status} onChange={event => setApiKey(event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || !status}>{busy ? "कृपया प्रतीक्षा करें…" : "जाँचें और जोड़ें"}</Button>
              {status?.configured && <Button type="button" variant="outline" disabled={busy} onClick={() => void disconnect()}>Disconnect</Button>}
            </div>
            <p className="text-xs text-muted-foreground">कनेक्शन सेव होने के बाद pending SMS सामान्य नियमों के अनुसार भेजे जाएँगे। अनिश्चित delivery वाले SMS समीक्षा में रहेंगे।</p>
          </form>
        </CardContent>
      </Card>
      <WhatsAppApiSettings />
      <WhatsAppConnection />
    </div>
  );
}
