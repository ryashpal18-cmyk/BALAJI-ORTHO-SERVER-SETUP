import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClinicProfile, saveClinicProfile } from "@/lib/clinicProfile";
import { cacheGetAll } from "@/lib/offlineDb";
import { offlineInsert } from "@/lib/offlineQuery";

type Props = { onProfileSaved: () => void; onOpenBackup: () => void; onOpenMessaging: () => void };

export function ClinicSetupWizard({ onProfileSaved, onOpenBackup, onOpenMessaging }: Props) {
  const [step, setStep] = useState(() => getClinicProfile().name ? 0 : 1);
  const [profile, setProfile] = useState(getClinicProfile);
  const [branchName, setBranchName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fields = [["name", "Clinic name"], ["doctor", "Doctor"], ["phone", "Phone"], ["address", "Address"]] as const;

  async function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (step === 1) {
        const bridge = (window as any).electron;
        if (!bridge?.saveClinicProfile) throw Error("Windows clinic settings unavailable.");
        const saved = await bridge.saveClinicProfile(profile);
        setProfile(saveClinicProfile(saved));
        onProfileSaved();
        const branches = await cacheGetAll("branches");
        setStep(branches.some(branch => branch.is_active) ? 3 : 2);
      } else {
        const active = (await cacheGetAll("branches")).filter(branch => branch.is_active);
        if (!active.length) {
          const name = branchName.trim();
          if (name.length < 2) throw Error("Branch का नाम कम से कम 2 अक्षरों में रखें।");
          const saved = await offlineInsert("branches", { name, is_active: true });
          localStorage.setItem("bocc_selected_branch", saved.id);
        } else if (active.length === 1) {
          localStorage.setItem("bocc_selected_branch", active[0].id);
        }
        setStep(3);
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "सेटअप सेव नहीं हुआ।"); }
    finally { setBusy(false); }
  }

  return <Card className="mb-4">
    <CardHeader><CardTitle>Clinic Setup {step ? `· ${step}/3` : ""}</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {!step && <Button variant="outline" onClick={() => { setProfile(getClinicProfile()); setStep(1); }}>सेटअप खोलें</Button>}
      {step > 0 && step < 3 && <form onSubmit={next} className="space-y-2">
        {step === 1 ? fields.map(([key, label]) => <div key={key}>
          <Label htmlFor={`setup-${key}`}>{label}</Label>
          <Input id={`setup-${key}`} required={key === "name"} maxLength={key === "address" ? 240 : key === "phone" ? 32 : 120}
            disabled={busy} value={profile[key]} onChange={event => setProfile(current => ({ ...current, [key]: event.target.value }))} />
        </div>) : <div>
          <Label htmlFor="setup-branch">पहली branch का नाम</Label>
          <Input id="setup-branch" required maxLength={120} disabled={busy} value={branchName} onChange={event => setBranchName(event.target.value)} />
        </div>}
        <Button disabled={busy} type="submit">{busy ? "सेव हो रहा है…" : "सेव करें और आगे बढ़ें"}</Button>
      </form>}
      {step === 3 && <>
        <p className="text-sm">क्लिनिक और branch तैयार हैं। अब Backup, Messaging या नीचे Server Setup खोल सकते हैं।</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setStep(0); onOpenBackup(); }}>Backup</Button>
          <Button variant="outline" onClick={() => { setStep(0); onOpenMessaging(); }}>Messaging</Button>
          <Button onClick={() => setStep(0)}>पूरा करें</Button>
        </div>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </CardContent>
  </Card>;
}
