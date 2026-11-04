export type ClinicProfile = {name:string;doctor:string;phone:string;address:string; registration_prefix?:string; invoice_prefix?:string};
export const CLINIC_PROFILE_KEY='bjopd:clinic-profile:v1';
export const emptyClinicProfile:ClinicProfile={name:'',doctor:'',phone:'',address:''};
const clean=(s:unknown,max:number)=>String(s??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max);
export function getClinicProfile():ClinicProfile{
  try {
    const value=JSON.parse(localStorage.getItem(CLINIC_PROFILE_KEY)||'null');
    return value&&typeof value==='object'?{
      name:clean(value.name,120),doctor:clean(value.doctor,100),
      phone:clean(value.phone,32),address:clean(value.address,240),
      ...(value.registration_prefix ? {registration_prefix:clean(value.registration_prefix,12)} : {}),
      ...(value.invoice_prefix ? {invoice_prefix:clean(value.invoice_prefix,12)} : {})
    }:{...emptyClinicProfile};
  }catch{return {...emptyClinicProfile};}
}
export function saveClinicProfile(profile:ClinicProfile):ClinicProfile{
  const value={name:clean(profile.name,120),doctor:clean(profile.doctor,100),
    phone:clean(profile.phone,32),address:clean(profile.address,240),
    ...(profile.registration_prefix ? {registration_prefix:clean(profile.registration_prefix,12)} : {}),
    ...(profile.invoice_prefix ? {invoice_prefix:clean(profile.invoice_prefix,12)} : {})};
  if(value.name.length<3)throw Error('Clinic / Hospital name is required (minimum 3 characters)');
  localStorage.setItem(CLINIC_PROFILE_KEY,JSON.stringify(value));
  window.dispatchEvent(new Event('bjopd:clinic-profile-changed'));
  return value;
}
export function requireClinicProfile():ClinicProfile {
  const p=getClinicProfile();
  if(!p.name)throw Error('पहले Settings → Clinic Info में अपने Clinic / Hospital का नाम Save करें।');
  return p;
}
