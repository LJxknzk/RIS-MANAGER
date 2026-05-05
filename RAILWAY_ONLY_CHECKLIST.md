# Railway-Only: Quick Checklist

Everything you need to do to deploy to Railway, step-by-step.

---

## ✅ Step 1: Modify Your Code (15 minutes)

### 1.1 Update `backend/server.js`

Add this at the top of the file (after requires):

```javascript
const path = require('path');

// Add this line after const app = express();
app.use(express.static(path.join(__dirname, '../dist')));

// Add this at the END, before app.listen():
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
```

**✅ Done**

### 1.2 Update Root `package.json`

Update the "scripts" section:

```json
"scripts": {
  "build": "vite build",
  "dev": "vite",
  "start": "cd backend && npm start",
  "install-all": "npm install && cd backend && npm install"
}
```

**✅ Done**

### 1.3 Push to GitHub

```bash
git add .
git commit -m "Setup for Railway-only deployment"
git push origin main
```

**✅ Done** - Your code is now ready!

---

## ✅ Step 2: Create Railway Services (20 minutes)

### 2.1 Create Railway Account

1. Go to: https://railway.app
2. Click "Start Project"
3. Sign up with GitHub
4. Authorize Railway

**✅ Done - You're in Railway dashboard**

### 2.2 Create PostgreSQL Database

1. Click "Create New Project"
2. Click "Database" → "PostgreSQL"
3. Railway creates it automatically
4. Click on PostgreSQL service
5. Go to "Connect" tab
6. Copy connection string (looks like):
   ```
   postgresql://user:password@host:port/dbname
   ```
7. **Paste into a text file and save** - you need this!

**✅ Done - Database created**

### 2.3 Create Backend Project

1. Click "Create New Project"
2. Click "Deploy from GitHub repo"
3. Select "RIS-MANAGER"
4. Click "Deploy"

**✅ Done - Railway starts deploying**

---

## ✅ Step 3: Configure Railway (10 minutes)

### 3.1 Set Build Command

1. In Railway project, go to your service
2. Click "Settings" tab
3. Find "Build Command" field
4. Enter:
   ```
   npm install && npm run build && cd backend && npm install
   ```
5. Save

**✅ Done**

### 3.2 Set Start Command

1. Still in Settings
2. Find "Start Command" field
3. Enter:
   ```
   cd backend && npm start
   ```
4. Save/Deploy

**✅ Done**

### 3.3 Add Environment Variables

1. Go to "Variables" tab in your Railway service
2. Click "Add Variable" for each:

**Database Variables** (extract from your connection string):

```
DB_HOST = containers-us-west-12.railway.app
DB_PORT = 5432
DB_USER = postgres
DB_PASSWORD = xxxxx
DB_NAME = railway
```

**Application Variables:**

```
JWT_SECRET = ris_secret_key_2026
PORT = 5000
NODE_ENV = production
ALLOWED_ORIGINS = *
```

**✅ Done - Railway will auto-redeploy with variables**

### 3.4 Wait for Green Checkmark

1. Watch the deployment progress
2. Wait until you see "✓ Deployment Successful"
3. You'll get a URL like: `https://ris-manager-prod-xyz.railway.app`
4. **Save this URL!**

**✅ Done - Your app is live!**

---

## ✅ Step 4: Initialize Database (10 minutes)

### Choose ONE method:

#### Method A: Railway CLI (Easiest)

```bash
# 1. Install
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link
railway link
# Select your RIS-MANAGER project

# 4. Run
cd backend
npm install
npm run migrate
node db/seed.js
```

**✅ Done - Database has users + items**

#### Method B: SSH into Railway

```bash
# 1. In Railway, go to your service
# 2. Click "Settings"
# 3. Toggle "SSH" ON
# 4. Copy and run the SSH command
# 5. Once connected:
cd /app/backend
npm run migrate
node db/seed.js
# 6. Exit:
exit
```

**✅ Done - Database has users + items**

---

## ✅ Step 5: Test Everything (5 minutes)

### Test 1: Health Check

```bash
Visit in browser:
https://ris-manager-prod-xyz.railway.app/health

Should see: {"status":"ok"}
```

**✅ Works**

### Test 2: Login

```bash
Visit: https://ris-manager-prod-xyz.railway.app

Login as:
Email: bryanfortuno@bac.gov
Password: BAC2026

Should see: Admin dashboard
```

**✅ Works**

### Test 3: Department User

```bash
Logout, login as:
Email: accounting_office@bac.gov
Password: ACC2026

Should see: Accounting dashboard
```

**✅ Works**

### Test 4: Another Computer

```bash
Use different computer/browser
Visit same URL: https://ris-manager-prod-xyz.railway.app

Login as different user
Should see different data
```

**✅ Works - Multi-department working!**

---

## ✅ Final Result

```
You have:
✅ One Railway project
✅ One URL: https://ris-manager-prod-xyz.railway.app
✅ Frontend + Backend + Database
✅ Ready for all 41 departments
✅ One command to update: git push

All 41 departments use same URL and see their own data!
```

---

## 📋 Complete Checklist

| Task | Status |
|------|--------|
| Modify backend/server.js | ☐ |
| Update package.json scripts | ☐ |
| Push to GitHub | ☐ |
| Create Railway account | ☐ |
| Create PostgreSQL database | ☐ |
| Deploy from GitHub | ☐ |
| Set build command | ☐ |
| Set start command | ☐ |
| Add environment variables | ☐ |
| Wait for deployment | ☐ |
| Run migrations | ☐ |
| Run seed script | ☐ |
| Test health endpoint | ☐ |
| Test login | ☐ |
| Test different user | ☐ |
| Test from another computer | ☐ |

---

## 🎉 You're Done!

Share this URL with all departments:
```
https://ris-manager-prod-xyz.railway.app
```

Everyone logs in with their account:
- engineering_office@bac.gov / ENG2026
- accounting_office@bac.gov / ACC2026
- ... (41 departments total)

Admin login:
- bryanfortuno@bac.gov / BAC2026

All use same URL, same backend, same database! ✅

---

## 📞 Need Help?

- Full guide: [RAILWAY_ONLY_DEPLOYMENT.md](./RAILWAY_ONLY_DEPLOYMENT.md)
- Troubleshooting: See "Troubleshooting" section in that file
- General help: [README.md](./README.md)

**Total time: ~1 hour to fully deploy!** ⏱️
