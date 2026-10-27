# अलग Server Setup edition

यह मूल clinic EXE से अलग appId, installer, Windows userData, SQLite, backup folder और update repository इस्तेमाल करता है। कोई default Supabase URL, clinic user या API secret bundle में नहीं है। Source baseline: original EXE main commit 4786325e0b12629065d045df9b0e11877a966ccf.

1. EXE खोलें और अपना offline owner login बनाएँ।
2. Settings → Server / Supabase Connection खोलें।
3. अपना Server Name, hosted Supabase Project URL और publishable / anon key भरें। Check Connection से endpoint/key जाँचें।
4. नये खाली project के लिए checkbox चुनें। Supabase Account Settings → Access Tokens से owner token लें। Cloud Admin email/password और confirm Project ID भरकर अनुमति दें। Setup Server & Connect दबाएँ।
5. 31 tables (30 app tables और installation marker), registration sequence, checked RPC functions, admin role, private Storage buckets और आवश्यक login/admin Edge Functions बनेंगे। Existing nonempty unrelated project पर setup रुकता है। अधूरा compatible setup फिर शुरू किया जा सकता है।
6. Restart Software दबाएँ। Secure cloud session Windows encrypted storage में याद रहेगा; patient/bill काम offline-first रहेगा।
7. अगली PC installation में उसी prepared server को जोड़ने के लिए नया schema न बनाएँ। उसी URL/key/admin के साथ Save & Connect इस्तेमाल करें।

Owner token, plaintext password और server secret key local config/log में save नहीं किए जाते। सामान्य काम publishable key + user session से चलता है। नए project की Auth user creation admin API से होती है; signup email/SMS/WhatsApp नहीं भेजे जाते। Setup पूरा होने पर owner अपना temporary access token Supabase Dashboard से revoke कर सकता है।

एक installation को दूसरे clinic के project पर switch करना रोका गया है ताकि offline queue गलत cloud में upload न हो। दूसरी clinic अलग Windows profile/installation इस्तेमाल करे। किसी दूसरे clinic के records या पुराने Balaji backup को अपने आप import नहीं किया जाता।

यह EXE edition है; मूल APK और EXE repositories अपरिवर्तित हैं। OAuth “Sign in with Supabase” registration इस build में नहीं है; owner token वाला स्पष्ट first-time setup है। AI provider और SMS gateway credentials इस server setup का हिस्सा नहीं हैं।

Validation: local schema execution/RLS/registration/billing checks, mocked HTTP provisioning/resume/secret-handling tests, TypeScript and Vite build. CI also runs actual Windows Electron launch and Settings/preload smoke. New live customer project provisioning needs a separate end-to-end device/project test before commercial distribution.
