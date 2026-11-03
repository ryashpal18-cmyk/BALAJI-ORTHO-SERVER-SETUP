const fs = require('node:fs');
const { version } = require('../package.json');

const manifest = 'android/app/src/main/AndroidManifest.xml';
const iconDir = 'android/app/src/main/res/drawable-nodpi';
fs.mkdirSync(iconDir, { recursive: true });
fs.copyFileSync('public/bj-opd-icon.png', iconDir + '/bj_opd_icon.png');
fs.writeFileSync(manifest, fs.readFileSync(manifest, 'utf8')
  .replace('@mipmap/ic_launcher_round', '@drawable/bj_opd_icon')
  .replace('@mipmap/ic_launcher', '@drawable/bj_opd_icon')
  .replace('android:allowBackup="true"', 'android:allowBackup="false"'));

const gradle = 'android/app/build.gradle';
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 1000000 + minor * 1000 + patch;
fs.writeFileSync(gradle, fs.readFileSync(gradle, 'utf8')
  .replace(/versionCode \d+/, 'versionCode ' + versionCode)
  .replace(/versionName ".*"/, 'versionName "' + version + '"'));
