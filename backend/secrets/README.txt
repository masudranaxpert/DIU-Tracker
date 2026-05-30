Firebase Admin SDK credentials (server-side push only)
======================================================

DO NOT commit any *.json from this folder to GitHub.

Setup (local or server)
-----------------------
1. Firebase Console → Project Settings → Service accounts → Generate new private key
2. Save the downloaded file as:
     backend/secrets/firebase-service-account.json
   (This is NOT google-services.json — that file stays in frontend/android/.)

3. Root .env (copy from .env.example):
     FCM_ENABLED=true
     FCM_CREDENTIALS_PATH=secrets/firebase-service-account.json

Docker Compose
--------------
Place the JSON on the host under backend/secrets/ before starting.
Compose mounts ./backend/secrets → /app/secrets inside the backend container.

Remote VPS / instantcloud
---------------------------
Upload the JSON via SFTP/SSH to the same path on the server, or set
FCM_CREDENTIALS_PATH to an absolute path on that machine.

If a key was ever pushed to git, rotate it in Firebase Console and use a new JSON file.
