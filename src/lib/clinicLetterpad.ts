import {getClinicProfile} from './clinicProfile';
import {buildLetterpadHtml,LetterpadField,LetterpadLayout} from './letterpadPrint';
import {escapeHtml as e} from './safeReportHtml';
export function buildClinicLetterpadHtml(values:Record<LetterpadField,string>,layout:LetterpadLayout){
 const p=getClinicProfile();
 const header=`<header style="position:absolute;left:12mm;right:12mm;top:8mm;height:40mm;border-bottom:2px solid #145c80;text-align:center;color:#145c80;overflow:hidden">${p.logo?`<img src="${e(p.logo)}" alt="Clinic logo" style="width:16mm;height:16mm;object-fit:contain;float:left">`:''}<h1 style="margin:0;font-size:22pt;overflow-wrap:anywhere">${e(p.name)}</h1><p style="margin:3mm 0 1mm">${e([p.doctor,p.qualification].filter(Boolean).join(' · '))}</p><p style="margin:1mm">${e(p.registration&&'Reg. No. '+p.registration)}</p><p style="margin:1mm;font-size:10pt">${e(p.address)} · ${e(p.phone)}</p></header><footer style="position:absolute;bottom:8mm;left:12mm;right:12mm;border-top:1px solid #145c80;font-size:10pt;text-align:center">${e(p.website)}</footer>`;
 return buildLetterpadHtml(values,{...layout,labels:true}).replace('<body>','<body>'+header);
}
