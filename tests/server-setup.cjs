'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {validate,readConfig,createService}=require('../server-setup.cjs');
const c={name:'Test Clinic',url:'https://abcdefghijklmnopqrst.supabase.co',key:'sb_publishable_abcdefgh12345678'},user='00000000-0000-4000-8000-000000000001';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-server-test-')),file=path.join(dir,'connection.json');
const secret='TEST-OWNER-TOKEN-NEVER-SAVE',password='TEST-PASSWORD-NEVER-SAVE';
(async()=>{
 for(const url of ['http://abcdefghijklmnopqrst.supabase.co','https://abcdefghijklmnopqrst.supabase.co.evil.test','https://user:secret@abcdefghijklmnopqrst.supabase.co','https://abcdefghijklmnopqrst.supabase.co/path','https://127.0.0.1'])assert.throws(()=>validate({...c,url}));
 for(const key of ['sb_secret_privileged',Buffer.from('x').toString('base64')])assert.throws(()=>validate({...c,key}));
 assert.equal(readConfig(file).url,'');
 let installed=false,persisted=0,deployed=[],buckets=[],requests=[];
 const response=data=>({ok:true,status:200,json:async()=>data});
 const fake=async(url,options={})=>{
  requests.push({url,options});
  assert.equal(options.redirect,'error');assert(options.signal);
  if(url.endsWith('/auth/v1/settings'))return response({});
  if(url.endsWith('/auth/v1/token?grant_type=password'))return response({access_token:'ACCESS',refresh_token:'REFRESH',user:{id:user},expires_at:9999999999});
  if(url.endsWith('/functions/v1/session-access'))return response({role:'admin',userId:user,pages:[]});
  if(url.includes('/rest/v1/clinic_installation'))return response([{schema_version:1}]);
  if(url.includes('/rest/v1/patients')||url.includes('/rest/v1/billing'))return response([]);
  if(url.endsWith('/auth/v1/logout?scope=local'))return response({});
  if(url.endsWith('/v1/projects/abcdefghijklmnopqrst'))return response({id:'abcdefghijklmnopqrst',status:'ACTIVE_HEALTHY'});
  if(url.endsWith('/api-keys?reveal=true'))return response([{type:'secret',api_key:'sb_secret_TEST'}]);
  if(url.endsWith('/auth/v1/admin/users'))return response({id:user});
  if(url.endsWith('/storage/v1/bucket')){if(options.method==='POST')buckets.push(JSON.parse(options.body));return response(buckets);}
  if(url.includes('/functions/deploy?slug=')){deployed.push(url.split('slug=')[1]);assert(options.body instanceof FormData);return response({});}
  if(url.endsWith('/database/query')){
   const q=JSON.parse(options.body).query;
   if(q.startsWith('SELECT tablename'))return response(installed?[{tablename:'clinic_installation'}]:[]);
   if(q.includes('CREATE TYPE')){assert(q.startsWith('BEGIN;'));assert(q.trim().endsWith('COMMIT;'));installed=true;return response([]);}
   if(q.startsWith('SELECT schema_version'))return response([{schema_version:1}]);
   if(q.startsWith('SELECT owner_user_id'))return response([{owner_user_id:null}]);
   if(q.startsWith('SELECT id FROM auth.users'))return response([{id:user}]);
   return response([]);
  }
  throw Error('Unexpected fake endpoint '+url);
 };
 const service=createService({configFile:file,current:readConfig(file),root:path.join(__dirname,'..'),fetchCloud:fake,persistSession:async(config,session)=>{assert.equal(config.url,c.url);assert.equal(session.refresh_token,'REFRESH');persisted++;}});
 assert((await service.check(c)).success);assert(!fs.existsSync(file));
 const input={...c,email:'owner@example.test',password,ownerToken:secret,authorized:true,confirmProject:'abcdefghijklmnopqrst'};
 await assert.rejects(service.provision({...input,authorized:false}));
 assert((await service.provision(input)).success);assert.equal(persisted,1);assert.deepEqual(deployed,['session-access','create-admin-user']);assert.equal(buckets.length,3);assert(buckets.every(b=>b.public===false));
 const text=fs.readFileSync(file,'utf8');for(const s of [secret,password,'sb_secret_TEST','ACCESS','REFRESH'])assert(!text.includes(s));
 assert.equal(readConfig(file).url,c.url);
 const before=requests.length;
 await assert.rejects(service.check({...c,url:'https://zyxwvutsrqponmlkjihg.supabase.co'}));assert.equal(requests.length,before);
 installed=true;assert((await service.provision(input)).success); // Interrupted setup can resume safely.
 assert((await service.connect(input)).success);
 const bad=createService({configFile:path.join(dir,'other.json'),current:{},root:path.join(__dirname,'..'),fetchCloud:async()=>({ok:false,status:401,json:async()=>({password,secret})})});
 await assert.rejects(bad.check(c),e=>!e.message.includes(secret)&&!e.message.includes(password));
 console.log('PASS: URL/secret rejection, project isolation, empty setup/resume, private buckets, functions, login verification, encrypted-session handoff, no credentials in saved config. No live SMS or cloud writes.');
})().finally(()=>fs.rmSync(dir,{recursive:true,force:true})).catch(e=>{console.error(e);process.exitCode=1;});
