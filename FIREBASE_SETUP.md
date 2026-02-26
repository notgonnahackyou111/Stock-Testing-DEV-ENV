# Firebase Setup Guide

## Overview
This guide walks you through setting up Firebase to make your game saves **permanent and recoverable** even if the server restarts.

## Benefits of Firebase Persistence
✅ **Permanent Storage** - Game saves survive server restarts  
✅ **Scalable** - Handles millions of saves effortlessly  
✅ **Free Tier** - 1GB of storage included  
✅ **Automatic Backups** - Google handles data redundancy  
✅ **Easy Deployment** - Works seamlessly on Render  

---

## Step 1: Create a Firebase Project

### 1a. Go to Firebase Console
- Visit: https://console.firebase.google.com/
- Sign in with your Google account (create one if needed)

### 1b. Create a New Project
- Click **"Add Project"**
- Enter project name: `stock-testing-saves` (or your preferred name)
- Accept the terms and click **"Continue"**
- For analytics, choose **"No"** (not required)
- Click **"Create Project"**
- Wait 1-2 minutes for creation to complete

### 1c. Enable Firestore Database
- Once project is created, click **"Go to Console"**
- In the left sidebar, click **"Firestore Database"**
- Click **"Create Database"**
- Choose: **"Start in Production Mode"**
- Select region: **"us-central1"** (or closest to you)
- Click **"Create"**
- Wait ~1 minute for database initialization

---

## Step 2: Create Service Account Credentials

### 2a. Generate Private Key
- In Firebase Console, click **"Project Settings"** (gear icon, top-left)
- Go to **"Service Accounts"** tab
- Click **"Generate Private Key"** button
- A JSON file will download (e.g., `stock-testing-saves-xxxxx.json`)
- **⚠️ Keep this file secure!** It contains sensitive credentials

### 2b. View Credentials
- Open the downloaded JSON file with a text editor
- You'll see something like:
```json
{
  "type": "service_account",
  "project_id": "stock-testing-saves-xxxxx",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@stock-testing-saves-xxxxx.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## Step 3: Configure Your Application

### 3a. Create `.env` File
In your project root (`/workspaces/Stock-Testing-DEV-ENV/`), create a `.env` file:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=stock-testing-saves-xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@stock-testing-saves-xxxxx.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://stock-testing-saves-xxxxx.firebaseio.com

# Server Configuration
PORT=8000
NODE_ENV=development
```

### 3b. Fill in Your Credentials
- Copy `project_id` from the JSON file → `FIREBASE_PROJECT_ID`
- Copy `private_key` from the JSON file → `FIREBASE_PRIVATE_KEY`
- Copy `client_email` from the JSON file → `FIREBASE_CLIENT_EMAIL`
- Build database URL: `https://{project_id}.firebaseio.com`

### ⚠️ Important Notes:
1. **Never commit `.env` file** to git (it's in `.gitignore`)
2. **Keep `FIREBASE_PRIVATE_KEY` secret** - don't share it
3. The `\n` in the private key must be literal `\n` strings, not actual newlines
4. If private key has newlines, replace them: `private_key.replace(/\n/g, '\\n')`

### 3c. Verify Configuration
```bash
echo "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID"
echo "FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL"
# Don't echo the private key for security!
```

---

## Step 4: Start the Server

### 4a. Restart the Server
```bash
npm start
```

### 4b. Check Firebase Connection
Look for output like:
```
[Firebase] ✅ Initialized successfully
[Firebase] Project: stock-testing-saves-xxxxx
Server listening on port 8000
```

### 4c. Verify with Health Check
```bash
curl http://localhost:8000/health
```

You should see:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-02-25T...",
  "storage": "Firebase",
  "firebaseStatus": "Connected"
}
```

---

## Step 5: Test the System

### 5a. Create a Save Code
```bash
curl -X POST http://localhost:8000/api/saves/create
```

Response:
```json
{
  "success": true,
  "code": "ABC123XYZ",
  "message": "Save code created successfully",
  "storage": "Firebase"
}
```

### 5b. Save Game State
```bash
curl -X POST http://localhost:8000/api/saves/ABC123XYZ \
  -H "Content-Type: application/json" \
  -d '{
    "gameState": {
      "simulator": {
        "portfolio": {"cash": 25000},
        "stocks": {}
      }
    },
    "presetName": "default"
  }'
```

### 5c. Load Game State
```bash
curl http://localhost:8000/api/saves/ABC123XYZ/preset/default
```

Response will include your saved game state!

### 5d. Verify in Firebase Console
- Go to https://console.firebase.google.com/
- Select your project
- Click **"Firestore Database"**
- You should see a **`gameSaves`** collection with your save codes
- Click on a save code to view the presets

---

## Step 6: Deploy to Render

### 6a. Add Environment Variables to Render
1. Go to your Render dashboard: https://dashboard.render.com/
2. Select your service
3. Go to **"Environment"** section
4. Add each environment variable:
   - `FIREBASE_PROJECT_ID`: Your project ID
   - `FIREBASE_PRIVATE_KEY`: Your private key (paste the full value)
   - `FIREBASE_CLIENT_EMAIL`: Your client email
   - `FIREBASE_DATABASE_URL`: Your database URL

### 6b. Deploy
```bash
git add .env.example package.json server.js firebase-config.js
git commit -m "Add Firebase persistence for game saves"
git push origin main
```

Render will automatically redeploy. Check logs for Firebase status.

---

## Troubleshooting

### "FIREBASE_PROJECT_ID not set"
**Solution**: Make sure `.env` file exists and is in the correct directory.

### "Failed to initialize Firebase"
**Solution**: Check that credentials are correct:
1. Verify `FIREBASE_PROJECT_ID` matches your project
2. Verify `client_email` is exact (includes the full domain)
3. Check `FIREBASE_PRIVATE_KEY` has proper newlines

### "Permission denied" on Save
**Solution**: 
1. Go to Firestore Database → **"Rules"** tab
2. Replace with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /gameSaves/{code} {
      allow read, write;
    }
  }
}
```

### Saves Still Disappearing
**Solution**: 
1. Check `/health` endpoint - verify `firebaseStatus: "Connected"`
2. Check server logs for `[Firebase]` messages
3. Verify database queries work with curl tests

---

## Firestore Pricing

**Good news**: Firestore has a **generous free tier**:
- 1 GB storage (plenty for millions of saves)
- 50,000 reads/day
- 20,000 writes/day
- No credit card required if staying within limits

**Your game save system will cost $0** unless game becomes viral with millions of concurrent users.

---

## What's Changed

### Before (In-Memory)
❌ Saves lost on server restart  
❌ Only works on single server  
❌ No backup of player data  

### After (Firebase)
✅ Saves permanent and recoverable  
✅ Works across multiple servers  
✅ Automatic daily backups  
✅ Scales to millions of players  
✅ Real-time sync across devices  

---

## Next Steps

1. **Create Firebase project** (30 minutes)
2. **Add credentials to `.env`** (5 minutes)
3. **Restart server and test** (5 minutes)
4. **Deploy to Render** (automatic)
5. **Enjoy permanent game saves!** 🎉

---

## Questions?

If Firebase setup fails:
1. Check `.env` file exists: `ls -la .env`
2. Check Firebase credentials: `cat .env`
3. Check server logs: `npm start` (run directly to see logs)
4. Verify Firestore database exists in Firebase Console
5. Check that service account has "Editor" permissions

Good luck! 🚀
