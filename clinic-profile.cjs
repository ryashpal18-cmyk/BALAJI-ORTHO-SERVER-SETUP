'use strict';
const KEY = 'bjopd:clinic-profile:v1';
const clean = (value,max) => String(value == null ? '' : value).replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max);
const defaultProfile = Object.freeze({name:'',doctor:'',phone:'',address:''});
function normalize(input) {
  if(!input || typeof input !== 'object') throw Error('Clinic details are required');
  const p={name:clean(input.name,120),doctor:clean(input.doctor,100),phone:clean(input.phone,32),address:clean(input.address,240)};
  if(p.name.length<3) throw Error('Clinic / Hospital name must contain at least 3 characters');
  return p;
}
function profile(store) {
  const p=store.metaGet(KEY);
  return p && typeof p==='object' ? {...defaultProfile,...p} : {...defaultProfile};
}
function saveProfile(store,input) {
  const next=normalize(input);store.metaSet(KEY,next);return next;
}
function requireProfile(store){
  const p=profile(store);
  if(!p.name)throw Error('First save Clinic / Hospital name in Settings before generating patient messages or documents.');
  return p;
}
const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports={KEY,defaultProfile,normalize,profile,saveProfile,requireProfile,escapeHtml};
