# Vercel + Railway Deployment - Quick Reference Card

Print this or bookmark it!

---

## 📋 What You'll Need

- [ ] GitHub account (with RIS-MANAGER repo)
- [ ] Vercel account (free at vercel.com)
- [ ] Railway account (free at railway.app)

---

## 🚀 5-Minute Setup Summary

### Step 1: Railway PostgreSQL
```
railway.app → New Project → PostgreSQL
↓
Copy connection string
↓
Keep safe! You'll need this
```

### Step 2: Railway Backend
```
railway.app → New Project → Deploy from GitHub
↓
Select: RIS-MANAGER repo
↓
Add Variables:
  DB_HOST = (from connection string)
  DB_PORT = 5432
  DB_USER = (from connection string)
  DB_PASSWORD = (from connection string)
  DB_NAME = (from connection string)
  JWT_SECRET = any_random_string_here
  PORT = 5000
  NODE_ENV = production
  ALLOWED_ORIGINS = https://ris-manager.vercel.app
↓
Build: cd backend && npm install
Start: cd backend && npm run migrate && npm start
↓
Copy Backend URL (e.g., https://ris-backend-xyz.railway.app)
```

### Step 3: Vercel Frontend
```
vercel.com → Add New Project → Import RIS-MANAGER
↓
Add Variable:
  REACT_APP_API_URL = <your_railway_backend_url>
↓
Deploy!
↓
Get Frontend URL (e.g., https://ris-manager.vercel.app)
```

### Step 4: Initialize Database
```bash
# Option A: Using Railway CLI
railway login
railway link
cd backend && npm install
npm run migrate
node db/seed.js

# Option B: Or use Vercel logs/SSH into Railway
```

### Step 5: Update ALLOWED_ORIGINS
```
Go back to Railway backend → Variables
Update ALLOWED_ORIGINS to include your Vercel URL
```

---

## ✅ Test Your Deployment

### Test Backend
```bash
curl https://ris-backend-xyz.railway.app/health
# Should return: {"status":"ok"}
```

### Test Login
```bash
curl -X POST https://ris-backend-xyz.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bryanfortuno@bac.gov","password":"BAC2026"}'
# Should return JWT token
```

### Test Frontend
```
Open: https://ris-manager.vercel.app
Login: bryanfortuno@bac.gov / BAC2026
Submit a test request ✅
```

---

## 📊 After Deployment URLs

```
Frontend:  https://ris-manager.vercel.app
Backend:   https://ris-backend-xyz.railway.app
Database:  Railway managed PostgreSQL
```

---

## 🔑 Default Login Credentials

```
Admin:
  Email: bryanfortuno@bac.gov
  Password: BAC2026

Department Examples:
  accounting_office@bac.gov / ACC2026
  engineering_office@bac.gov / ENG2026
  procurement_office@bac.gov / PRO2026
```

---

## 💰 Costs

```
Vercel:    $0 (Free tier with limits)
Railway:   $5 free credits/month
Database:  Included in Railway
           
Total:     ~$0-5/month (Free tier)
           ~$20-40/month (if you outgrow free)
```

---

## 🐛 Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| Cannot connect to database | Check DB_HOST, DB_USER, DB_PASSWORD exact match in Railway variables |
| 502 Bad Gateway | Check backend logs in Railway → Deployment tab |
| CORS error | Update ALLOWED_ORIGINS in Railway backend variables |
| Cannot login | Run `node backend/db/seed.js` to populate users |
| Vercel deployment fails | Check Build Command: `npm run build` (or `npm i && npm run build`) |

---

## 📱 For Multiple Computers

Once deployed:
1. Each computer installs the Vercel-hosted Electron app (or visits web version)
2. Each computer logs in with different account
3. All see same database in Railway
4. Perfect for 41 departments!

**Example:**
```
Computer 1: engineering_office@bac.gov / ENG2026
Computer 2: accounting_office@bac.gov / ACC2026
Computer 3: bryanfortuno@bac.gov / BAC2026 (admin)

All connected to same Railway database ✅
```

---

## 📞 Quick Links

- **Full Guide**: [DEPLOY_VERCEL_RAILWAY.md](./DEPLOY_VERCEL_RAILWAY.md)
- **General Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Main Docs**: [README.md](./README.md)
- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app

---

## ✨ What You Get

✅ Frontend deployed globally on Vercel CDN (fast anywhere)
✅ Backend auto-scales on Railway (can handle 1000s of users)
✅ PostgreSQL with automated backups (Railway managed)
✅ SSL/HTTPS automatically (both Vercel & Railway)
✅ Production-ready with minimal cost
✅ All 41 departments can connect and work simultaneously
✅ Real-time data sync
✅ Offline fallback still works

---

**Ready to deploy? Start here:** [DEPLOY_VERCEL_RAILWAY.md](./DEPLOY_VERCEL_RAILWAY.md)

**Time to deployment: ~15-20 minutes** ⏱️
