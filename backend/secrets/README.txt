Firebase Admin SDK credentials (server-side push only)
======================================================

Setup (local or server)
-----------------------
1. Firebase Console → Project Settings → Service accounts → Generate new private key
2. Save the downloaded file as:
     backend/secrets/firebase.json
   (NOT google-services.json — that stays in frontend/android/.)

3. Root .env (copy from .env.example):
     FCM_ENABLED=true
     FCM_CREDENTIALS_PATH=secrets/firebase.json

Docker Compose
--------------
Place firebase.json on the host under backend/secrets/ before starting.
Compose mounts ./backend/secrets → /app/secrets inside the backend container.

If push logs show "Invalid JWT Signature":
- The private key is corrupt, truncated, or revoked
- Download a NEW key from Firebase Console and replace firebase.json
- Restart the backend container

Remote VPS / instantcloud
---------------------------
Upload firebase.json via SFTP/SSH to backend/secrets/ on the server.
