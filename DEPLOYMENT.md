# RIS Manager - Deployment Guide

Complete guide to deploy the RIS Manager system online with backend API, database, and Electron desktop app.

## Architecture Overview

```
┌──────────────────┐         ┌─────────────────┐        ┌──────────────────┐
│  Electron App    │────────▶│  Express API    │───────▶│  PostgreSQL DB   │
│  (Desktop)       │         │  (Cloud Server) │        │  (Cloud Managed) │
│  - React UI      │         │  - Auth         │        │  - Users         │
│  - Secure Token  │         │  - RIS Requests │        │  - Requests      │
│    Storage       │         │  - Inventory    │        │  - Inventory     │
└──────────────────┘         └─────────────────┘        └──────────────────┘
```

## ⚡ Quick Option: Vercel + Railway + Railway PostgreSQL

**Want the fastest deployment?** Use this recommended setup:
- Frontend → Vercel (fast CDN)
- Backend → Railway (simple, free tier available)
- Database → Railway PostgreSQL (managed)

**See**: [DEPLOY_VERCEL_RAILWAY.md](./DEPLOY_VERCEL_RAILWAY.md)

---

## Phase 1: Local Development

### 1.1 Install PostgreSQL (if not already installed)

**Windows:**
```bash
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 1.2 Create Local Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql shell:
CREATE DATABASE ris_manager;
\q
```

### 1.3 Setup Backend (Local)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set database credentials
npm run migrate
node db/seed.js
npm run dev
```

Server runs on `http://localhost:5000`

### 1.4 Setup Electron App (Local)

```bash
cd ..
# Install dependencies
npm install

# When prompted for API URL during login, use: http://localhost:5000

npm start
```

---

## Phase 2: Cloud Deployment

Choose your hosting platform:

### Option A: Render.com (Recommended - Easy)

#### Backend Deployment

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create PostgreSQL Database**
   - In Render dashboard: New ➜ PostgreSQL
   - Choose `Free` tier (for testing) or `Standard` (production)
   - Name: `ris-manager-db`
   - Region: Pick closest to your users
   - Copy connection string

3. **Create Web Service for Backend**
   - New ➜ Web Service
   - Connect your GitHub repo
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm run migrate && npm start`
   - Environment Variables:
     ```
     DB_HOST={postgres_host_from_connection_string}
     DB_PORT=5432
     DB_USER={postgres_user}
     DB_PASSWORD={postgres_password}
     DB_NAME=ris_manager
     JWT_SECRET=your_secret_key_here_change_this
     PORT=5000
     NODE_ENV=production
     ALLOWED_ORIGINS=*
     ```
   - Deploy

4. **Initialize Database**
   - After deployment, run migrations:
   ```bash
   # From your local machine, connect to Render database and run:
   psql postgresql://user:password@host:5432/ris_manager < backend/db/migrate.js
   node backend/db/seed.js
   ```

#### Electron App Configuration

1. **Update API URL in app.js or as environment variable**
   ```bash
   # Before building
   export REACT_APP_API_URL=https://your-backend.onrender.com
   ```

2. **Package Electron for Deployment**
   ```bash
   npm install electron-builder --save-dev
   npm run build  # or custom build command
   ```

---

### Option B: Railway.app

1. **Create Railway Account** at https://railway.app
2. **Connect GitHub repository**
3. **Add PostgreSQL Plugin**
   - Add Plugin ➜ PostgreSQL
4. **Deploy Backend Service**
   - Set build command: `npm install && cd backend && npm install`
   - Set start command: `npm start`
5. **Set Environment Variables** (same as Render)

---

### Option C: Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Create App**
   ```bash
   fly launch
   # Choose region, enable PostgreSQL
   ```

3. **Deploy**
   ```bash
   fly deploy
   ```

---

## Phase 3: Electron App Packaging

### 3.1 Build for Windows

```bash
npm install electron-builder --save-dev

# Create build config in package.json:
"build": {
  "appId": "com.bac.ris-manager",
  "productName": "RIS Manager",
  "files": [
    "app.js",
    "apiStorageManager.js",
    "Index.html",
    "main.js",
    "preload.js",
    "node_modules/**/*"
  ],
  "win": {
    "target": ["nsis", "portable"]
  }
}

npm run build
```

### 3.2 Build for macOS

```bash
npm run build -- --mac
```

### 3.3 Build for Linux

```bash
npm run build -- --linux
```

---

## Phase 4: Configuration & Security

### User Guide for Deployment

1. **First-Time Setup (Admin)**
   - Email: `bryanfortuno@bac.gov`
   - Password: `BAC2026`

2. **Department Accounts**
   - Email: `{department_name}@bac.gov`
   - Password: `{DEPT_ACRONYM}2026`
   - Example: `accounting_office@bac.gov` / `ACC2026`

3. **API Server URL (in Electron)**
   - During login, click "Advanced Settings"
   - Enter your deployed backend URL (e.g., `https://ris-backend.onrender.com`)

### Security Best Practices

- ✅ Change `JWT_SECRET` in production
- ✅ Use HTTPS for all API calls
- ✅ Enable database backups
- ✅ Restrict database access to backend server only
- ✅ Use environment variables, never commit secrets
- ✅ Enable audit logging in PostgreSQL
- ✅ Implement rate limiting on API endpoints

---

## Troubleshooting

### "Connection refused" Error

- Check backend is running: `curl http://localhost:5000/health`
- Check database connection string in `.env`
- Ensure PostgreSQL is running

### "Invalid token" Error

- Clear token from Electron secure storage: restart app
- Check JWT_SECRET matches between development and production

### Slow API Responses

- Check database indexes: run `npm run migrate` again
- Monitor query performance in PostgreSQL
- Scale up server if needed

---

## Monitoring & Logs

### View Backend Logs

**Render:**
- Dashboard ➜ Service ➜ Logs tab

**Railway:**
- Dashboard ➜ Service ➜ Logs

**Local:**
```bash
npm run dev  # Shows console output
```

### Database Backups

**Render (PostgreSQL):**
- Automatic daily backups in free tier
- Manual backups in dashboard

---

## Updating the App

### Update Backend

```bash
# Make changes to backend code
git push origin main

# Render/Railway auto-deploys from main branch
# Monitor logs to ensure successful deployment
```

### Update Electron App

1. Make changes to app code
2. Build: `npm run build`
3. Distribute `.exe` (Windows), `.dmg` (macOS), or `.AppImage` (Linux) to users
4. Users install over previous version

---

## Cost Estimate (Monthly)

| Service | Free Tier | Hobby | Pro |
|---------|-----------|-------|-----|
| Express Backend | $0 (Render) | $5-7 (Railway) | $25+ |
| PostgreSQL | $0 (shared) | $15 | $50+ |
| **Total** | **~$0** | **~$20** | **$75+** |

---

## Support URLs

- Backend Health: `https://{your-backend}/health`
- API Docs: Postman collection available in `/docs`
- Database: Connection string in service dashboard

For issues, check:
1. Backend logs
2. Database connection
3. API response codes (401 = auth, 500 = server error)
