import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cacheGetAll, commitBatch, tempId } from "@/lib/offlineDb";
import { patientImportKey, previewPatientImport } from "@/lib/patientImport";
import { runSync } from "@/lib/offlineSync";

async function loadPreview(rows: unknown[][]) {
  const existing = new Set<string>();
  for (const patient of await cacheGetAll("patients")) {
    try { existing.add(patientImportKey(patient.name, patient.mobile)); } catch { /* legacy record without a valid phone */ }
  }
  return previewPatientImport(rows, existing);
}

export function PatientImport() {
  const [rows, setRows] = useState<unknown[][]>();
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof loadPreview>>>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function open(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setRows(undefined);
    setPreview(undefined);
    setNotice("");
    try {
      if (!/\.(csv|xlsx)$/i.test(file.name) || file.size > 3 * 1024 * 1024) throw Error("CSV या XLSX फाइल चुनें, अधिकतम 3 MB।");
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: true, sheetRows: 502 });
      if (workbook.SheetNames.length !== 1) throw Error("फाइल में एक ही sheet रखें।");
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const imported = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: true, raw: true });
      setPreview(await loadPreview(imported));
      setRows(imported);
    } catch (error) { setNotice(error instanceof Error ? error.message : "फाइल नहीं खुली।"); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!rows || busy || !preview?.patients.length || preview.errors.length) return;
    setBusy(true);
    setNotice("");
    try {
      const current = await loadPreview(rows);
      setPreview(current);
      if (current.patients.length !== preview.patients.length) {
        setNotice("मरीज सूची बदल गई। नया preview देखकर फिर Import दबाएँ।");
        return;
      }
      const branches = (await cacheGetAll("branches")).filter(branch => branch.is_active);
      const selected = localStorage.getItem("bocc_selected_branch");
      const branch = branches.find(item => item.id === selected) ?? (branches.length === 1 ? branches[0] : null);
      if (!branch) throw Error("पहले अपनी सक्रिय branch चुनें।");
      if (!window.confirm(`${current.patients.length} नए मरीज ${branch.name} में जोड़ें?`)) return;
      const timestamp = new Date().toISOString();
      await commitBatch(current.patients.map(patient => {
        const id = tempId();
        const row = { ...patient, id, branch_id: branch.id, created_at: timestamp, _pendingSync: true };
        return { mutation: { table: "patients", op: "insert", tempId: id, payload: row }, row };
      }));
      setNotice(`${current.patients.length} मरीज PC पर सेव हुए। Cloud sync अलग से चलेगा।`);
      setRows(undefined);
      setPreview(undefined);
      void runSync().catch(() => {});
    } catch (error) { setNotice(error instanceof Error ? error.message : "Import नहीं हुआ।"); }
    finally { setBusy(false); }
  }

  return <Card className="my-4">
    <CardHeader><CardTitle>मरीज CSV / Excel Import</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm">पहली row में name, mobile और चाहें तो age, gender, address रखें। एक ही नाम और नंबर वाले रिकॉर्ड छूटेंगे। एक नंबर वाले अलग नाम अलग मरीज माने जाएँगे।</p>
      <Input aria-label="Patient CSV or Excel" type="file" accept=".csv,.xlsx" disabled={busy} onChange={event => { void open(event.target.files?.[0]); event.target.value = ""; }} />
      {preview && <div className="space-y-2 text-sm">
        <p>{preview.patients.length} नए · {preview.duplicates} पहले से मौजूद · {preview.errors.length} त्रुटियाँ</p>
        {preview.patients.slice(0, 5).map((patient, index) => <p key={index}>{patient.name} · ••••{patient.mobile.slice(-4)}</p>)}
        {!!preview.errors.length && <ul className="max-h-40 list-disc overflow-auto pl-5 text-destructive">{preview.errors.map(error => <li key={error}>{error}</li>)}</ul>}
        <Button disabled={busy || !preview.patients.length || !!preview.errors.length} onClick={() => void save()}>मरीज Import करें</Button>
      </div>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </CardContent>
  </Card>;
}
