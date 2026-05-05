# Deployment: Vercel + Railway + Railway PostgreSQL

Complete guide to deploy RIS Manager with:
- **Frontend**: Vercel (web version or Electron builds)
- **Backend**: Railway (Node.js Express)
- **Database**: Railway (PostgreSQL)

---

## 🏗️ Architecture

```
┌─────────────────────┐         ┌────────────────────┐
│  Vercel             │         │  Railway           │
│  (Frontend)         │────────▶│  (Backend API)     │
│  - React Web App    │  HTTPS  │  - Express Server  │
│  - Electron builds  │         │  - Node.js         │
└─────────────────────┘         └────────────────────┘
                                         │
                                         │ SQL
                                         ▼
                                ┌────────────────────┐
                                │  Railway           │
                                │  (PostgreSQL)      │
                                │  - Database        │
                                │  - 7 tables        │
                                └────────────────────┘
```

---

## 📋 Prerequisites

- [x] GitHub account (to connect repos)
- [x] Vercel account (free at vercel.com)
- [x] Railway account (free at railway.app)
- [x] Your RIS-MANAGER repository on GitHub

---

## Phase 1: Railway Setup (Backend + Database)

### 1.1 Create Railway Account

1. Go to **https://railway.app**
2. Click **"Start Project"**
3. Sign up with GitHub
4. Authorize Railway to access your GitHub

### 1.2 Create PostgreSQL Database

1. In Railway dashboard, click **"New Project"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway creates database automatically
4. Click on the PostgreSQL service
5. Go to **"Connect"** tab
6. Copy the connection string (looks like):
   ```
   postgresql://user:password@host:port/dbname
   ```
7. **Save this string** - you'll need it

### 1.3 Deploy Backend to Railway

#### Step 1: Connect GitHub Repository

1. In Railway, click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Select your **RIS-MANAGER** repository
4. Railway auto-detects it's a Node.js project
5. Click **"Deploy"**

#### Step 2: Add PostgreSQL Plugin

1. In Railway project, click **"Add"**
2. Select **"PostgreSQL"** (or use existing one from 1.2)
3. Railway links it automatically

#### Step 3: Configure Environment Variables

1. Go to **Backend service** → **Variables** tab
2. Add these variables:

```
DB_HOST=<from connection string>
DB_PORT=5432
DB_USER=<from connection string>
DB_PASSWORD=<from connection string>
DB_NAME=<from connection string>
JWT_SECRET=your_super_secret_key_change_this_2026
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=https://ris-manager.vercel.app,https://your-domain.com
```

**How to extract from connection string:**
```
postgresql://user:password@host:port/dbname
            └────┬────┘  └───┬───┘  └─┬─┘ └┬┘ └──┬───┘
                USER    PASSWORD  HOST PORT  DB_NAME
```

#### Step 4: Set Build & Start Commands

1. Go to **Deployment** tab
2. Set **Build Command**:
   ```
   cd backend && npm install
   ```
3. Set **Start Command**:
   ```
   cd backend && npm run migrate && npm start
   ```
4. Click **"Deploy"**

Wait for deployment to complete (~2-3 minutes)

### 1.4 Get Backend URL

1. Once deployed, Railway shows a domain
2. Example: `https://ris-backend-prod-xyz.railway.app`
3. **Save this URL** - needed for frontend

### 1.5 Verify Backend is Running

```bash
# Test in browser or curl:
https://ris-backend-prod-xyz.railway.app/health

# Should return:
{"status": "ok"}
```

---

## Phase 2: Vercel Setup (Frontend)

### 2.1 Create Vercel Account

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Sign up with GitHub
4. Authorize Vercel

### 2.2 Deploy Frontend to Vercel

#### Option A: Deploy as Web App (React)

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Import your **RIS-MANAGER** GitHub repository
3. Vercel auto-detects it's Node.js/React
4. Configure:
   - **Framework Preset**: Vite or Create React App (auto-detected)
   - **Build Command**: `npm run build` (or `npm run build:web`)
   - **Output Directory**: `dist` or `build`
5. Add Environment Variable:
   ```
   REACT_APP_API_URL=https://ris-backend-prod-xyz.railway.app
   ```
6. Click **"Deploy"**

Wait for deployment (~3-5 minutes)

**Result**: Website at `https://ris-manager.vercel.app`

#### Option B: Also Build for Electron

In your `package.json`, add:

```json
{
  "scripts": {
    "build:web": "vite build",
    "build:electron": "electron-builder",
    "build": "npm run build:web && npm run build:electron"
  }
}
```

Then Vercel can build both versions, and you download the Electron builds from Vercel's logs.

### 2.3 Get Frontend URL

Example: `https://ris-manager.vercel.app`

### 2.4 Update Backend ALLOWED_ORIGINS

1. Go back to Railway backend settings
2. Update **ALLOWED_ORIGINS**:
   ```
   ALLOWED_ORIGINS=https://ris-manager.vercel.app,https://your-custom-domain.com
   ```

---

## Phase 3: Database Initialization

### 3.1 Run Migrations on Railway Database

#### Option 1: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
cd backend
npm install
npm run migrate
node db/seed.js

# Done!
```

#### Option 2: Using psql (SQL Client)

```bash
# Install PostgreSQL client
# Windows: choco install postgresql
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Connect to Railway database
psql "postgresql://user:password@host:port/dbname"

# Inside psql, run commands from migrate.js
# (Copy the CREATE TABLE statements)
```

#### Option 3: SSH into Railway Container

1. Go to Railway backend service → **Settings**
2. Enable **SSH** (toggle on)
3. Get SSH command
4. SSH in and run:
   ```bash
   cd backend
   npm run migrate
   node db/seed.js
   ```

### 3.2 Verify Database is Populated

```bash
# Connect to Railway database
psql "postgresql://..."

# Check if tables exist
\dt

# Check if data exists
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM inventory;

# Should see:
# count: 1 (admin user)
# count: 116 (inventory items)
```

---

## Phase 4: Testing

### 4.1 Test Backend API

```bash
# Get your Railway backend URL
https://ris-backend-prod-xyz.railway.app

# Test health endpoint
curl https://ris-backend-prod-xyz.railway.app/health

# Test login
curl -X POST https://ris-backend-prod-xyz.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bryanfortuno@bac.gov","password":"BAC2026"}'

# Should return JWT token
```

### 4.2 Test Web Frontend

1. Open browser: `https://ris-manager.vercel.app`
2. Login with: `bryanfortuno@bac.gov` / `BAC2026`
3. You should see the dashboard
4. Test creating a request
5. Check if data appears in Railway database

### 4.3 Test Electron App Locally

```bash
# In project root
npm start

# During login, Advanced Settings
# API URL: https://ris-backend-prod-xyz.railway.app

# Test submitting a request
```

---

## Phase 5: Custom Domain (Optional)

### 5.1 Add Domain to Vercel

1. Go to Vercel project settings
2. Go to **Domains**
3. Enter your domain (e.g., `ris.yourdomain.com`)
4. Add DNS records (Vercel shows instructions)
5. Wait for DNS propagation (~5 minutes)

### 5.2 Add Domain to Railway

1. Go to Railway backend service
2. Go to **Domains**
3. Add custom domain (e.g., `api.yourdomain.com`)
4. Update DNS
5. Update ALLOWED_ORIGINS in backend to use new domain

---

## 📊 Complete Deployment Example

```
GitHub Repository (RIS-MANAGER)
│
├─ Frontend /
│  ├─ app.js
│  ├─ Index.html
│  └─ package.json
│        │
│        └─▶ Vercel Deploy
│           ├─ Build: npm run build
│           ├─ Output: dist/
│           ├─ URL: https://ris-manager.vercel.app
│           └─ Environment: REACT_APP_API_URL=...
│
└─ Backend /backend
   ├─ server.js
   ├─ routes/
   ├─ db/
   └─ package.json
        │
        └─▶ Railway Deploy
           ├─ Build: cd backend && npm install
           ├─ Start: npm start
           ├─ URL: https://ris-backend-xyz.railway.app
           ├─ DB_HOST, DB_USER, DB_PASSWORD...
           └─ PostgreSQL (Railway)
                ├─ Tables: users, requests, inventory...
                └─ Data: Shared by all services
```

---

## 🚀 Quick Deployment Script

Save this as `deploy.sh`:

```bash
#!/bin/bash

echo "=== RIS Manager Deployment ==="
echo ""
echo "Step 1: Create Railway PostgreSQL"
echo "  Go to: https://railway.app → New Project → PostgreSQL"
echo "  Copy connection string"
echo ""

echo "Step 2: Deploy Backend to Railway"
echo "  Go to: https://railway.app → New Project → Connect GitHub"
echo "  Select: RIS-MANAGER repository"
echo "  Add variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET"
echo ""

echo "Step 3: Get Backend URL"
echo "  Example: https://ris-backend-xyz.railway.app"
echo ""

echo "Step 4: Deploy Frontend to Vercel"
echo "  Go to: https://vercel.com → Import Project"
echo "  Select: RIS-MANAGER repository"
echo "  Add variable: REACT_APP_API_URL=<backend_url>"
echo ""

echo "Step 5: Initialize Database"
echo "  railway link"
echo "  cd backend && npm run migrate && node db/seed.js"
echo ""

echo "Step 6: Test"
echo "  Frontend: https://ris-manager.vercel.app"
echo "  Backend: https://ris-backend-xyz.railway.app/health"
echo ""

echo "=== Done! ==="
```

---

## 📝 Environment Variables Summary

### Backend (Railway)
```
DB_HOST=railway.postgres.host
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=xxxxx
DB_NAME=ris_manager
JWT_SECRET=your_secret_key
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=https://ris-manager.vercel.app
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://ris-backend-xyz.railway.app
```

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check connection string in Railway
# Verify DB_HOST, DB_USER, DB_PASSWORD match exactly

# Test locally:
psql "postgresql://user:password@host:5432/dbname"
```

### "API connection refused"
```bash
# Check backend is running:
curl https://ris-backend-xyz.railway.app/health

# If 502: Backend crashed, check logs in Railway
# Click backend service → Deployment tab → Check logs
```

### "CORS error"
```bash
# Update ALLOWED_ORIGINS in Railway backend:
ALLOWED_ORIGINS=https://ris-manager.vercel.app,https://localhost:3000
```

### "Invalid credentials"
```bash
# Make sure database was seeded:
# ssh into Railway or use:
railway run psql "postgresql://..." -c "SELECT COUNT(*) FROM users;"

# If 0: Run seed again:
railway run node backend/db/seed.js
```

---

## 📊 Costs (Monthly)

| Service | Free | Paid |
|---------|------|------|
| Vercel | $0 | $20+ |
| Railway | $5 credits | Pay as you go |
| PostgreSQL | Included | Included |
| **Total** | **~$0-5** | **$20-50+** |

---

## ✅ Verification Checklist

- [ ] Railway PostgreSQL created and accessible
- [ ] Backend deployed to Railway with migrations run
- [ ] Backend URL working (test /health endpoint)
- [ ] Frontend deployed to Vercel
- [ ] ALLOWED_ORIGINS includes Vercel URL
- [ ] Can login from web frontend
- [ ] Can submit RIS request from web
- [ ] Data persists in Railway database
- [ ] Electron app can connect to Railway backend
- [ ] Multiple users can login simultaneously

---

## 🎯 Next Steps

1. **Create Railway account**: https://railway.app
2. **Create Vercel account**: https://vercel.com
3. **Set up PostgreSQL**: Railway dashboard → New → PostgreSQL
4. **Deploy backend**: Railway dashboard → Connect GitHub
5. **Deploy frontend**: Vercel dashboard → Import Project
6. **Initialize database**: `railway run node backend/db/seed.js`
7. **Test**: Visit https://ris-manager.vercel.app

---

**You now have:**
- ✅ Scalable backend on Railway (auto-scales with demand)
- ✅ Fast frontend on Vercel (CDN distributed)
- ✅ Managed PostgreSQL (automatic backups on Railway)
- ✅ Real-time sync across all devices
- ✅ Production-ready deployment

**Deployment time**: ~15-20 minutes
**Monthly cost**: $0-5 (free tier) to $20-50 (paid)
