import { normalizeBill, withPaymentHistory } from "./paymentLedger";

const canonical = (id: string) => id.replace(/^local_/, "");
const text = (value: unknown) => String(value ?? "").trim();

function amountInPaise(value: string, required = false) {
  if (!value && !required) return 0;
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) throw Error("राशि दशमलव के अधिकतम दो अंकों में दें");
  return Math.round(Number(value) * 100);
}

function dateInIndia(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error("तारीख YYYY-MM-DD में दें");
  const day = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(+day) || day.toISOString().slice(0, 10) !== value) throw Error("तारीख गलत है");
  return new Date(value + "T12:00:00+05:30").toISOString();
}

async function billIdentity(branch: string, invoice: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(["bjopd-legacy-invoice-v1", canonical(branch), invoice.toUpperCase()]))));
  hash[6] = (hash[6] & 15) | 128;
  hash[8] = (hash[8] & 63) | 128;
  const hex = Array.from(hash.slice(0, 16), n => n.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

type Patient = { id: string; registration_number?: string; branch_id?: string };
export async function previewBillingImport(rows: unknown[][], patients: Patient[], branch: string, existing: Set<string>) {
  const header = rows[0]?.map(cell => text(cell).toLowerCase()) ?? [];
  const required = ["invoice", "registration_number", "service", "bill_date", "amount", "paid"];
  if (required.some(key => !header.includes(key)) || new Set(header).size !== header.length) throw Error("सभी जरूरी columns अलग-अलग रखें: " + required.join(", "));
  if (rows.length > 501) throw Error("एक बार में अधिकतम 500 बिल import करें।");
  const byRegistration = new Map<string, Map<string, Patient>>();
  for (const patient of patients) {
    const registration = text(patient.registration_number).toUpperCase();
    if (!registration || !patient.branch_id || canonical(patient.branch_id) !== canonical(branch)) continue;
    const group = byRegistration.get(registration) ?? new Map<string, Patient>();
    group.set(canonical(patient.id), patient);
    byRegistration.set(registration, group);
  }

  const errors: string[] = [];
  const bills: Array<{ invoice: string; due: number; row: ReturnType<typeof withPaymentHistory> }> = [];
  const seen = new Set<string>();
  let duplicates = 0;
  for (const [index, cells] of rows.slice(1).entries()) {
    if (!cells.some(text)) continue;
    const get = (column: string) => text(cells[header.indexOf(column)]);
    try {
      const invoice = get("invoice"), service = get("service");
      if (!invoice || invoice.length > 100 || /[\x00-\x1f]/.test(invoice) || !service || service.length > 500) throw Error("Invoice reference या service गलत है");
      const id = await billIdentity(branch, invoice);
      if (seen.has(id)) throw Error("इस फाइल में invoice reference दो बार आया है");
      seen.add(id);
      if (existing.has(id)) { duplicates++; continue; }
      const group = byRegistration.get(get("registration_number").toUpperCase());
      if (group?.size !== 1) throw Error("चुनी branch में एक सही registration number चाहिए");
      const patient = [...group.values()][0];
      const amount = amountInPaise(get("amount"), true);
      const discount = amountInPaise(get("discount"));
      const paid = amountInPaise(get("paid"), true);
      if (discount + paid > amount) throw Error("छूट और जमा राशि बिल से अधिक हैं");
      const created_at = dateInIndia(get("bill_date"));
      const paidAt = paid ? dateInIndia(get("payment_date")) : created_at;
      if (paidAt < created_at) throw Error("भुगतान की तारीख बिल से पहले नहीं हो सकती");
      const payment_mode = ["Cash", "UPI", "Card", "Bank Transfer"].find(mode => mode.toLowerCase() === get("payment_mode").toLowerCase());
      if (paid && !payment_mode) throw Error("जमा राशि के लिए payment_mode भरें");
      const row = withPaymentHistory({ id, amount_paid: 0 }, normalizeBill({
        id: "local_" + id, patient_id: patient.id, branch_id: branch, service, created_at,
        amount: amount / 100, discount: discount / 100, amount_paid: paid / 100,
        payment_mode: payment_mode ?? null, notes: "Imported invoice: " + invoice, _pendingSync: true,
      }), "import-" + id, paidAt);
      bills.push({ invoice, due: (amount - discount - paid) / 100, row });
    } catch (error) { errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : "Invalid bill"}`); }
  }
  return { bills, duplicates, errors };
}
