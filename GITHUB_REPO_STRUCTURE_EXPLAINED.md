# Complete Explanation: GitHub Repo Structure + Deployment

Learn exactly how your GitHub repository is organized and how Vercel + Railway use it.

---

## 📁 Your GitHub Repository Structure

Your RIS-MANAGER repository is **ONE unified repo** with both frontend and backend inside:

```
RIS-MANAGER (GitHub Repository)
│
├─ 📁 backend/                    ← BACKEND CODE (Node.js/Express)
│  ├─ server.js                   ← Express server entry point
│  ├─ package.json                ← Backend dependencies
│  ├─ 📁 db/                      ← Database files
│  │  ├─ client.js                ← PostgreSQL connection
│  │  ├─ migrate.js               ← Create tables
│  │  └─ seed.js                  ← Add test data
│  ├─ 📁 routes/                  ← API endpoints
│  │  ├─ auth.js                  ← Login/logout
│  │  ├─ users.js                 ← User management
│  │  ├─ requests.js              ← RIS requests
│  │  ├─ inventory.js             ← Stock management
│  │  └─ departments.js           ← Departments list
│  ├─ 📁 middleware/              ← Security
│  │  └─ auth.js                  ← JWT verification
│  ├─ .env.example                ← Environment template
│  └─ README.md                   ← Backend docs
│
├─ 📁 frontend/  (ROOT LEVEL)     ← FRONTEND CODE (React/Electron)
│  ├─ app.js                      ← Main React app (~3000 lines)
│  ├─ apiStorageManager.js        ← API client
│  ├─ main.js                     ← Electron main process
│  ├─ preload.js                  ← Token storage bridge
│  ├─ Index.html                  ← HTML entry point
│  └─ package.json                ← Frontend dependencies
│
├─ 📄 README.md                   ← Project overview
├─ 📄 package.json                ← Root package (for Vercel)
└─ 📄 .gitignore                  ← What to ignore
```

---

## 🎯 Key Point: ONE Repository, TWO Deployments

```
Your GitHub Repo (ONE)
    │
    ├─▶ Vercel (reads root level + builds frontend)
    │   └─ Deploys to: https://ris-manager.vercel.app
    │
    └─▶ Railway (reads /backend folder + builds backend)
        └─ Deploys to: https://ris-backend-xyz.railway.app
```

**This means:**
- ✅ Frontend files are in the root directory (`/`)
- ✅ Backend files are in `/backend` subdirectory
- ✅ Each platform (Vercel, Railway) knows exactly what to deploy
- ✅ One GitHub push updates both!

---

## 🔧 How Each Platform Uses the Repo

### Vercel (Frontend)

**What Vercel does:**
1. Pulls your GitHub repo
2. Looks at the **root level** for `package.json`
3. Reads your **build command**: `npm run build`
4. Builds React app and creates `dist/` folder
5. Deploys `dist/` to CDN

**What Vercel ignores:**
- ❌ `/backend` folder (doesn't need it)
- ❌ Backend dependencies (doesn't install them)

**Vercel sees this structure:**
```
RIS-MANAGER (from Vercel's view)
│
├─ app.js              ← React component
├─ apiStorageManager.js ← API client
├─ main.js             ← Electron main
├─ Index.html          ← HTML entry
├─ package.json        ← "Build: npm run build"
└─ backend/            ← Ignored (not needed)
```

### Railway (Backend)

**What Railway does:**
1. Pulls your GitHub repo
2. Looks at `/backend` folder
3. Reads **backend's** `package.json`
4. Reads your **build command**: `cd backend && npm install`
5. Reads your **start command**: `npm start`
6. Installs dependencies in `/backend`
7. Starts Node.js server

**What Railway ignores:**
- ❌ Root-level frontend files
- ❌ React/Electron dependencies
- ❌ Frontend build process

**Railway sees this structure:**
```
RIS-MANAGER/backend/ (from Railway's view)
│
├─ server.js               ← Express entry point
├─ package.json            ← "Start: npm start"
├─ db/                     ← Database scripts
├─ routes/                 ← API endpoints
├─ middleware/             ← Auth middleware
└─ .env.example            ← Variables needed
```

---

## 🔄 Complete Data Flow Diagram

### Browser/User Perspective

```
User opens browser
    │
    ▼
https://ris-manager.vercel.app
    │
    ├─▶ Vercel serves React app (HTML + JS + CSS)
    │   └─ React loads in browser
    │
    └─▶ User types email/password and clicks Login
        │
        ├─▶ React sends to: https://ris-backend-xyz.railway.app/auth/login
        │   │
        │   └─▶ Railway backend receives request
        │       │
        │       ├─▶ Queries PostgreSQL database
        │       │   └─ "Is email correct? Is password correct?"
        │       │
        │       └─▶ Returns: { token: "JWT123...", user: {...} }
        │
        └─▶ React stores token (in Electron safeStorage or localStorage)
            │
            └─▶ Shows dashboard
```

### Component Connections

```
┌─────────────────────────────────────────┐
│       USER'S COMPUTER                   │
│  ┌─────────────────────────────────┐   │
│  │  Electron App (React)           │   │
│  │  - app.js (UI components)       │   │
│  │  - apiStorageManager.js (API)   │   │
│  │  - preload.js (token storage)   │   │
│  │  - main.js (Electron main)      │   │
│  └───────────────┬─────────────────┘   │
└──────────────────┼──────────────────────┘
                   │ HTTPS API Calls
                   │ (with JWT token)
                   ▼
┌─────────────────────────────────────────┐
│       RAILWAY (Backend)                 │
│  ┌─────────────────────────────────┐   │
│  │  Express Server                 │   │
│  │  - server.js                    │   │
│  │  - routes/auth.js               │   │
│  │  - routes/requests.js           │   │
│  │  - routes/inventory.js          │   │
│  │  - middleware/auth.js           │   │
│  └───────────────┬─────────────────┘   │
└──────────────────┼──────────────────────┘
                   │ SQL Queries
                   ▼
┌─────────────────────────────────────────┐
│  RAILWAY PostgreSQL Database            │
│  ┌─────────────────────────────────┐   │
│  │  Tables:                        │   │
│  │  - users (login credentials)    │   │
│  │  - requests (RIS data)          │   │
│  │  - inventory (stock levels)     │   │
│  │  - departments (list)           │   │
│  │  - stock_history (audit trail)  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 📋 Step-by-Step Deployment Explained

### Step 1: GitHub Setup (What You Already Have)

```
Your computer has:
  RIS-MANAGER/
  ├─ app.js (frontend)
  ├─ package.json (frontend dependencies)
  └─ backend/
     ├─ server.js (backend entry)
     ├─ package.json (backend dependencies)
     └─ ... (all backend files)

You push to GitHub:
  git add .
  git commit -m "Initial commit"
  git push origin main
  
GitHub now has your repo
```

---

### Step 2: Railway PostgreSQL Database

```
YOUR ACTIONS:
1. Go to railway.app
2. Click "New Project"
3. Select "PostgreSQL"
4. Railway automatically creates database in cloud

RESULT:
┌─────────────────────────────┐
│  Railway PostgreSQL         │
│  host: xyz.railway.app      │
│  port: 5432                 │
│  user: postgres             │
│  password: xxxxx            │
│  database: railway          │
└─────────────────────────────┘
```

---

### Step 3: Railway Backend Deployment

```
YOUR ACTIONS:
1. Go to railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select RIS-MANAGER repo
5. Railway reads /backend/package.json

WHAT RAILWAY DOES AUTOMATICALLY:
┌────────────────────────────────────────┐
│ 1. Clones RIS-MANAGER from GitHub      │
│ 2. Reads /backend/package.json         │
│ 3. Sees build cmd: cd backend && ...   │
│ 4. Installs npm packages in /backend   │
│ 5. Sees start cmd: npm start           │
│ 6. Runs server.js                      │
│ 7. Connects to PostgreSQL database     │
│ 8. Listens on port 5000                │
└────────────────────────────────────────┘

RESULT:
Your backend is now running at:
https://ris-backend-xyz.railway.app
```

---

### Step 4: Vercel Frontend Deployment

```
YOUR ACTIONS:
1. Go to vercel.com
2. Click "Add New Project"
3. Select "Import from GitHub repo"
4. Select RIS-MANAGER repo
5. Vercel reads root-level package.json

WHAT VERCEL DOES AUTOMATICALLY:
┌────────────────────────────────────────┐
│ 1. Clones RIS-MANAGER from GitHub      │
│ 2. Reads root /package.json            │
│ 3. Installs npm packages (React, etc.) │
│ 4. Sees build cmd: npm run build       │
│ 5. Runs build (creates /dist folder)   │
│ 6. Uploads /dist to CDN servers        │
│ 7. Ignores /backend completely         │
└────────────────────────────────────────┘

RESULT:
Your frontend is now at:
https://ris-manager.vercel.app
(deployed to 200+ CDN nodes worldwide)
```

---

### Step 5: Connect Frontend to Backend

```
YOUR ACTIONS:
1. In Vercel project settings
2. Add environment variable:
   REACT_APP_API_URL=https://ris-backend-xyz.railway.app
3. Save

WHAT HAPPENS:
React code receives the backend URL
When you login, React calls:
  https://ris-backend-xyz.railway.app/auth/login
(instead of localhost:5000)

Also update Railway backend:
1. In Railway backend variables
2. Set: ALLOWED_ORIGINS=https://ris-manager.vercel.app
3. This tells backend to accept requests from your frontend
```

---

### Step 6: Initialize Database

```
YOUR ACTIONS:
Option A - Railway CLI:
  railway login
  cd backend
  npm run migrate
  node db/seed.js

Option B - SSH into Railway:
  (Connect via SSH, run same commands)

WHAT HAPPENS:
┌─────────────────────────────────────────┐
│ 1. npm run migrate runs backend/db/...  │
│    Creates all 7 tables in PostgreSQL   │
│ 2. node db/seed.js runs                 │
│    Adds 1 admin + 41 departments        │
│    Adds 116 inventory items             │
└─────────────────────────────────────────┘

Now PostgreSQL has data:
users table:        1 admin + 41 departments
inventory table:    116 items
requests table:     (empty, users will add)
```

---

## 🎯 Complete Connection Example

### Scenario: Engineering Office User Submits Request

```
1. USER OPENS BROWSER
   ├─ https://ris-manager.vercel.app
   └─ React app loads from Vercel CDN

2. USER LOGS IN
   ├─ Enters: engineering_office@bac.gov / ENG2026
   ├─ React calls: https://ris-backend-xyz.railway.app/auth/login
   │
   └─ Railway backend receives request
      ├─ Queries PostgreSQL: SELECT * FROM users WHERE email=...
      ├─ Verifies password matches
      ├─ Returns JWT token
      └─ Frontend stores in safeStorage

3. USER SUBMITS RIS REQUEST
   ├─ Fills form (office items, quantities)
   ├─ Clicks "Submit"
   ├─ React calls: https://ris-backend-xyz.railway.app/api/requests
   │
   └─ Railway backend receives request
      ├─ Verifies JWT token is valid
      ├─ Checks user is from Engineering dept
      ├─ Inserts into PostgreSQL requests table
      ├─ Generates control number: ENG-2026-001
      └─ Returns success

4. ADMIN APPROVES REQUEST
   ├─ Different computer, different person
   ├─ https://ris-manager.vercel.app (same URL!)
   ├─ Logs in as: bryanfortuno@bac.gov / BAC2026
   │
   ├─ React calls: https://ris-backend-xyz.railway.app/api/requests
   │  └─ Gets all requests from PostgreSQL
   │
   ├─ Clicks "Approve" on Engineering's request
   ├─ React calls: https://ris-backend-xyz.railway.app/api/requests/{id}/approve
   │
   └─ Railway backend receives request
      ├─ Verifies JWT (admin role)
      ├─ Updates PostgreSQL: status='approved', risNumber=RIS001
      └─ Returns success

5. ENGINEERING USER SEES UPDATE
   ├─ Refreshes page (or gets real-time update)
   ├─ React calls: https://ris-backend-xyz.railway.app/api/requests
   ├─ Gets updated request from PostgreSQL
   └─ Shows "approved" status ✅
```

---

## 📊 Repository Organization Explained

### Why ONE Repository?

**Advantages:**
✅ Easy to sync (one push to GitHub updates both)
✅ Shared configuration files (.env, package.json)
✅ Easy dependency management
✅ Easier to maintain

**Alternative (NOT recommended):**
```
If you had TWO separate repos:
  Frontend-Repo/
  Backend-Repo/

Problems:
❌ Have to push to both repos
❌ Versions can get out of sync
❌ More complicated deployment
❌ More places to configure
```

### How Each Platform Deploys From ONE Repo

```
GitHub: RIS-MANAGER (ONE repository)
    │
    ├─ Vercel deployment
    │  ├─ Reads root-level files
    │  ├─ Build: npm run build
    │  ├─ Deploys to: vercel.app
    │  └─ Ignores: /backend folder
    │
    └─ Railway deployment
       ├─ Reads /backend folder
       ├─ Build: cd backend && npm install
       ├─ Start: npm start
       ├─ Deploys to: railway.app
       └─ Ignores: root frontend files
```

---

## 🔐 File Configuration Explained

### Root-Level `package.json` (Frontend)

```json
{
  "name": "ris-manager-frontend",
  "version": "2.0.0",
  "scripts": {
    "start": "electron .",
    "build": "vite build",
    "dev": "vite"
  },
  "dependencies": {
    "react": "^18.0.0",
    "electron": "^41.0.0"
  }
}
```

**This is for:**
- Vercel frontend deployment
- Local development (npm start)
- Building React app (npm run build)

### Backend `package.json` (/backend)

```json
{
  "name": "ris-manager-backend",
  "version": "2.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node db/migrate.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.1.0"
  }
}
```

**This is for:**
- Railway backend deployment
- Local development (npm run dev)
- Database migrations (npm run migrate)

---

## 🚀 Step-by-Step Deployment Summary

| Step | What Happens | Result |
|------|------------|--------|
| 1 | Push to GitHub | Code stored in cloud |
| 2 | Create Railway PostgreSQL | Database created |
| 3 | Connect Railway to GitHub | Backend deployed to railway.app |
| 4 | Add environment variables | Backend knows database credentials |
| 5 | Connect Vercel to GitHub | Frontend deployed to vercel.app |
| 6 | Add REACT_APP_API_URL | Frontend knows backend URL |
| 7 | Run migrations | Database tables created |
| 8 | Run seed script | Database populated with users |
| 9 | Test login | Everything works! ✅ |

---

## ✅ After Deployment You Have

```
GitHub Repository (ONE)
├─ Frontend code (root)
└─ Backend code (/backend)

Vercel (Frontend Deployment)
├─ URL: https://ris-manager.vercel.app
├─ Served from: CDN (200+ locations)
├─ Built from: root-level files
└─ Updates when: you push to main

Railway Backend (Backend Deployment)
├─ URL: https://ris-backend-xyz.railway.app
├─ Running from: /backend folder
├─ Connected to: Railway PostgreSQL
└─ Updates when: you push to main

Railway PostgreSQL (Database)
├─ Managed database
├─ Automatic backups
├─ 7 tables with data
└─ Shared by frontend & backend
```

---

## 🎯 Key Takeaways

**1. One Repository, Multiple Deployments**
- Frontend and backend in same GitHub repo
- Vercel deploys frontend automatically
- Railway deploys backend automatically
- One `git push` updates both!

**2. How They Find Each Other**
- Vercel gets `REACT_APP_API_URL` env var → points to Railway
- React code sends API calls to Railway backend
- Railway gets `ALLOWED_ORIGINS` env var → allows Vercel frontend
- Everyone can talk to each other ✅

**3. Data Flow**
- User visits vercel.app (frontend)
- Frontend calls railway.app (backend)
- Backend queries postgresql (database)
- Results flow back to user

**4. No Separation Needed**
- ❌ NOT: Two separate GitHub repos
- ❌ NOT: Two separate deployments (Railway for both)
- ✅ YES: One GitHub repo, Vercel for frontend, Railway for backend

---

## 📱 Multi-Computer Example

```
Computer 1 (Engineering)
└─ Opens: https://ris-manager.vercel.app
   └─ Logs in: engineering_office@bac.gov
      └─ Calls backend: https://ris-backend-xyz.railway.app
         └─ Queries database: PostgreSQL
            └─ Sees Engineering requests

Computer 2 (Accounting)
└─ Opens: https://ris-manager.vercel.app (SAME URL!)
   └─ Logs in: accounting_office@bac.gov
      └─ Calls backend: https://ris-backend-xyz.railway.app (SAME backend!)
         └─ Queries database: PostgreSQL (SAME database!)
            └─ Sees Accounting requests (different data)

Both computers:
✅ Use same frontend (deployed to Vercel)
✅ Use same backend (deployed to Railway)
✅ Use same database (PostgreSQL)
✅ See different data (based on user role)
```

---

**You now understand:**
- ✅ GitHub repo structure (one unified repo)
- ✅ How Vercel deploys frontend
- ✅ How Railway deploys backend
- ✅ How they connect together
- ✅ How data flows between them
- ✅ How multiple departments use it

Ready to deploy? Start with [VERCEL_RAILWAY_WALKTHROUGH.md](./VERCEL_RAILWAY_WALKTHROUGH.md)
