# BJ OPD branding — deployment checklist

The login page code, Windows display name, desktop shortcut name, installer filename,
and browser title have been updated to BJ OPD.

## Required image uploads (still pending)
- Copy the approved Full-HD image from `BJ_OPD_Branding_Ready.zip` to `public/bj-opd-background.png` (1920x1080).
- Copy the square desktop icon from the same ZIP to `build/icon.png` (512x512).

**Important:** `src/pages/Login.tsx` reserves the right-side area for the application's real
login form. Do NOT include a fake login panel inside the background image.
The old background image is a fallback until the new image file exists.
The existing icon is retained until replaced.

## Branding
Product: BJ OPD
Company: BJ TECH SOFTWARE DEVELOPER
Founder & Developer: Dr. Yash Rathore
Contact: +91 8005707783

## Compatibility
The Electron appId, internal storage keys, database, cloud login identifier,
and protocol scheme were intentionally NOT changed to avoid breaking existing installations.

Verify `npm run build` and Windows packaging before releasing, and visually test
the login screen at 1920x1080 and smaller screen sizes.

