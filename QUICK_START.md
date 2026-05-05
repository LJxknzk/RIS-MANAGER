# Quick Start Guide - RIS Manager

Choose your starting point below:

---

## 🚀 SIMPLEST: Railway-Only (15 minutes) ⭐ RECOMMENDED

**Best for**: One platform, simple deployment

Follow: [RAILWAY_ONLY_DEPLOYMENT.md](./RAILWAY_ONLY_DEPLOYMENT.md)

✅ Frontend + Backend + Database on Railway
✅ Single URL for all departments
✅ Simplest setup
✅ Free tier available ($0-5/month)

---

## ⚡ ALTERNATIVE: Vercel + Railway (FASTEST)

**Best for**: Testing the UI without a backend

```bash
npm install
npm start
```

Default login:
- Email: `bryanfortuno@bac.gov`
- Password: `BAC2026`

✅ Works immediately · ❌ No backend · ❌ Data lost on app restart

---

## 🏠 Option 2: Run with Local Backend (10 minutes)

**Best for**: Full testing before cloud deployment

### Step 1: Install PostgreSQL
- **Windows**: https://www.postgresql.org/download/windows/
- **macOS**: `brew install postgresql && brew services start postgresql`
- **Linux**: `sudo apt-get install postgresql && sudo systemctl start postgresql`

### Step 2: Create Database
```bash
psql -U postgres
CREATE DATABASE ris_manager;
\q
```

### Step 3: Start Backend (Terminal 1)
```bash
cd backend
npm install
cp .env.example .env
npm run migrate
node db/seed.js
npm run dev
```

Wait for: `Server running on http://localhost:5000`

### Step 4: Start App (Terminal 2)
```bash
npm install
npm start
```

When prompted for API URL: `http://localhost:5000`

✅ Full system · ✅ Data persists · ✅ Offline fallback

---

## ☁️ Option 3: Deploy to Cloud (30 minutes)

**Best for**: Production use by multiple departments

### Quick Path: Render.com

1. **Sign up** at https://render.com (free tier available)

2. **Create PostgreSQL database**
   - Dashboard → New → PostgreSQL
   - Copy connection string

3. **Deploy backend**
   - Connect your GitHub repo
   - Build: `npm install && cd backend && npm install`
   - Start: `npm start`
   - Add environment variables (see `backend/.env.example`)

4. **Get backend URL**
   - Example: `https://ris-backend-xyz.onrender.com`

5. **Build Electron app**
   ```bash
   npm run build
   ```

6. **Share with users**
   - Windows: `dist/RIS Manager.exe`
   - macOS: `dist/RIS Manager.dmg`
   - Linux: `dist/RIS Manager.AppImage`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed steps

✅ Production ready · ✅ Multi-device · ✅ 99.9% uptime

---

## 🔑 Default Accounts

### Admin
```
Email: bryanfortuno@bac.gov
Password: BAC2026
```

### Sample Department Accounts
```
ACCOUNTING OFFICE
Email: accounting_office@bac.gov
Password: ACC2026

ENGINEERING OFFICE
Email: engineering_office@bac.gov
Password: ENG2026

(41 departments total - use same pattern for others)
```

---

## 📱 User Workflows

### Admin (After Login)

1. **Dashboard** → View statistics
2. **RIS Requests** → Review pending requests
3. **Approve Request** → Auto-assigns RIS number
4. **RIS Documents** → Print issued documents
5. **Inventory Report** → Export to Excel
6. **Stock Management** → Restock items

### Department User (After Login)

1. **New Request** → Select items & quantities
2. **Submit** → Fill requester/approver info
3. **Track Status** → View pending/approved/released
4. **My Requests** → History of all submissions

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| App won't start | Run `npm install` again |
| "Cannot find module" | Run `npm install` in root + `backend/` directories |
| "DB connection failed" | Check PostgreSQL is running: `psql -U postgres` |
| "Port 5000 in use" | Kill process: `netstat -ano \| findstr :5000` (Windows) |
| "API connection refused" | Verify backend is running: `curl http://localhost:5000/health` |
| "Invalid credentials" | Re-check email/password exactly (case-sensitive) |

---

## 📞 Need Help?

1. **Local setup issues** → See `backend/README.md`
2. **Cloud deployment** → See `DEPLOYMENT.md`
3. **API reference** → See `README.md` → API Endpoints section
4. **Full details** → See `IMPLEMENTATION_SUMMARY.md`

---

## 🚀 What's New?

✅ **Backend API** - Express.js server
✅ **PostgreSQL** - Permanent database
✅ **JWT Auth** - Secure token-based login
✅ **Offline Fallback** - Works without internet
✅ **Encrypted Storage** - Tokens stored securely in Electron
✅ **Multi-Device** - Login from multiple computers
✅ **Cloud Ready** - Deploy anywhere (Render/Railway/Fly.io)

---

**Version**: 2.0 (API-enabled)
**Last Updated**: May 5, 2026
