# Railway-Only Deployment Guide

Deploy everything to Railway: Frontend + Backend + Database on ONE platform.

---

## 🎯 What You'll Get

```
One Railway Project:
├─ Frontend (React served by Express)
├─ Backend (Express API)
├─ PostgreSQL Database
└─ One URL: https://ris-manager.railway.app

Result:
✅ All 41 departments use same URL
✅ Simpler than Vercel + Railway
✅ No CORS issues
✅ One platform to manage
```

---

## 📋 Phase 1: Modify Your Code

### Step 1: Update `backend/server.js`

This tells Express to serve the React frontend files.

Open `backend/server.js` and add this at the top (after imports):

```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// ===== NEW: Serve frontend static files =====
// Express serves the built React app from /dist folder
app.use(express.static(path.join(__dirname, '../dist')));

// ===== Existing middleware =====
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  credentials: true
}));
app.use(express.json());

// ===== Existing routes =====
app.use('/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/departments', require('./routes/departments'));

// ===== Health check =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== NEW: Fallback to React for all other routes =====
// This lets React handle routing (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ===== Error handler =====
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// ===== Start server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 2: Update Root `package.json` Scripts

Open your root-level `package.json` and update scripts:

```json
{
  "name": "ris-manager",
  "version": "2.0.0",
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "start": "cd backend && npm start",
    "install-all": "npm install && cd backend && npm install"
  },
  "devDependencies": {
    "vite": "^4.0.0",
    "@vitejs/plugin-react": "^3.0.0"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### Step 3: Ensure Backend API URL is Correct

Open `apiStorageManager.js` and verify:

```javascript
class APIStorageManager {
  constructor() {
    // For Railway-only, use same domain (current window location)
    // No need to specify baseURL in Railway-only
    this.baseURL = window.location.origin;
    this.tokenKey = 'ris_token';
    this.userId = null;
    this.token = null;
  }
  
  // Rest of the code remains same
}
```

---

## 🚀 Phase 2: Deploy to Railway

### Step 1: Create Railway Account

1. Go to **https://railway.app**
2. Click **"Start Project"**
3. Sign up with GitHub
4. Authorize Railway

### Step 2: Create PostgreSQL Database

1. In Railway dashboard, click **"Create New Project"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway creates it automatically
4. Click on PostgreSQL service
5. Go to **"Connect"** tab
6. Copy connection string:
   ```
   postgresql://user:password@host:port/dbname
   ```
7. **Save it** - you'll need it in a moment

### Step 3: Deploy Your Project

1. In Railway, click **"Create New Project"** again
2. Select **"Deploy from GitHub repo"**
3. Select **RIS-MANAGER** repository
4. Railway starts deployment

### Step 4: Configure Build & Start Commands

1. Go to your project → Backend service
2. Click on **"Settings"** or **"Deployment"** tab
3. Find **Build Command** and set to:
   ```
   npm install && npm run build && cd backend && npm install
   ```
4. Find **Start Command** and set to:
   ```
   cd backend && npm start
   ```

**Explanation:**
- `npm install` - Install frontend dependencies
- `npm run build` - Build React app (creates `/dist`)
- `cd backend && npm install` - Install backend dependencies
- `npm start` - Start Express server (serves React + API)

### Step 5: Add Environment Variables

1. Go to your project → Backend service → **"Variables"** tab
2. Add these variables one by one:

**Database variables** (from your PostgreSQL connection string):

| Name | Value | Example |
|------|-------|---------|
| `DB_HOST` | Extract host | `containers-us-west-12.railway.app` |
| `DB_PORT` | Extract port | `5432` |
| `DB_USER` | Extract user | `postgres` |
| `DB_PASSWORD` | Extract password | `xxxxx` |
| `DB_NAME` | Extract database | `railway` |

**Application variables:**

| Name | Value |
|------|-------|
| `JWT_SECRET` | `ris_secret_key_2026` |
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | `*` |

**How to extract from connection string:**
```
postgresql://postgres:kX9mP2wQ@containers-us-west-12.railway.app:5432/railway
            └──────────────┬──────────────┘ └────────────┬────────────┘ └──┬──┘ └┬┘ └──┬──┘
              DB_USER : DB_PASSWORD         DB_HOST                  DB_PORT PORT DB_NAME
```

### Step 6: Wait for Deployment

1. You'll see "Deployment in Progress"
2. Wait ~5-10 minutes for completion
3. You'll see a generated URL like:
   ```
   https://ris-manager-prod-xyz.railway.app
   ```
4. **Save this URL** - this is your app URL!

---

## 🛠️ Phase 3: Initialize Database

### Option A: Using Railway CLI (Recommended)

```bash
# 1. Install Railway CLI globally
npm install -g @railway/cli

# 2. Login to Railway
railway login
# (Opens browser, authorize)

# 3. Link to your Railway project
railway link
# (Select your RIS-MANAGER project)

# 4. Run migrations to create tables
cd backend
npm install
npm run migrate

# 5. Seed the database with initial data
node db/seed.js

# Done! Database is now populated with:
# - 1 admin user
# - 41 department users
# - 116 inventory items
```

### Option B: Using SSH into Railway Container

```bash
# 1. In Railway dashboard, go to your backend service
# 2. Click "Settings"
# 3. Enable SSH (toggle on)
# 4. Copy the SSH command that appears
# 5. Run it in your terminal

# Once connected via SSH:
cd /app/backend
npm run migrate
node db/seed.js

# Exit SSH
exit
```

### Option C: Verify Database Manually

```bash
# Connect to your Railway PostgreSQL
psql "postgresql://user:password@host:5432/dbname"

# Inside psql, check tables exist:
\dt

# Check if admin user was created:
SELECT COUNT(*) FROM users;
# Should show: 1

# Check inventory items:
SELECT COUNT(*) FROM inventory;
# Should show: 116

# Exit psql
\q
```

---

## ✅ Phase 4: Testing

### Test 1: Check Server is Running

```bash
# In browser, visit your Railway URL + /health:
https://ris-manager-prod-xyz.railway.app/health

# Should see:
{"status":"ok"}
```

### Test 2: Test Login

```bash
# Visit your Railway URL:
https://ris-manager-prod-xyz.railway.app

# You should see the login page
# Try logging in with:
Email: bryanfortuno@bac.gov
Password: BAC2026

# Should see admin dashboard ✅
```

### Test 3: Test Multiple Users

```bash
# Logout, then login as different department:
Email: accounting_office@bac.gov
Password: ACC2026

# Should see different dashboard (Accounting only)
```

### Test 4: Submit a Request

```bash
1. Login as: accounting_office@bac.gov / ACC2026
2. Go to "New Request"
3. Select some items
4. Click "Submit"
5. Should see success message
6. Request should appear in your requests list ✅
```

### Test 5: Multi-Device Test

```bash
Computer 1:
└─ Open: https://ris-manager-prod-xyz.railway.app
   └─ Login: engineering_office@bac.gov / ENG2026
      └─ Submit a request

Computer 2:
└─ Open: https://ris-manager-prod-xyz.railway.app (SAME URL!)
   └─ Login: bryanfortuno@bac.gov / BAC2026 (admin)
      └─ Should see Engineering's request in the list ✅
      └─ Click "Approve"

Computer 1:
└─ Refresh page
   └─ Request status changed to "Approved" ✅
```

---

## 📊 What You Have After Deployment

```
Your Railway Project (ONE project)
│
├─ Frontend
│  └─ React app served at: https://ris-manager-prod-xyz.railway.app
│
├─ Backend
│  └─ Express API at: https://ris-manager-prod-xyz.railway.app/api/...
│
└─ Database
   └─ PostgreSQL with all your data
```

**Single URL for everything**: `https://ris-manager-prod-xyz.railway.app`

---

## 🌐 How 41 Departments Use It

```
All departments access SAME URL:

Department 1 (Engineering):
  https://ris-manager-prod-xyz.railway.app
  Login: engineering_office@bac.gov / ENG2026
  See: Only Engineering requests + items

Department 2 (Accounting):
  https://ris-manager-prod-xyz.railway.app (SAME!)
  Login: accounting_office@bac.gov / ACC2026
  See: Only Accounting requests + items

... (all 41 departments)

Department 41:
  https://ris-manager-prod-xyz.railway.app (SAME!)
  Login: {dept_name}@bac.gov / {ACRONYM}2026
  See: Only their requests + items

Admin (oversees all):
  https://ris-manager-prod-xyz.railway.app (SAME!)
  Login: bryanfortuno@bac.gov / BAC2026
  See: ALL requests from ALL departments
```

---

## 🔄 How Updates Work

After deployment, if you make changes:

```
1. Make changes locally:
   - Edit app.js or backend code
   - Test locally: npm start

2. Commit and push to GitHub:
   git add .
   git commit -m "My changes"
   git push origin main

3. Railway automatically:
   - Detects new push
   - Pulls latest code
   - Builds: npm install && npm run build && cd backend && npm install
   - Starts: cd backend && npm start
   - Deploys automatically!

4. Visit your URL:
   https://ris-manager-prod-xyz.railway.app
   See your changes live! ✅
```

---

## 📱 Using on Electron (Desktop App)

For desktop app (Electron), update the API URL:

In `apiStorageManager.js`:

```javascript
class APIStorageManager {
  constructor(apiURL = null) {
    // For Electron desktop app:
    // this.baseURL = 'https://ris-manager-prod-xyz.railway.app'
    
    // For web browser:
    // this.baseURL = window.location.origin
    
    this.baseURL = apiURL || window.location.origin;
    // ... rest of code
  }
}
```

When users launch the Electron app, they can enter:
```
API URL: https://ris-manager-prod-xyz.railway.app
```

Or hardcode it in production:
```javascript
// In app.js LoginPage component
const apiURL = 'https://ris-manager-prod-xyz.railway.app';
const result = await APIStorageManager.login(email, password, apiURL);
```

---

## 🐛 Troubleshooting

### "Cannot connect to database"

**Solution:**
1. Check Railway PostgreSQL service is running
2. Verify connection string variables in Railway
3. Run: `psql "postgresql://..."` locally to test

### "Build failed"

**Solution:**
1. Check Railway build logs
2. Common issues:
   - Missing `npm run build` script
   - Frontend build errors
   - Missing dependencies

**Fix:**
```bash
# Test locally first:
npm install
npm run build
cd backend
npm install
npm start
```

### "App shows 404"

**Solution:**
1. Make sure `/dist` folder exists after build
2. Check `backend/server.js` has fallback route:
   ```javascript
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../dist/index.html'));
   });
   ```

### "Users can't login"

**Solution:**
1. Check database was seeded: `SELECT COUNT(*) FROM users;` should be > 0
2. Check credentials:
   - Email: exactly `bryanfortuno@bac.gov`
   - Password: exactly `BAC2026`
3. Check JWT_SECRET is set in Railway variables

### "Deployment keeps failing"

**Solution:**
1. Check Railway deployment logs
2. Common issues:
   - Out of memory (too large app)
   - Build timeout (npm install taking too long)
   - Environment variables missing

---

## 📊 Costs

**Railway Free Tier:**
- $5 free credits per month
- Enough for small deployments
- Upgrade to pay-as-you-go if needed

**Your costs with 41 departments:**
- PostgreSQL: Included
- Server: Small (~$5-10/month)
- **Total: ~$10/month** (or free if stays within credits)

---

## ✅ Deployment Checklist

- [ ] Modified `backend/server.js` to serve frontend
- [ ] Updated `package.json` scripts
- [ ] Code pushed to GitHub
- [ ] Created Railway PostgreSQL database
- [ ] Created Railway project for backend
- [ ] Set build command: `npm install && npm run build && cd backend && npm install`
- [ ] Set start command: `cd backend && npm start`
- [ ] Added environment variables (DB_HOST, DB_USER, etc.)
- [ ] Waited for deployment to complete
- [ ] Got Railway URL: `https://ris-manager-prod-xyz.railway.app`
- [ ] Ran migrations: `npm run migrate`
- [ ] Ran seed script: `node db/seed.js`
- [ ] Tested login: ✅ Works
- [ ] Tested with different user: ✅ Works
- [ ] Tested from another computer: ✅ Works

---

## 🎉 Done!

You now have:
✅ One Railway project
✅ One URL for everything
✅ Frontend + Backend + Database
✅ All 41 departments can connect
✅ Real-time data sync
✅ Production-ready deployment

**Single URL to share with everyone:**
```
https://ris-manager-prod-xyz.railway.app
```

Everyone uses same URL, logs in with their account, sees their data! 🚀
