# BJ OPD Windows and Android releases

The Server Setup repository builds both installers from the same version and commit.
The shared files in `public/` provide the launcher icon and login poster. The Windows
form sits over the open right side of the poster on wide screens. On smaller screens
the form follows the poster.

Windows can provision a clinic server. To connect Android, open BJ OPD and enter
the prepared clinic's Supabase project URL and publishable or anon API key.
Then sign in with the clinic's cloud account. Android uses cloud authentication.

The build workflow publishes both files under one release after both builds pass.
Bump the version in package.json and package-lock.json for each new release.
Configure the following repository Actions secrets for a production-signed APK.
Keep the same Android key for updates.

- ANDROID_KEYSTORE_BASE64
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD

Without signing secrets, the Android artifact is an installable, debug-signed Preview.
