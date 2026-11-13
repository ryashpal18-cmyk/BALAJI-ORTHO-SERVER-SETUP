# Supabase manual setup (Access Token के बिना)

Supabase वेबसाइट पर SQL खुद चलाकर BJ OPD को cloud से जोड़ने का तरीका। यह **सिर्फ़ एक बार**, **नए खाली project** पर करना है।

## 1. Project बनाएँ
supabase.com/dashboard → **New project** → Region **South Asia (Mumbai)** → project तैयार होने तक रुकें।

## 2. SQL STEP 1 — tables (`server-setup/schema.sql`)
1. Supabase → **SQL Editor** → **New query**।
2. `server-setup/schema.sql` की पूरी फ़ाइल copy करके paste करें → **Run**।
3. "Success" आना चाहिए। "Target public schema is not empty" आए तो project खाली नहीं है — नया project बनाएँ।

## 3. Cloud Admin user बनाएँ
Supabase → **Authentication → Users → Add user → Create new user**
- Email और password (कम से कम 8 अक्षर) डालें
- **Auto Confirm User** ✔ करें → **Create user**

## 4. SQL STEP 2 — admin और storage (`server-setup/manual-step2-admin-storage.sql`)
1. SQL Editor → **New query** → फ़ाइल paste करें।
2. `v_email text := 'admin@example.com';` में अपना Cloud Admin email लिखें → **Run**।
3. नीचे result में आपका email और `admin` दिखना चाहिए।

## 5. दो Edge Functions बनाएँ
Supabase → **Edge Functions → Deploy a new function → Via Editor**। दोनों के लिए:

| Function का नाम (बिल्कुल यही) | Code |
|---|---|
| `session-access` | `server-setup/session-access.ts` |
| `create-admin-user` | `server-setup/create-admin-user.ts` |

Editor का पुराना code हटाकर फ़ाइल का code paste करें → **Deploy**। इनके बिना login और "admin permission" जाँच fail होगी।

## 6. API जानकारी लें
- **Project URL**: `https://<20-अक्षर>.supabase.co`
- **Publishable key** (`sb_publishable_...`) या पुरानी **anon** key — Project Settings → API Keys
- ❌ Secret / service_role key **न** डालें।

## 7. BJ OPD में जोड़ें
Desktop EXE → Admin (Offline) login → **Settings → Server / Supabase Connection**
1. Server Name, Project URL, Publishable key भरें → **Check Connection**।
2. स्टेप 3 वाला Cloud Admin Email/Password भरें।
3. "नया खाली Supabase project…" वाला box **टिक न करें**।
4. **Save & Connect** → **Restart Software**।
5. Settings → Clinic Info भरकर **Save Changes**।
6. Settings → **Cloud Sync Connect** में वही email/password → **Connect Cloud**।

## Error का मतलब
| संदेश | हल |
|---|---|
| Admin permission: HTTP 404 | `session-access` function नहीं बना / नाम गलत है (स्टेप 5) |
| इस account को cloud admin permission नहीं है | स्टेप 4 में गलत email लिखा था; सही email से दोबारा चलाएँ |
| compatible Server Setup schema नहीं है | स्टेप 2 पूरा नहीं हुआ |
| Cloud login: HTTP 400 | Email/password गलत है या user Auto Confirm नहीं हुआ |
