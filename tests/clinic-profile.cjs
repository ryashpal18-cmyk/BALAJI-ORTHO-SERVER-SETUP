'use strict';
const assert=require('node:assert/strict');
const {profile,saveProfile,requireProfile,escapeHtml}=require('../clinic-profile.cjs');
const {invoiceDocument}=require('../invoice-document.cjs');
const map=new Map(),store={metaGet:key=>map.get(key),metaSet:(key,value)=>map.set(key,value)};
assert.equal(profile(store).name,'');
assert.throws(()=>requireProfile(store),/Clinic/);
assert.throws(()=>saveProfile(store,{name:'  '}),/Clinic/);
const registered=saveProfile(store,{name:'Shree Care & Clinic',doctor:'Dr. Test',phone:'1234567890',address:'Market Road'});
assert.equal(requireProfile(store).name,'Shree Care & Clinic');
const html=invoiceDocument({amount:200,discount:10,amount_paid:100,service:'X-Ray:200',created_at:new Date().toISOString(),id:'bill01'},
  {id:'patient01',name:'Patient',mobile:'9000000000'},'data:image/png;base64,AAAA',registered);
assert.ok(html.includes('Shree Care &amp; Clinic'));
assert.ok(!html.includes('Balaji'));
assert.equal(escapeHtml('<script>'),'&lt;script&gt;');
console.log('PASS clinic profile registration, persistence, validation, and invoice PDF branding');

{
  const profile = require('../clinic-profile.cjs');
  let value;
  const store = { metaGet: () => value, metaSet: (_key, next) => { value = next; } };
  const local = { name: 'Synthetic Clinic', doctor: '', phone: '', address: '' };
  profile.saveProfile(store, local);
  const uploaded = profile.syncState(store);
  profile.saveProfile(store, { ...local, name: 'Newer Synthetic Clinic' });
  assert.equal(profile.acceptCloud(store, { ...local, revision: uploaded.pending }, uploaded), null);
  const newer = profile.syncState(store);
  assert.equal(newer.revision, uploaded.pending);
  assert.equal(newer.profile.name, 'Newer Synthetic Clinic');
  assert.equal(profile.acceptCloud(store, { ...newer.profile, revision: newer.pending }, newer).name, 'Newer Synthetic Clinic');
  assert.equal(profile.syncState(store).pending, null);
  console.log('PASS sync acknowledgement cannot overwrite a newer offline clinic edit');
}
