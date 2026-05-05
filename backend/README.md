# RIS Manager Backend

Express.js + PostgreSQL API backend for the RIS Management System.

## Prerequisites

- Node.js 14+
- PostgreSQL 12+

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ris_manager
JWT_SECRET=ris_secret_key_2026
PORT=5000
```

### 3. Create Database

Create a PostgreSQL database named `ris_manager`:

```bash
createdb ris_manager
```

Or via PostgreSQL CLI:
```sql
CREATE DATABASE ris_manager;
```

### 4. Run Migrations

Creates all tables:

```bash
npm run migrate
```

### 5. Seed Database

Populates admin account and 41 departments:

```bash
node db/seed.js
```

### 6. Start Server

Development (with auto-reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

Server runs on `http://localhost:5000`

## API Endpoints

### Auth
- `POST /auth/login` - Login (returns JWT token)
- `POST /auth/logout` - Logout
- `POST /auth/refresh-token` - Refresh expired token

### Users
- `GET /api/users` - List all users (admin only)
- `GET /api/users/me` - Get current user
- `GET /api/users/:id` - Get user by ID

### Requests (RIS)
- `POST /api/requests` - Create new request
- `GET /api/requests` - List requests
- `GET /api/requests/:id` - Get request details
- `PUT /api/requests/:id` - Edit request (admin only)
- `POST /api/requests/:id/approve` - Approve request (admin only)
- `POST /api/requests/:id/reject` - Reject request (admin only)
- `POST /api/requests/:id/mark-released` - Mark released (admin only)
- `POST /api/requests/:id/issued-items` - Record issued items (admin only)

### Inventory
- `GET /api/inventory` - Get stock levels
- `GET /api/inventory/items` - Get inventory with details
- `POST /api/inventory/restock` - Add stock (admin only)
- `GET /api/inventory/history` - Get stock audit trail (admin only)

### Departments
- `GET /api/departments` - List all departments

## Default Credentials

**Admin User:**
- Email: `bryanfortuno@bac.gov`
- Password: `BAC2026`

**Department Users:**
- Email: `{department_name}@bac.gov`
- Password: `{DEPT_ACRONYM}2026` (e.g., `ACC2026` for Accounting Office)

## Database Schema

Tables:
- `users` - User accounts and roles
- `ris_requests` - RIS request records
- `request_items` - Items in each request
- `issued_items` - Items actually issued
- `inventory` - Stock levels
- `stock_history` - Audit trail
- `departments` - Department list

## Deployment

For cloud deployment (Render, Railway, Fly.io), use a managed PostgreSQL database:

1. Create a PostgreSQL database on your cloud provider
2. Copy the connection string to `.env` as `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
3. Run migrations: `npm run migrate`
4. Run seeding: `node db/seed.js`
5. Deploy the backend

See [DEPLOY.md](./DEPLOY.md) for detailed cloud deployment steps.
