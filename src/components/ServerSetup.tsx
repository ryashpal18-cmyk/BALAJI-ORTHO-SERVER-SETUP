import { useState } from 'react';
import { serverConnection } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function ServerSetup() {
  const api = (window as any).electron?.server;
  const [form, setForm] = useState({ name: serverConnection.name || '', url: serverConnection.url || '', key: serverConnection.key || '', email: '', password: '', ownerToken: '', confirmProject: '', authorized: false });
  const [setupNew, setSetupNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restart, setRestart] = useState(false);
  const [message, setMessage] = useState(serverConnection.url ? 'Saved server: ' + serverConnection.name : 'अपना Supabase project जोड़ें। इस edition में कोई default clinic server नहीं है।');
  if (!api) return <Card><CardContent>Server Setup इस अलग Windows EXE में उपलब्ध है।</CardContent></Card>;
  const change = (name: string, value: any) => { setForm(s => ({ ...s, [name]: value })); setRestart(false); };
  const run = async (method: string) => {
    if (busy) return;
    setBusy(true); setMessage(method === 'provision' ? 'Database, private Storage, admin और functions तैयार हो रहे हैं… App बंद न करें।' : 'Connection जाँची जा रही है…');
    try {
      const result = await api[method](form);
      setMessage(result.message || result.error || 'जाँच पूरी हुई।');
      setRestart(!!result.success && !!result.restartRequired);
    } catch { setMessage('Setup पूरा नहीं हुआ। App दोबारा खोलकर connection जाँचें।'); }
    finally { setForm(s => ({ ...s, password: '', ownerToken: '' })); setBusy(false); }
  };
  const field = (name: string, label: string, type = 'text', placeholder = '') => <div className="space-y-1" key={name}><Label htmlFor={'server-' + name}>{label}</Label><Input id={'server-' + name} type={type} value={(form as any)[name]} placeholder={placeholder} autoComplete={type === 'password' ? 'new-password' : 'off'} disabled={busy || restart} onChange={e => change(name, e.target.value)} /></div>;
  return <Card className="mb-6"><CardHeader><CardTitle>Server / Supabase Connection</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm" role="status" aria-live="polite">{message}</p>
    {field('name', 'Server Name', 'text', 'मेरी Clinic')}
    {field('url', 'Supabase Project URL', 'url', 'https://PROJECT-ID.supabase.co')}
    {field('key', 'Publishable / anon API Key', 'password')}
    <Button variant="outline" disabled={busy || restart} onClick={() => void run('check')}>Check Connection</Button>
    <p className="text-sm text-muted-foreground">Cloud Admin का email/password भरें। Supabase वेबसाइट के login से यह अलग है। Password save नहीं होगा; अगला cloud login Windows के सुरक्षित storage में session याद रखेगा।</p>
    {field('email', 'Cloud Admin Email', 'email')}{field('password', 'Cloud Admin Password', 'password')}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={setupNew} disabled={busy || restart} onChange={e => setSetupNew(e.target.checked)} />नया खाली Supabase project अपने आप तैयार करें</label>
    {setupNew && <div className="space-y-3 rounded border p-3">
      <p className="text-sm">पहले Supabase में account और नया project बनाएँ। फिर Account Settings → Access Tokens से अपना token लें। यह owner permission केवल इस setup के दौरान इस्तेमाल होगी और save नहीं होगी।</p>
      {field('ownerToken', 'Supabase Account Access Token — केवल पहली बार', 'password')}
      {field('confirmProject', 'चुने हुए project की ID दोबारा लिखें')}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.authorized} disabled={busy || restart} onChange={e => change('authorized', e.target.checked)} />यह मेरा नया project है। इसमें software की tables, functions, private Storage और admin बनाने की अनुमति देता हूँ।</label>
      <p className="text-xs text-muted-foreground">Existing clinic database पर नया setup नहीं चलेगा। SMS / WhatsApp संदेश नहीं भेजे जाएँगे।</p>
    </div>}
    <div className="flex flex-wrap gap-3"><Button disabled={busy || restart} onClick={() => void run(setupNew ? 'provision' : 'connect')}>{busy ? 'कृपया रुकें…' : setupNew ? 'Setup Server & Connect' : 'Save & Connect'}</Button>
    {restart && <Button onClick={() => void api.restart()}>Restart Software</Button>}</div>
  </CardContent></Card>;
}
