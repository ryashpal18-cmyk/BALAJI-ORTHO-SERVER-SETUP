import {useState} from 'react';
import QRCode from 'qrcode';
import {getClinicProfile,saveClinicProfile,ClinicProfile} from '@/lib/clinicProfile';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {toast} from '@/hooks/use-toast';
const fields:[keyof ClinicProfile,string][]=[['name','Clinic / Hospital का नाम *'],['doctor','डॉक्टर का नाम'],['qualification','डॉक्टर की योग्यता'],['registration','डॉक्टर का रजिस्ट्रेशन नंबर'],['phone','संपर्क नंबर'],['address','पूरा पता'],['website','Website (https://...)'],['upi','UPI ID'],['invoicePrefix','बिल नंबर का शुरुआती कोड']];
export function ClinicProfileSettings({isAdmin}:{isAdmin:boolean}){
 const [profile,setProfile]=useState(getClinicProfile),[busy,setBusy]=useState(false);
 const update=(key:keyof ClinicProfile,value:string)=>setProfile(p=>({...p,[key]:value}));
 async function image(file?:File){
  if(!file)return;
  try{
   if(file.size>500*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('PNG, JPG या WebP logo चुनें; अधिकतम 500 KB।');
   const value=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Image नहीं पढ़ी गई।'));reader.readAsDataURL(file);});
   await new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(Error('सही image file चुनें।'));img.src=value;});
   update('logo',value);
  }catch(e:any){toast({title:e.message,variant:'destructive'});}
 }
 async function save(){
  if(!isAdmin||busy)return;setBusy(true);
  try{
   if(!profile.name.trim())throw Error('Clinic / Hospital का नाम भरें।');
   if(profile.upi&&!/^[A-Za-z0-9._-]{2,100}@[A-Za-z0-9.-]{2,50}$/.test(profile.upi.trim()))throw Error('UPI ID जाँचें।');
   const uri='upi://pay?'+new URLSearchParams({pa:profile.upi.trim(),pn:profile.name.trim(),cu:'INR'}).toString();
   const paymentQr=profile.upi.trim()?await QRCode.toDataURL(uri,{width:360,margin:4,errorCorrectionLevel:'M'}):'';
   await saveClinicProfile({...profile,paymentQr});
   toast({title:'Clinic profile सेव हो गई',description:'सॉफ्टवेयर नई जानकारी के साथ दोबारा खुल रहा है।'});
   window.location.reload();
  }catch(e:any){toast({title:'Profile सेव नहीं हुई',description:e.message,variant:'destructive'});setBusy(false);}
 }
 return <section className="rounded-xl border bg-card p-6 space-y-5">
  <h2 className="text-lg font-semibold">Clinic / Hospital Profile</h2>
  <p className="text-sm text-muted-foreground">एक बार जानकारी भरें। स्क्रीन, नए बिल, PDF, लेटरपैड और संदेशों पर यही जानकारी आएगी।</p>
  {!isAdmin&&<p role="status">Profile बदलने के लिए Admin login चाहिए।</p>}
  <fieldset disabled={!isAdmin||busy} className="space-y-4">
   <div className="grid gap-4 md:grid-cols-2">{fields.map(([key,label])=><div key={key} className={key==='address'?'md:col-span-2':''}><Label htmlFor={'clinic-'+key}>{label}</Label><Input id={'clinic-'+key} maxLength={key==='address'?700:200} value={profile[key]} onChange={e=>update(key,e.target.value)}/></div>)}</div>
   <div><Label htmlFor="clinic-logo">क्लिनिक Logo · PNG/JPG/WebP · 500 KB तक</Label><Input id="clinic-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void image(e.target.files?.[0])}/>{profile.logo&&<div className="flex items-center gap-3 mt-2"><img src={profile.logo} alt="Clinic logo preview" className="h-16 w-16 object-contain"/><Button variant="outline" onClick={()=>update('logo','')}>Logo हटाएँ</Button></div>}</div>
   <Button disabled={busy} onClick={()=>void save()}>{busy?'सेव हो रहा है…':'Profile सेव करें'}</Button>
  </fieldset>
  <div className="rounded-lg border p-5 space-y-1" aria-label="Clinic profile preview">
   {profile.logo&&<img src={profile.logo} alt="Clinic logo" className="h-16 object-contain"/>}
   <h3 className="text-xl font-bold break-words">{profile.name||'आपके Clinic / Hospital का नाम'}</h3>
   <p>{[profile.doctor,profile.qualification].filter(Boolean).join(' · ')}</p><p>{profile.registration&&'Reg. No. '+profile.registration}</p><p>{profile.address}</p><p>{profile.phone}</p><p>{profile.upi&&'Payment UPI: '+profile.upi}</p>
   <p className="text-xs text-muted-foreground">बिल नंबर उदाहरण: {profile.invoicePrefix||'INV'}-…</p>
  </div>
  <p className="text-sm text-muted-foreground">इस PC पर पुराने बिल जारी करने वाले क्लिनिक की जानकारी अलग सुरक्षित रहेगी और local backup में शामिल होगी। Profile बदलने से मरीज, बकाया या server connection नहीं बदलता। हर ग्राहक के लिए अलग installation / Windows profile और उसका अपना server रखें।</p>
 </section>;
}
