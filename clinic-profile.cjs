'use strict';
const { randomUUID } = require('node:crypto');
const KEY = 'bjopd:clinic-profile:v1';
const clean = (value,max) => String(value == null ? '' : value).replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max);
const defaultProfile = Object.freeze({name:'',doctor:'',phone:'',address:''});
function normalize(input) {
  if(!input || typeof input !== 'object') throw Error('Clinic details are required');
  const p={name:clean(input.name,120),doctor:clean(input.doctor,100),phone:clean(input.phone,32),address:clean(input.address,240)};
  for (const key of ['registration_prefix', 'invoice_prefix']) {
    const prefix = input[key]?.trim?.().toUpperCase();
    if (prefix && !/^[A-Z]{2,12}$/.test(prefix)) throw Error('Prefix must be 2–12 letters');
    if (prefix) p[key] = prefix;
  }
  if(p.name.length<3) throw Error('Clinic / Hospital name must contain at least 3 characters');
  return p;
}
function profile(store) {
  const p=store.metaGet(KEY);
  if (!p || typeof p !== 'object' || !p.name) return {...defaultProfile};
  return normalize(p);
}
function saveProfile(store,input) {
  const previous = store.metaGet(KEY);
  const next = normalize({...previous, ...input});
  store.metaSet(KEY, {...next, revision: previous?.revision ?? null, pending: randomUUID()});
  return next;
}
function syncState(store) {
  const saved = store.metaGet(KEY);
  return { profile: profile(store), revision: saved?.revision ?? null, pending: saved?.pending ?? null };
}
function acceptCloud(store, row, expected) {
  const current = syncState(store);
  if (current.revision !== expected?.revision) return null;
  if (current.pending !== expected?.pending) {
    if (current.pending && expected.pending && row?.revision === expected.pending) {
      store.metaSet(KEY, {...current.profile, revision: row.revision, pending: current.pending});
    }
    return null;
  }
  if (typeof row?.revision !== 'string' || !/^[0-9a-f-]{36}$/i.test(row.revision)) throw Error('Invalid clinic revision');
  const next = normalize(row);
  store.metaSet(KEY, {...next, revision: row.revision, pending: null});
  return next;
}
function requireProfile(store){
  const p=profile(store);
  if(!p.name)throw Error('First save Clinic / Hospital name in Settings before generating patient messages or documents.');
  return p;
}
const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports={KEY,defaultProfile,normalize,profile,saveProfile,requireProfile,escapeHtml,syncState,acceptCloud};
