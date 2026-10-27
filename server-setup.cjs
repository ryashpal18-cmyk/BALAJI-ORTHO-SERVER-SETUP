'use strict';
// Desktop-only provisioning. Owner tokens, admin passwords and service keys are
// kept in memory for this request and never persisted, returned, or logged.
const fs = require('fs'), path = require('path');
function fail(message) { const e = new Error(message); e.safeMessage = message; throw e; }
function validate(input) {
  let url;
  try { url = new URL(String(input?.url || '').trim()); } catch { fail('Supabase Project URL सही भरें।'); }
  if (url.protocol !== 'https:' || !/^[a-z]{20}\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password || !['','/'].includes(url.pathname) || url.search || url.hash)
    fail('https://PROJECT-ID.supabase.co वाला Project URL भरें।');
  const key = String(input.key || '').trim();
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(key);
  if (!publicKey) {
    try { const p = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')); publicKey = p.role === 'anon' && p.ref === url.hostname.split('.')[0]; } catch {}
  }
  if (!publicKey || key.length > 8192) fail('Publishable / anon key भरें। Secret या service_role key यहाँ इस्तेमाल नहीं होगी।');
  const name = String(input.name || '').trim();
  if (!name || name.length > 100 || /[\r\n\x00-\x1f]/.test(name)) fail('Server Name सही भरें।');
  return { url: url.origin, key, name, ref: url.hostname.split('.')[0] };
}
function readConfig(file) {
  if (!fs.existsSync(file)) return { url: '', key: '', name: '' };
  try { const {ref, ...config} = validate(JSON.parse(fs.readFileSync(file, 'utf8'))); return config; }
  catch { fail('Saved server settings पढ़ी नहीं गईं। Data reset न करें; settings file की जाँच चाहिए।'); }
}
function createService({ configFile, current, fetchCloud, root, persistSession }) {
  let busy = false;
  function target(input) {
    const config = validate(input);
    // A populated device must never upload another clinic's queue by switching URL.
    const saved = fs.existsSync(configFile) ? readConfig(configFile) : current;
    if (saved.url && saved.url !== config.url) fail('इस installation का server पहले से तय है। दूसरी clinic के लिए अलग Windows profile / installation इस्तेमाल करें।');
    return config;
  }
  async function request(url, options, stage) {
    let r;
    try { r = await fetchCloud(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(45000) }); }
    catch { fail(stage + ': connection / timeout। फिर प्रयास करें।'); }
    if (!r.ok) fail(stage + `: HTTP ${r.status}। Project permissions और जानकारी जाँचें।`);
    try { return r.status === 204 ? null : await r.json(); } catch { fail(stage + ': server response सही नहीं मिला।'); }
  }
  async function cloud(config, endpoint, options = {}, stage = 'Cloud check') {
    return request(config.url + endpoint, { ...options, headers: { apikey: config.key, 'Content-Type': 'application/json', ...options.headers } }, stage);
  }
  async function check(input) {
    const c = target(input);
    await cloud(c, '/auth/v1/settings');
    return { success: true, message: 'Project URL और public key काम कर रहे हैं। Login और sync की अलग जाँच Save & Connect में होगी।' };
  }
  function credentials(input) {
    const email = String(input.email || '').trim().toLowerCase(), password = input.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 256)
      fail('Cloud Admin email और कम से कम 8 अक्षर का password भरें।');
    return { email, password };
  }
  async function verify(c, login) {
    const session = await cloud(c, '/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify(login) }, 'Cloud login');
    if (!session?.access_token) fail('Cloud login verification failed।');
    const headers = { Authorization: 'Bearer ' + session.access_token };
    try {
      const profile = await cloud(c, '/functions/v1/session-access', { method: 'POST', headers }, 'Admin permission');
      if (profile.role !== 'admin' || profile.userId !== session.user?.id) fail('इस account को cloud admin permission नहीं है।');
      const marker = await cloud(c, '/rest/v1/clinic_installation?select=schema_version&id=eq.true', { headers }, 'Schema version');
      if (marker?.length !== 1 || marker[0].schema_version !== 1) fail('इस project में compatible Server Setup schema नहीं है।');
      await cloud(c, '/rest/v1/patients?select=id&limit=1', { headers }, 'Patient read access');
      await cloud(c, '/rest/v1/billing?select=id&limit=1', { headers }, 'Bill read access');
      return session;
    } catch (error) {
      await cloud(c, '/auth/v1/logout?scope=local', { method: 'POST', headers }, 'Test sign-out').catch(() => {});
      throw error;
    }
  }
  async function save(c, session) {
    const record = { name: c.name, url: c.url, key: c.key };
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    const temp = configFile + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(record, null, 2), { mode: 0o600 });
    if (!persistSession) fail('Secure session storage unavailable।');
    await persistSession(c, session);
    fs.renameSync(temp, configFile);
    return { success: true, restartRequired: true, message: 'Server और secure cloud session save हो गए। Restart Software दबाएँ; sync अपने आप शुरू होगा।' };
  }
  async function connect(input) {
    if (busy) fail('Setup पहले से चल रहा है।'); busy = true;
    try { const c = target(input), login = credentials(input); return await save(c, await verify(c, login)); }
    finally { busy = false; }
  }
  async function provision(input) {
    if (busy) fail('Setup पहले से चल रहा है।'); busy = true;
    try {
      const c = target(input), login = credentials(input);
      const token = String(input.ownerToken || '').trim();
      if (token.length < 20 || token.length > 8192 || /\s/.test(token)) fail('Supabase Account Access Token भरें। यह केवल पहली बार setup की permission के लिए है।');
      if (input.confirmProject !== c.ref || input.authorized !== true) fail('Project ID लिखकर खाली project setup की अनुमति दें।');
      const mgmt = (endpoint, options = {}, stage = 'Owner permission') => request('https://api.supabase.com/v1/projects/' + c.ref + endpoint,
        { ...options, headers: { Authorization: 'Bearer ' + token, ...options.headers } }, stage);
      const sql = query => mgmt('/database/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }, 'Database setup');
      const info = await mgmt('');
      if (info.id !== c.ref || info.status !== 'ACTIVE_HEALTHY') fail('Project तैयार नहीं है या owner access नहीं मिला।');
      await check(input);
      const tables = await sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
      if (!Array.isArray(tables)) fail('Database inspection response सही नहीं मिला।');
      if (!tables.length) {
        // schema.sql repeats the empty-schema guard INSIDE the transaction.
        await sql(fs.readFileSync(path.join(root, 'server-setup/schema.sql'), 'utf8'));
      } else {
        if (!tables.some(t => t.tablename === 'clinic_installation')) fail('यह खाली project नहीं है। Existing clinic / पुराने database पर नया setup नहीं चलाया गया।');
        const marker = await sql('SELECT schema_version FROM public.clinic_installation WHERE id=true');
        if (marker?.[0]?.schema_version !== 1) fail('Unsupported database version; setup रोका गया।');
      }
      const keys = await mgmt('/api-keys?reveal=true');
      if (!Array.isArray(keys)) fail('Project API keys नहीं मिलीं।');
      const secret = keys.find(k => k.type === 'secret')?.api_key || keys.find(k => k.name === 'service_role')?.api_key;
      if (!secret) fail('Project की server API key उपलब्ध नहीं है। Supabase Dashboard में API keys enable करें।');
      const admin = (endpoint, options = {}, stage = 'Admin setup') => cloud(c, endpoint, { ...options, headers: { apikey: secret, ...(secret.startsWith('sb_secret_') ? {} : { Authorization: 'Bearer ' + secret }), ...options.headers } }, stage);
      // Existing users are never reset and no email is dispatched by this setup.
      const q = s => "'" + s.replaceAll("'", "''") + "'";
      let users = await sql('SELECT id FROM auth.users WHERE lower(email)=' + q(login.email));
      let userId = users?.[0]?.id;
      const owner = await sql('SELECT owner_user_id FROM public.clinic_installation WHERE id=true');
      if (owner?.[0]?.owner_user_id && owner[0].owner_user_id !== userId) fail('यह setup पहले से दूसरे admin से जुड़ा है। Existing admin से login करें।');
      if (!userId) {
        const created = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ ...login, email_confirm: true }) });
        userId = created.id || created.user?.id;
      }
      if (!/^[0-9a-f-]{36}$/i.test(userId || '')) fail('Admin user verification failed।');
      await sql(`BEGIN; SELECT pg_advisory_xact_lock(821734,2); DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.clinic_installation WHERE id=true AND owner_user_id IS NOT NULL AND owner_user_id<>${q(userId)}::uuid) THEN RAISE EXCEPTION 'Owner changed'; END IF; END $$; INSERT INTO public.user_roles(user_id,role) VALUES(${q(userId)}::uuid,'admin') ON CONFLICT DO NOTHING; UPDATE public.clinic_installation SET owner_user_id=${q(userId)}::uuid WHERE id=true; COMMIT;`);
      for (const bucket of ['invoices','xray-files','patient-files']) {
        const exists = await admin('/storage/v1/bucket', {}, 'Storage check');
        if (!exists.some(b => b.id === bucket)) await admin('/storage/v1/bucket', { method: 'POST', body: JSON.stringify({ id: bucket, name: bucket, public: false }) }, 'Private storage setup');
        else if (exists.some(b => b.id === bucket && b.public)) fail('Storage bucket public है; setup ने उसकी permission नहीं बदली। पहले owner review करें।');
      }
      await sql(fs.readFileSync(path.join(root, 'server-setup/storage.sql'), 'utf8'));
      for (const name of ['session-access','create-admin-user']) {
        const form = new FormData();
        form.append('metadata', JSON.stringify({ name, entrypoint_path: 'index.ts', verify_jwt: true }));
        form.append('file', new Blob([fs.readFileSync(path.join(root, 'server-setup', name + '.zip'))], { type: 'application/zip' }), 'function.zip');
        await mgmt('/functions/deploy?slug=' + name, { method: 'POST', body: form }, 'Cloud function ' + name);
      }
      return await save(c, await verify(c, login));
    } finally { busy = false; }
  }
  return { check, connect, provision };
}
module.exports = { validate, readConfig, createService };
