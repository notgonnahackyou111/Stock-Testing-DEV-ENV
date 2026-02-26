# Deployment Guide: Cloud Run & Render

This guide covers deploying the Stock Testing Bot API to **Google Cloud Run** and **Render** (previously Heroku).

---

## Option A: Deploy to Google Cloud Run

### Prerequisites
- Google Cloud account (free tier available)
- gcloud CLI installed locally
- Docker (optional; Cloud Run can build from git)

### Step 1: Create a GCP Project
```bash
gcloud projects create stock-testing-prod --name="Stock Testing"
gcloud config set project stock-testing-prod
```

### Step 2: Enable Required APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
# (optional) if using Firestore:
gcloud services enable firestore.googleapis.com
```

### Step 3: Create a Dockerfile
The repository includes necessary Node.js setup. Ensure `package.json` is at the root.

Create `Dockerfile` (if not present):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

### Step 4: Set Environment Variables
Create a `.env.prod` file (do NOT commit to git):
```bash
JWT_SECRET='your-super-secret-jwt-key-change-this'
ADMIN_USERNAME=owner_admin
ADMIN_PASSWORD='secure-admin-password'
TESTER_USERNAME=tester_user
TESTER_PASSWORD='secure-tester-password'
NODE_ENV=production
# Optional: Firebase config if you have Firestore
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
# FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

### Step 5: Deploy to Cloud Run
```bash
# Build and deploy in one command
gcloud run deploy stock-testing-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars JWT_SECRET='your-secret',ADMIN_USERNAME=owner_admin,ADMIN_PASSWORD='pass',TESTER_USERNAME=tester_user,TESTER_PASSWORD='pass' \
  --memory 512Mi \
  --cpu 1
```

### Step 6: Retrieve Service URL
After deployment:
```bash
gcloud run services describe stock-testing-bot --region us-central1 --format='value(status.url)'
```

This outputs your service URL, e.g., `https://stock-testing-bot-xxxxx.run.app`

### Step 7: Test the Deployment
```bash
curl https://stock-testing-bot-xxxxx.run.app/health | jq .
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "storage": "In-Memory (Demo Mode)",
  "firebaseStatus": "Not Configured"
}
```

---

## Option B: Deploy to Render

### Prerequisites
- Render account (free tier available at render.com)
- GitHub account (repo must be public or connected to Render)

### Step 1: Connect GitHub Repository
1. Go to https://dashboard.render.com/
2. Click **New +** → **Web Service**
3. Select **GitHub** and authorize Render
4. Select your `Stock-Testing-DEV-ENV` repository
5. Click **Connect**

### Step 2: Configure Service Settings
- **Name**: `stock-testing-bot`
- **Environment**: `Node`
- **Build Command**: `npm ci`
- **Start Command**: `npm start`
- **Plan**: Free or Starter (depending on uptime needs)
- **Region**: Select closest to your users

### Step 3: Add Environment Variables
In the Render dashboard, go to your service → **Environment**:

Add the following:
| Key | Value |
|-----|-------|
| `JWT_SECRET` | `your-super-secret-key-change-this` |
| `ADMIN_USERNAME` | `owner_admin` |
| `ADMIN_PASSWORD` | `secure-password` |
| `TESTER_USERNAME` | `tester_user` |
| `TESTER_PASSWORD` | `secure-password` |
| `NODE_ENV` | `production` |
| `PORT` | `8000` *(optional; Render auto-detects)* |

### Step 4: Deploy
Click **Deploy** in the Render dashboard. The service will:
1. Clone your repo
2. Run `npm ci`
3. Start the app with `npm start`
4. Assign a URL like `https://stock-testing-bot.onrender.com`

### Step 5: Test
```bash
curl https://stock-testing-bot.onrender.com/health | jq .
```

---

## Post-Deployment Configuration

### 1. Update Firewall / Security Rules
- Both Cloud Run and Render are HTTPS by default ✅
- Optional: Add IP allowlisting if needed

### 2. Configure Firestore (Optional)
If you want persistent user and chat data:

**Cloud Run:**
1. Create a Firestore database in your GCP project
2. Generate a service-account key JSON
3. Encode it as base64: `base64 -i sa.json`
4. Add env var `GOOGLE_APPLICATION_CREDENTIALS` pointing to the file (or set the decoded JSON as env vars per FIREBASE_SETUP.md)
5. Redeploy

**Render:**
1. Similar process: upload service-account JSON or set individual env vars
2. Redeploy web service

### 3. Set Strong Secrets
Replace placeholder passwords with strong, unique values:
```bash
# Generate secure random password
openssl rand -base64 24
```

### 4. Monitor & Logs
**Cloud Run:**
```bash
gcloud run services describe stock-testing-bot --region us-central1
gcloud run services logs read stock-testing-bot --region us-central1 --limit 50
```

**Render:**
- View logs directly in the Render dashboard under **Logs** tab

---

## Troubleshooting

### "Port 8000 already in use"
- Cloud Run and Render auto-detect the PORT env var
- Ensure `PORT=8000` or let the platform assign dynamically

### "Service unavailable" / 503 errors
- Check logs for startup errors
- Verify `npm start` runs `node server.js`
- Ensure all dependencies are in `package.json`

### WebSocket connection fails
- Confirm service is accessible via HTTPS
- WebSocket upgrade should work on both platforms
- If behind a proxy, ensure `Upgrade` headers are passed through

### Chat messages not persisting
- By default, app uses in-memory storage (data resets on restart)
- To persist, configure Firestore (see above)
- Render free tier has no persistent disk; for production, use a database service

---

## Production Checklist

- [ ] Set strong, unique `JWT_SECRET`
- [ ] Set strong admin and tester passwords
- [ ] Enable HTTPS (both platforms default to this)
- [ ] Configure Firestore for persistent storage (optional)
- [ ] Test login/chat endpoints
- [ ] Monitor service logs for errors
- [ ] Set up monitoring alerts (e.g., uptime checks)
- [ ] Document API endpoints for your team
- [ ] Enable auto-scaling on Cloud Run if traffic spikes

---

## Rollback & Updates

### Cloud Run
```bash
# Redeploy after code changes
git push origin main
gcloud run deploy stock-testing-bot --source . --region us-central1

# Rollback to previous version
gcloud run revisions list --service stock-testing-bot --region us-central1
gcloud run services update-traffic stock-testing-bot --to-revisions REVISION_ID=100 --region us-central1
```

### Render
- Push to GitHub
- Render auto-redeploys on new commits to main branch
- Rollback: use Render dashboard → **Deployments** tab → select previous version

---

## Cost Estimates (as of 2026)

### Google Cloud Run (free tier)
- **Free Tier**: 2 million requests/month, 360,000 GB-seconds compute
- **Paid**: ~$0.00002500 per request + compute costs
- Typical small app: $0-5/month

### Render (free tier)
- **Free Web Service**: Auto-sleeps after 15 min of inactivity
- **Paid (Starter)**: $7/month, always on
- Data not persisted between restarts on free tier

---

## Next Steps

1. Choose a platform (Cloud Run for high-traffic, Render for simplicity)
2. Set environment variables securely
3. Deploy and test `/health` endpoint
4. Share the service URL with your team
5. Configure Firestore if you need persistent data

For questions, refer to the platform docs:
- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [Render Docs](https://render.com/docs)
