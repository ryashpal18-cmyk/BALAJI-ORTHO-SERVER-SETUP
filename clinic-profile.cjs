'use strict';
const KEY='clinic-profile:v1';
const SNAP='clinic-profile:bill:';
const emptyProfile={name:'',doctor:'',qualification:'',registration:'',phone:'',address:'',website:'',upi:'',logo:'',paymentQr:'',invoicePrefix:'INV'};
const legacyProfile={...emptyProfile,name:'Balaji Digital X-Ray & Ortho Care Center',doctor:'Dr. S. S. Rathore',qualification:'BPT, MPT, DMRT',phone:'+91 8005707783',address:'Opp Govt Hospital, Bay Pass Road, Khinwara, Rajasthan – 306502'};
function normalize(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Clinic profile चाहिए।');
 const p={...emptyProfile};
 for(const k of Object.keys(p)){
  if(typeof input[k]!=='string'&&input[k]!=null)throw Error('Invalid clinic field: '+k);
  p[k]=String(input[k]??p[k]).trim();
  if(!['logo','paymentQr'].includes(k)&&p[k].length>(k==='address'?700:200))throw Error('Clinic field बहुत लंबी है: '+k);
 }
 if(!p.name)throw Error('Clinic / Hospital का नाम भरें।');
 if(!/^[A-Za-z0-9-]{1,12}$/.test(p.invoicePrefix))throw Error('Bill prefix में 1–12 अक्षर, अंक या hyphen रखें।');
 if(p.website&&!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s<>]*)?$/.test(p.website))throw Error('Website का सही HTTPS पता भरें।');
 if(p.upi&&!/^[A-Za-z0-9._-]{2,100}@[A-Za-z0-9.-]{2,50}$/.test(p.upi))throw Error('UPI ID जाँचें।');
 for(const k of ['logo','paymentQr'])if(p[k]&&(p[k].length>750000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p[k])))throw Error('Logo / QR में PNG, JPG या WebP image (500 KB तक) रखें।');
 if(p.upi&&!p.paymentQr)throw Error('UPI QR तैयार नहीं हुआ; दोबारा save करें।');
 return p;
}
const id=value=>String(value||'').replace(/^local_/,'');
function current(store){return {...emptyProfile,...(store.metaGet(KEY)||{})};}
function captureBill(store,bill,profile){
 const key=SNAP+id(bill.id);let p=store.metaGet(key);
 if(!p){p={...(profile||store.metaGet(KEY)||legacyProfile)};store.metaSet(key,p);}
 return p;
}
function forBill(store,bill){return captureBill(store,bill);}
function save(store,input){
 const p=normalize(input);
 // Seal every old invoice with its previous issuer before changing the profile.
 // Caller wraps this and the profile write in one SQLite transaction.
 const previous=store.metaGet(KEY)||legacyProfile;
 for(const bill of store.cacheGetAll('billing'))captureBill(store,bill,previous);
 store.metaSet(KEY,p);return p;
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function brandText(value,html=false,profile=emptyProfile){
 const p={...emptyProfile,...profile};
 if(!p.name)p.name="Clinic / Hospital";
 const rules=[
 ['Balaji Digital X-Ray &amp; Ortho Care Center',p.name],['BALAJI DIGITAL X-RAY & ORTHO CARE CENTER',p.name],['Balaji Digital X-Ray & Ortho Care Center',p.name],['Balaji Ortho Care Center',p.name],['Balaji Ortho Care Connect',p.name],['Balaji Ortho Care',p.name],
 ['Dr. S. S. Rathore (DMRT | BPT)',[p.doctor,p.qualification].filter(Boolean).join(' · ')],['Dr. S. S. Rathore',p.doctor],['डॉ. एस. एस. राठौड़',p.doctor],['Dr. Rathore',p.doctor],['BPT, MPT, DMRT',p.qualification],['DMRT | BPT',p.qualification],
 ['Opp Govt Hospital, Bay Pass Road, Khinwara, Rajasthan – 306502',p.address],['Opp Govt Hospital, Bay Pass Road, Khinwara, Raj. – 306502',p.address],['Opp Govt Hospital, Bay Pass Road, Khinwara',p.address],['Khinwara, Raj. – 306502',p.address],['Khinwara, Rajasthan — 306502',p.address],['Khinwara, Rajasthan',p.address],['Khinwara',p.address],
 ['+91 8005707783',p.phone],['80057 07783',p.phone],['8005707783',p.phone],['https://balaji-health-hub.lovable.app/',p.website]
 ];
 // Replace in one pass: customer-supplied names must never be transformed again.
 const map=new Map(rules); const re=new RegExp(rules.map(([s])=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 return String(value??'').replace(re,s=>html?esc(map.get(s)):map.get(s));
}
module.exports={KEY,SNAP,emptyProfile,legacyProfile,normalize,current,captureBill,forBill,save,esc,brandText};
