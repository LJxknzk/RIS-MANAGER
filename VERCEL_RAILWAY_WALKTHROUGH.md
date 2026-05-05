# Vercel + Railway: Step-by-Step Walkthrough

Complete beginner's guide with every click explained.

---

## 🎯 Goal

Deploy RIS Manager so that:
- Everyone accesses from web browser at: **https://ris-manager.vercel.app**
- All data stored in cloud at: **https://ris-backend-xyz.railway.app**
- Works from any computer in the world

---

## Part 1: Setup Railway PostgreSQL

### Step 1: Create Railway Account

1. Go to **https://railway.app**
2. Click **"Start Project"** (top right)
3. Click **"Continue with GitHub"**
4. Log in with your GitHub account
5. Click **"Authorize Railway"**

**What happens**: Railway connects to your GitHub account

### Step 2: Create PostgreSQL Database

1. You're now in Railway dashboard
2. Click **"Create New Project"** or **"+ New"**
3. In the menu, find and click **"Database"**
4. Select **"PostgreSQL"**
5. Railway automatically creates it!
6. Wait for green "✓ Deployment Successful"

**What happens**: Railway creates a PostgreSQL database in the cloud

### Step 3: Save Your Database Connection String

1. Click on the **PostgreSQL** box/service
2. Go to **"Connect"** tab
3. You'll see a connection string like:
   ```
   postgresql://user:password@host:port/dbname
   ```
4. **Copy the entire string** and paste into a text file
5. Save it somewhere safe - you'll need it 3 times!

**Example of what you're copying:**
```
postgresql://postgres:kX9mP2wQ@containers-us-west-14.railway.app:8098/railway
                      └────────────────────────────────────────────────────────┘
```

---

## Part 2: Deploy Backend to Railway

### Step 1: Create Another Railway Project for Backend

1. Go back to Railway dashboard (home page)
2. Click **"Create New Project"** 
3. Select **"Deploy from GitHub repo"**
4. Click **"Configure GitHub App"** (if needed)
5. In the list, find and select **RIS-MANAGER**
6. Click **"Deploy"**

**What happens**: Railway pulls your code from GitHub and prepares to deploy

### Step 2: Wait for Initial Deployment

1. You'll see "Deployment in Progress"
2. Wait until you see a message or URL appears
3. This takes ~2-3 minutes

### Step 3: Add PostgreSQL to Backend

1. In the Railway project, click **"Add"** button
2. Select **"Existing Database"** or **"PostgreSQL"**
3. Select the PostgreSQL you created in Part 1
4. Railway automatically links it ✅

**What happens**: Your backend can now talk to the database

### Step 4: Add Environment Variables

1. Click on the **Backend** service (not the database)
2. Go to **"Variables"** tab
3. Add each variable by clicking **"+ Add Variable"**

**Add these 9 variables** (copy-paste these one by one):

| Name | Value | Where to find |
|------|-------|---------------|
| `DB_HOST` | Extract from connection string | `postgresql://user:pass@**containers-us-west-14.railway.app**:...` |
| `DB_PORT` | Extract from connection string | `postgresql://user:pass@host:**8098**/...` |
| `DB_USER` | Extract from connection string | `postgresql://**user**:pass@...` |
| `DB_PASSWORD` | Extract from connection string | `postgresql://user:**password**@...` |
| `DB_NAME` | Extract from connection string | `postgresql://user:pass@host:port/**railway**` |
| `JWT_SECRET` | `ris_secret_key_2026` | (Make this up) |
| `PORT` | `5000` | (Always this) |
| `NODE_ENV` | `production` | (Always this) |
| `ALLOWED_ORIGINS` | `https://ris-manager.vercel.app` | (You'll update this later) |

**How to extract from connection string:**
```
postgresql://postgres:kX9mP2wQ@containers-us-west-14.railway.app:8098/railway
            └──────┬──────┘ └─────────┬─────────┘ └─────────┬────────┘ └┬┘ └──┬──┘
              DB_USER          DB_HOST               DB_PORT        PORT DB_NAME
```

### Step 5: Set Deployment Commands

1. Still in Backend service, go to **"Deployment"** tab (or "Settings")
2. Find **"Build Command"** field
3. Set it to:
   ```
   cd backend && npm install
   ```
4. Find **"Start Command"** field
5. Set it to:
   ```
   cd backend && npm run migrate && npm start
   ```
6. Click **"Save"** or **"Deploy"**

**What happens**: Railway knows how to build and start your Node.js app

### Step 6: Get Your Backend URL

1. Go back to main service page
2. Look for a generated URL (Railway creates one automatically)
3. Example: `https://ris-backend-prod-xyz.railway.app`
4. **Copy and save this URL** - you'll need it soon!

**Test it works:**
```
Open in browser: https://ris-backend-prod-xyz.railway.app/health
Should see: {"status":"ok"}
```

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Create Vercel Account

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Click **"Continue with GitHub"**
4. Log in and authorize Vercel

**What happens**: Vercel connects to your GitHub

### Step 2: Deploy Your Project

1. In Vercel dashboard, click **"Add New Project"** or **"Import Project"**
2. Select **"Import Git Repository"**
3. Paste your GitHub repository URL or select from list
4. Select **RIS-MANAGER**
5. Click **"Import"**

### Step 3: Add Environment Variable

1. You'll see a "Configure Project" screen
2. Look for **"Environment Variables"** section
3. Add 1 variable:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://ris-backend-xyz.railway.app` |

(Paste YOUR backend URL from Part 2 Step 6)

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for "✓ Deployment Successful"
3. Vercel shows your new website URL
4. Example: `https://ris-manager.vercel.app`

**What happens**: Your app is now live on the internet!

### Step 5: Test Frontend

1. Open: `https://ris-manager.vercel.app` in browser
2. Try to login with:
   - Email: `bryanfortuno@bac.gov`
   - Password: `BAC2026`
3. You should see the dashboard ✅

---

## Part 4: Initialize Database

### Step 1: Populate Database with Users & Inventory

You need to run the seed script. Choose ONE method:

#### Method A: Using Railway CLI (Easiest)

```bash
# 1. Open terminal/command prompt on your computer
# 2. Install Railway CLI:
npm install -g @railway/cli

# 3. Login:
railway login
# (Opens browser, authorize)

# 4. Link to your Railway project:
railway link
# (Select your RIS-MANAGER backend project)

# 5. Run migrations:
cd backend
npm install
npm run migrate

# 6. Seed the database:
node db/seed.js

# Done! Your database now has admin + 41 departments + items
```

#### Method B: Using SSH (If CLI doesn't work)

```bash
# 1. In Railway backend service → Settings
# 2. Enable SSH (toggle on)
# 3. Copy the SSH command
# 4. Run it in terminal:
ssh -p 22 -i /path/to/key <ssh_connection>

# 5. Inside the SSH session:
cd /app/backend
npm run migrate
node db/seed.js
```

### Step 2: Verify Database

```bash
# Check if it worked by querying the database:
# (Use your connection string from Part 1)

psql "postgresql://user:password@host:port/dbname"

# Inside psql, run:
SELECT COUNT(*) FROM users;
# Should show: 1 (admin user)

SELECT COUNT(*) FROM inventory;
# Should show: 116 (inventory items)

\q
```

---

## Part 5: Update ALLOWED_ORIGINS

Railway needs to know which websites can connect to the backend.

1. Go to **Railway dashboard** → Your backend project
2. Go to **"Variables"** tab
3. Find **`ALLOWED_ORIGINS`** variable
4. Change the value to:
   ```
   https://ris-manager.vercel.app,https://localhost:3000
   ```
5. Click **"Update"** or save

**What happens**: Your frontend can now talk to your backend!

---

## 🎉 DONE! You Now Have

```
Frontend:  https://ris-manager.vercel.app
Backend:   https://ris-backend-xyz.railway.app
Database:  PostgreSQL (in Railway)
```

---

## ✅ Final Testing

### Test 1: Login
```
1. Open: https://ris-manager.vercel.app
2. Email: bryanfortuno@bac.gov
3. Password: BAC2026
4. Should see dashboard ✅
```

### Test 2: Submit a Request
```
1. Logged in as admin
2. Go to "Admin Dashboard"
3. Click "New RIS Request"
4. Select some items
5. Submit ✅
6. Request appears in list
```

### Test 3: Multi-Department
```
1. Logout
2. Login as accounting_office@bac.gov / ACC2026
3. Should only see Accounting requests
4. Logout
5. Login as engineering_office@bac.gov / ENG2026
6. Should only see Engineering requests ✅
```

---

## 📱 Using on Multiple Computers

Once deployed:

**Computer 1:**
```
1. Open: https://ris-manager.vercel.app
2. Login: engineering_office@bac.gov / ENG2026
3. Submit RIS requests
```

**Computer 2:**
```
1. Open same URL: https://ris-manager.vercel.app
2. Login: accounting_office@bac.gov / ACC2026
3. See same data from database
4. Can submit own requests
```

**Result**: All 41 departments can use from their own computers! ✅

---

## 🐛 Troubleshooting

### "Cannot connect to backend"
**Solution:**
1. Check backend URL is correct in Vercel env var
2. Test in browser: `https://ris-backend-xyz.railway.app/health`
3. Should see: `{"status":"ok"}`

### "Login fails"
**Solution:**
1. Check database was seeded: `SELECT COUNT(*) FROM users;` should be > 0
2. Check credentials: email exactly: `bryanfortuno@bac.gov`
3. Check password: exactly: `BAC2026`

### "CORS error in browser console"
**Solution:**
1. Go to Railway backend → Variables
2. Update `ALLOWED_ORIGINS` to include your Vercel URL
3. Save and redeploy

### "502 Bad Gateway"
**Solution:**
1. Backend crashed, check Railway logs
2. Click backend service → Deployments tab
3. Read the error message
4. Common: Database connection failed, check DB variables

---

## 📞 Support

If stuck:
1. Check [DEPLOY_VERCEL_RAILWAY.md](./DEPLOY_VERCEL_RAILWAY.md) for more details
2. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for alternatives
3. Check logs in Railway dashboard
4. Check browser console (F12) for error messages

---

**You're done! 🎉**

Your RIS Manager is now deployed and ready for all 41 departments to use from any computer in the world!

**Total time**: ~15-20 minutes
**Cost**: $0-5/month (free tier)
**Users**: Unlimited (scales automatically)
