import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cacheGetAll, commitBatch } from "@/lib/offlineDb";
import { previewBillingImport } from "@/lib/billingImport";
import { runSync } from "@/lib/offlineSync";

async function previewRows(rows: unknown[][]) {
  const [branches, patients, bills] = await Promise.all([cacheGetAll("branches"), cacheGetAll("patients"), cacheGetAll("billing")]);
  const active = branches.filter(branch => branch.is_active);
  const selected = localStorage.getItem("bocc_selected_branch");
  const branch = active.find(item => item.id === selected) ?? (active.length === 1 ? active[0] : null);
  if (!branch) throw Error("पहले सक्रिय branch चुनें।");
  const preview = await previewBillingImport(rows, patients, branch.id, new Set(bills.map(bill => String(bill.id).replace(/^local_/, ""))));
  return { ...preview, branch };
}

export function BillingImport() {
  const [rows, setRows] = useState<unknown[][]>();
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewRows>>>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function open(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setRows(undefined);
    setPreview(undefined);
    setNotice("");
    try {
      if (!/\.(csv|xlsx)$/i.test(file.name) || file.size > 3 * 1024 * 1024) throw Error("CSV या XLSX फाइल चुनें, अधिकतम 3 MB।");
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array", raw: true, sheetRows: 502 });
      if (book.SheetNames.length !== 1) throw Error("फाइल में एक ही sheet रखें।");
      const data = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[book.SheetNames[0]], { header: 1, raw: true, blankrows: true });
      setPreview(await previewRows(data));
      setRows(data);
    } catch (error) { setNotice(error instanceof Error ? error.message : "फाइल नहीं खुली।"); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!rows || !preview?.bills.length || preview.errors.length || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const current = await previewRows(rows);
      setPreview(current);
      if (current.errors.length || current.branch.id !== preview.branch.id ||
          JSON.stringify(current.bills) !== JSON.stringify(preview.bills)) {
        setNotice("Branch या मरीज/बिल की जानकारी बदली है। नया preview देखें।");
        return;
      }
      if (!window.confirm(`${current.bills.length} पुराने बिल ${current.branch.name} में जोड़ें?`)) return;
      await commitBatch(current.bills.map(({ row }) => ({
        mutation: { table: "billing", op: "insert", tempId: row.id, payload: row, historicalImport: true }, row,
      })));
      setNotice(`${current.bills.length} पुराने बिल PC पर सेव हुए। Cloud sync अलग से चलेगा।`);
      setRows(undefined);
      setPreview(undefined);
      void runSync().catch(() => {});
    } catch (error) { setNotice(error instanceof Error ? error.message : "Import नहीं हुआ।"); }
    finally { setBusy(false); }
  }

  return <Card className="my-4">
    <CardHeader><CardTitle>पुराने बिल और बकाया Import</CardTitle></CardHeader>
    <CardContent className="space-y-3 text-sm">
      <p>Columns: invoice, registration_number, service, bill_date, amount, paid, discount (वैकल्पिक)। जमा राशि हो तो payment_date और payment_mode भी दें। तारीख YYYY-MM-DD में और तारीख वाले Excel cells को Text रखें।</p>
      <p>पहले मरीजों का registration number तैयार रखें। हर बिल की एक पंक्ति और जमा रकम की एक ऐतिहासिक receipt बनेगी। पुराने invoice का reference bill notes में रहेगा।</p>
      <Input aria-label="Billing CSV or Excel" type="file" accept=".csv,.xlsx" disabled={busy} onChange={event => { void open(event.target.files?.[0]); event.target.value = ""; }} />
      {preview && <>
        <p>{preview.branch.name} · {preview.bills.length} नए · {preview.duplicates} पहले से import हुए · {preview.errors.length} त्रुटियाँ</p>
        {preview.bills.slice(0, 5).map(bill => <p key={bill.invoice}>{bill.invoice} · बकाया ₹{bill.due.toFixed(2)}</p>)}
        {!!preview.errors.length && <ul className="max-h-40 list-disc overflow-auto pl-5 text-destructive">{preview.errors.map(error => <li key={error}>{error}</li>)}</ul>}
        <Button disabled={busy || !preview.bills.length || !!preview.errors.length} onClick={() => void save()}>बिल Import करें</Button>
      </>}
      {notice && <p role="status">{notice}</p>}
    </CardContent>
  </Card>;
}
