export type ClinicProfile={name:string;doctor:string;qualification:string;registration:string;phone:string;address:string;website:string;upi:string;logo:string;paymentQr:string;invoicePrefix:string};
const emptyProfile:ClinicProfile={name:'',doctor:'',qualification:'',registration:'',phone:'',address:'',website:'',upi:'',logo:'',paymentQr:'',invoicePrefix:'INV'};
const KEY='clinic-profile:v1';
const bridge=()=>typeof window==='undefined'?undefined:(window as any).electron?.clinicProfile;
let cachedProfile:ClinicProfile|undefined;
export function getClinicProfile():ClinicProfile {
 if(cachedProfile)return {...cachedProfile};
 try{cachedProfile={...emptyProfile,...(bridge()?.get()||JSON.parse(localStorage.getItem(KEY)||'null')||{})};return {...cachedProfile};}catch{return {...emptyProfile};}
}
export function getBillClinicProfile(billId:unknown):ClinicProfile {
 const api=bridge(); if(api) return {...emptyProfile,...(api.forBill(String(billId||''))||getClinicProfile())};
 try{return {...emptyProfile,...JSON.parse(localStorage.getItem(KEY+':bill:'+String(billId).replace(/^local_/,''))||'null')||getClinicProfile()};}catch{return getClinicProfile();}
}
export async function saveClinicProfile(p:ClinicProfile):Promise<void>{
 const api=bridge(); if(!api)throw Error('Clinic profile सेव करने के लिए desktop EXE खोलें।');
 const result=await api.save(p);if(!result?.success)throw Error(result?.error||'Clinic profile सेव नहीं हुई।');
}
export const clinicLogo=(profile:ClinicProfile=getClinicProfile())=>profile.logo||'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function brandText(value: unknown,html=false,profile: ClinicProfile=getClinicProfile()){
 const p={...emptyProfile,...profile};
 if(!p.name)p.name="Clinic / Hospital";
 const rules:[string,string][]=[
 ['Balaji Digital X-Ray &amp; Ortho Care Center',p.name],['BALAJI DIGITAL X-RAY & ORTHO CARE CENTER',p.name],['Balaji Digital X-Ray & Ortho Care Center',p.name],['Balaji Ortho Care Center',p.name],['Balaji Ortho Care Connect',p.name],['Balaji Ortho Care',p.name],
 ['Dr. S. S. Rathore (DMRT | BPT)',[p.doctor,p.qualification].filter(Boolean).join(' · ')],['Dr. S. S. Rathore',p.doctor],['डॉ. एस. एस. राठौड़',p.doctor],['Dr. Rathore',p.doctor],['BPT, MPT, DMRT',p.qualification],['DMRT | BPT',p.qualification],
 ['Opp Govt Hospital, Bay Pass Road, Khinwara, Rajasthan – 306502',p.address],['Opp Govt Hospital, Bay Pass Road, Khinwara, Raj. – 306502',p.address],['Opp Govt Hospital, Bay Pass Road, Khinwara',p.address],['Khinwara, Raj. – 306502',p.address],['Khinwara, Rajasthan — 306502',p.address],['Khinwara, Rajasthan',p.address],['Khinwara',p.address],
 ['+91 8005707783',p.phone],['80057 07783',p.phone],['8005707783',p.phone],['https://balaji-health-hub.lovable.app/',p.website]
 ];
 // Replace in one pass: customer-supplied names must never be transformed again.
 const map=new Map(rules); const re=new RegExp(rules.map(([s])=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 return String(value??'').replace(re,s=>html?esc(map.get(s)):map.get(s));
}
