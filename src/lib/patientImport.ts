import { normalizeIndianMobile } from "./mobile";

export type ImportedPatient = { name: string; mobile: string; age?: number; gender?: string; address?: string };

export function patientImportKey(name: string, mobile: string) {
  return JSON.stringify([name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase(), normalizeIndianMobile(mobile)]);
}

export function previewPatientImport(rows: unknown[][], existing: Set<string>) {
  const header = rows[0]?.map(cell => String(cell ?? "").trim().toLowerCase()) ?? [];
  if (!header.includes("name") || !header.includes("mobile") || new Set(header).size !== header.length) {
    throw new Error("पहली row में अलग-अलग name और mobile columns चाहिए। Optional columns: age, gender, address.");
  }
  if (rows.length > 501) throw new Error("एक बार में अधिकतम 500 मरीज import करें।");
  const patients: ImportedPatient[] = [];
  const errors: string[] = [];
  const seen = new Set(existing);
  let duplicates = 0;
  for (const [index, cells] of rows.slice(1).entries()) {
    if (!cells.some(value => String(value ?? "").trim())) continue;
    const get = (column: string) => String(cells[header.indexOf(column)] ?? "").trim();
    try {
      const name = get("name");
      const rawMobile = get("mobile");
      if (!name || name.length > 120 || !/^[+()\d\s-]+$/.test(rawMobile)) throw Error("नाम या मोबाइल गलत है");
      const mobile = normalizeIndianMobile(rawMobile);
      if (!/^91[6-9]\d{9}$/.test(mobile)) throw Error("सही भारतीय मोबाइल नंबर चाहिए");
      const ageText = get("age");
      const age = Number(ageText);
      if (ageText && (!/^\d{1,3}$/.test(ageText) || age > 125)) throw Error("उम्र 0–125 रखें");
      const gender = get("gender").toLowerCase();
      if (gender && !["male", "female", "other"].includes(gender)) throw Error("gender में Male, Female या Other रखें");
      const address = get("address");
      if (address.length > 500) throw Error("पता 500 अक्षरों तक रखें");
      const key = patientImportKey(name, mobile);
      if (seen.has(key)) { duplicates++; continue; }
      seen.add(key);
      patients.push({ name, mobile, ...(ageText ? { age } : {}), ...(gender ? { gender } : {}), ...(address ? { address } : {}) });
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : "Invalid record"}`);
    }
  }
  return { patients, errors, duplicates };
}
