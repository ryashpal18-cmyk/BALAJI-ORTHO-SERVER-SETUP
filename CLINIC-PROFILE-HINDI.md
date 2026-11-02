# ग्राहक के नाम से सॉफ्टवेयर और बिल

Version 1.0.1 में Admin → Settings → Clinic / Hospital Profile खोलें। नाम अनिवार्य है। Logo, डॉक्टर का नाम, योग्यता, रजिस्ट्रेशन नंबर, पता, फोन, HTTPS website, UPI ID और बिल prefix भरकर सेव करें। स्क्रीन नई जानकारी के साथ reload होगी।

Logo PNG/JPG/WebP (500 KB तक) रखें। UPI ID भरने पर भुगतान QR अपने आप बनेगा और नए invoice/PDF में जाएगा। Clinic Family Profile QR अलग रहेगा। बिल/PDF, भुगतान रसीद, साधारण लेटरपैड, रिपोर्ट और default संदेशों में ग्राहक की जानकारी आएगी। पहले से सेव किए गए custom campaign messages को अपने नए नाम से जाँचकर फिर भेजें।

हर ग्राहक का अपना Supabase project, local admin और अलग Windows profile/installation रखें। Clinic Profile भरना server बदलने की कार्रवाई नहीं है; यह दूसरी clinic का डेटा अलग करने का विकल्प नहीं है। मूल clinic EXE/APK और BJ BACKUP में इस बदलाव से कोई संशोधन नहीं किया जाता।

पुराने बिल का issuer (नाम/पता/डॉक्टर/logo/UPI/bill prefix) इस PC के SQLite metadata में सुरक्षित रहता है। अगला profile परिवर्तन पुराने बिल को नहीं बदलता। ये snapshots full local backup में शामिल हैं। केवल cloud से दूसरे PC पर डेटा लाने पर local issuer snapshots नहीं मिलते; उस स्थिति में पुराने दस्तावेजों के सही issuer के लिए full local backup restore करें। Profile अभी PC-specific है।

Patient IDs और पहले से मौजूद registration numbers नहीं बदले जाते। Bill prefix प्रदर्शन पर लागू होता है; मूल bill ID, राशि और बकाया समान रहते हैं। Patient registration का BAOR allocation इस बदलाव में नहीं बदला गया है।
