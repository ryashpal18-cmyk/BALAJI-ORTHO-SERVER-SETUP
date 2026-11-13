import { queryClient } from "./queryClient";
import { supabase, usesApiSync } from "@/integrations/supabase/client";
import { cacheGetAll, cacheReplaceTable } from "./offlineDb";
import { fetchCompleteTable } from "./completeFetch";
import { isOnline } from "./offlineSync";
import { ensureCloudSession } from "./localSession";
import { attachPatients } from "./patientRecords";
export function inBranch(row: any, branch: string | null) { return !branch || row.branch_id === branch; }
const isMobileWeb = () => typeof window !== "undefined" && !(window as any).electron?.offline;
export async function readBranchTable(table: string, branch: string | null, select = "*") {
  let cached = await cacheGetAll(table);
  // Network refresh is independent of the screen's local read.
  const refresh = refreshBranchTable(table, select);
  // Mobile has no durable PC cache: on first open wait for the server instead of showing an empty list.
  if (isMobileWeb() && cached.length === 0) { await refresh; cached = await cacheGetAll(table); }
  const rows = cached.filter(row => inBranch(row, branch));
  return select.includes('patients(') ? attachPatients(rows, await cacheGetAll('patients')) : rows;
}
const refreshing = new Map<string, Promise<void>>();
const lastRefresh = new Map<string, number>();
function refreshBranchTable(table: string, select: string): Promise<void> {
  const running = refreshing.get(table);
  if (running) return running;
  if (Date.now() - (lastRefresh.get(table) || 0) < 5000) return Promise.resolve();
  const job = doRefreshBranchTable(table, select).finally(() => refreshing.delete(table));
  refreshing.set(table, job);
  return job;
}
async function doRefreshBranchTable(table: string, select: string) {
  try {
    if (!(await isOnline())) return;
    if (!(await ensureCloudSession())) return;

    const rows = await fetchCompleteTable(table, select);
    const before = JSON.stringify(await cacheGetAll(table));
    if (usesApiSync() && rows.length === 0 && (await cacheGetAll(table)).length > 0) return;
    await cacheReplaceTable(table, rows);
    lastRefresh.set(table, Date.now());
    if (before !== JSON.stringify(await cacheGetAll(table))) void queryClient.invalidateQueries();
  } catch { /* Network failure never blocks a local screen or wipes pending work. */ }
}
