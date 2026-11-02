'use strict';
// Synthetic fixtures only: no clinic server, SMS or WhatsApp connection.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const core=require('../clinic-profile.cjs'),{invoiceDocument}=require('../invoice-document.cjs');
const input={...core.emptyProfile,name:'Example & Ortho Clinic',doctor:'Test Doctor',qualification:'MS',registration:'TEST-42',phone:'9000000000',address:'Test Address',invoicePrefix:'EX'};
const profile=core.normalize(input);
for(const invalid of [{...input,name:''},{...input,logo:'https://example.test/x.png'},{...input,logo:'data:image/svg+xml;base64,AAAA'},{...input,upi:'wrong'},{...input,website:'javascript:alert(1)'},{...input,invoicePrefix:'<BAD>'}])assert.throws(()=>core.normalize(invalid));
const data=new Map(),bills=[{id:'local_abc',amount:1000,discount:100,amount_paid:600,service:'Balaji Ortho Care Center check:1000',created_at:'2026-11-02T05:00:00Z'}];
const store={metaGet:k=>data.get(k),metaSet:(k,v)=>data.set(k,structuredClone(v)),cacheGetAll:()=>bills};
core.save(store,profile);assert.equal(core.forBill(store,bills[0]).name,core.legacyProfile.name);
const fresh={...bills[0],id:'local_new'};bills.push(fresh);core.captureBill(store,fresh,profile);
core.save(store,{...profile,name:'Changed Clinic',invoicePrefix:'NEW'});
assert.equal(core.forBill(store,{id:'new'}).name,profile.name);assert.equal(core.forBill(store,{id:'new'}).invoicePrefix,'EX');
const qr='data:image/png;base64,AAAA';
const html=invoiceDocument(fresh,{id:'p1',name:'Balaji Ortho Care Center <script>bad</script>',mobile:'9000000000'},qr,{...profile,logo:qr,upi:'test@bank',paymentQr:qr});
assert.match(html,/Example &amp; Ortho Clinic/);assert.match(html,/Balaji Ortho Care Center &lt;script&gt;bad&lt;\/script&gt;/);assert.match(html,/Payment on QR/);assert.match(html,/EX-NEW/);assert.match(html,/₹300/);assert(!html.includes('<script>bad'));
assert.equal(core.brandText('Balaji Ortho Care Center',false,{...profile,name:'Balaji Ortho Care Center Test'}),'Balaji Ortho Care Center Test');
console.log('PASS profile validation, immutable old/new invoice issuers, prefix, logo, payment QR, escaped output, patient/service names unchanged');
// Exercise the real disk-store transaction code with the runtime's built-in SQLite.
const {DatabaseSync}=require('node:sqlite');
class Adapter{
 constructor(file){this.db=new DatabaseSync(file);this.depth=0;}
 pragma(s){this.db.exec('PRAGMA '+s);}exec(s){this.db.exec(s);}close(){this.db.close();}
 prepare(s){const st=this.db.prepare(s);return{all:(...a)=>st.all(...a),get:(...a)=>st.get(...a),run:(...a)=>st.run(...a)};}
 transaction(fn){return(...a)=>{const n='s'+(++this.depth);this.db.exec('SAVEPOINT '+n);try{const result=fn(...a);this.db.exec('RELEASE '+n);return result;}catch(e){this.db.exec('ROLLBACK TO '+n);this.db.exec('RELEASE '+n);throw e;}finally{this.depth--;}};}
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-profile-'));
const load=()=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','sqlite-store.cjs'),'utf8'),{module:m,require:n=>n==='better-sqlite3'?Adapter:n==='./logger.cjs'?{logInfo(){},logError(){}}:n==='./clinic-profile.cjs'?core:require(n)});m.exports.init(dir);return m.exports;};
let disk=load();disk.saveClinicProfile(profile);
const mutation={table:'billing',op:'insert',payload:fresh,tempId:fresh.id,createdAt:new Date().toISOString(),retries:0};
disk.commitMutation(mutation,fresh);disk.saveClinicProfile({...profile,name:'After Change'});assert.equal(core.forBill(disk,{id:'new'}).name,profile.name);
const count=disk.queueGetAll().length;assert.throws(()=>disk.saveClinicProfile({...profile,name:''}));assert.equal(core.current(disk).name,'After Change');assert.equal(disk.queueGetAll().length,count);
const snap=disk.snapshot();assert(snap.meta.some(m=>m.key===core.KEY));assert(snap.meta.some(m=>m.key===core.SNAP+'new'));
disk.close();disk=load();assert.equal(core.current(disk).name,'After Change');assert.equal(core.forBill(disk,{id:'local_new'}).name,profile.name);disk.close();fs.rmSync(dir,{recursive:true,force:true});
console.log('PASS real SQLite atomic save, invoice capture, rejected update rollback, backup metadata and restart persistence');
