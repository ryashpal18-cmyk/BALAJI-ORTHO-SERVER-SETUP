'use strict';
// Runs the actual entrypoint, real preload and compiled renderer on Windows CI.
// Fresh app/profile directories, synthetic local owner; never contacts a clinic server.
const {app}=require('electron'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'server-setup-native-'));
fs.mkdirSync(path.join(dir,'appdata'),{recursive:true});app.setPath('appData',path.join(dir,'appdata'));
fs.mkdirSync(path.join(dir,'documents'),{recursive:true});app.setPath('documents',path.join(dir,'documents'));
let finished=false;
const timer=setTimeout(()=>{console.error('Native server setup smoke timed out');app.exit(1)},60000);
app.on('browser-window-created',(_event,win)=>{
 win.webContents.once('did-finish-load',async()=>{
  try{
   await new Promise(r=>setTimeout(r,1500));
   const config=await win.webContents.executeJavaScript('window.electron.server.publicConfig()');assert.equal(config.url,'');assert.equal(config.key,'');
   const profile=await win.webContents.executeJavaScript(`window.electron.offlineSetup({identifier:'synthetic-owner@example.test',secret:'Synthetic-only-9382',confirmSecret:'Synthetic-only-9382',remember:false})`);assert(profile.success);
   await win.webContents.executeJavaScript(`localStorage.setItem('isLoggedIn','true');localStorage.setItem('bocc_user_role','admin');localStorage.setItem('bocc_user_perms','[]');location.hash='#/settings'`);
   let visible=false;
   for(let n=0;n<50;n++){visible=await win.webContents.executeJavaScript(`!!document.getElementById('server-url')`);if(visible)break;await new Promise(r=>setTimeout(r,100));}
   assert(visible,'Settings Server Setup card not rendered');
   const result=await win.webContents.executeJavaScript(`window.electron.server.check({name:'Test',url:'https://127.0.0.1',key:'sb_publishable_abcdefgh12345678'})`);assert.equal(result.success,false);
   assert(!fs.existsSync(path.join(dir,'appdata','BalajiOrthoServerSetup','server-connection.json')));
   const shot=await win.webContents.capturePage();fs.mkdirSync(path.join(__dirname,'..','release'),{recursive:true});fs.writeFileSync(path.join(__dirname,'..','release','server-setup-preview.png'),shot.toPNG());
   console.log('PASS native fresh launch, empty server, isolated data folder, real preload, local admin setup, Settings fields and invalid URL rejection.');finished=true;clearTimeout(timer);app.exit(0);
  }catch(e){console.error(e);clearTimeout(timer);app.exit(1);}
 });
});
require('../main.js');
