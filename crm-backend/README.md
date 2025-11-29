# crm-backend
# 🚀 CRM Backend (Node.js + Express + TypeScript + Prisma)

This is the backend API for the Multi-Tenant CRM Platform.  
It provides authentication, company (tenant) isolation, customer management, jobs/dispatch system, invoicing, and communication integrations (Twilio SMS/WhatsApp).

---

## ✨ Tech Stack

- **Node.js (Express)**
- **TypeScript**
- **PostgreSQL (Cloud SQL / local)**
- **Prisma ORM**
- **JWT Authentication**
- **Multi-Tenant Middleware**
- **Docker + Google Cloud Run**
- **Socket.IO (Real-time updates)**

---

## 📁 Folder Structure
src/
├─ app.ts              # Express app configuration
├─ server.ts           # App entry point
├─ config/             # Env + database config
├─ middleware/         # Auth, tenant isolation, errors
├─ modules/            # Feature modules (users, jobs, customers…)
├─ prisma/             # Prisma schema + migration files
├─ utils/              # Shared helpers
└─ types/              # TypeScript interfaces
---

## 🔧 Environment Variables (`.env`)

Create a `.env` file at the root:
PORT=8080

DATABASE_URL=“postgresql://USER:PASSWORD@localhost:5432/crm”
JWT_SECRET=“replace_with_strong_secret”

Optional integrations

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
WHATSAPP_API_TOKEN=

---

## 🛠 Installation

### 1. Install dependencies
npm install
### 2. Initialize Prisma
npx prisma init
### 3. Push schema to DB
npx prisma migrate dev –name init
### 4. Start development server
npm run dev

---

## 🧪 Recommended NPM Scripts

Add to `package.json`:

```json
"scripts": {
  "dev": "nodemon src/server.ts",
  "build": "tsc",
  "start": "node build/server.js",
  "prisma:migrate": "npx prisma migrate dev",
  "prisma:studio": "npx prisma studio"
}



🚀 Deployment (Google Cloud Run)
	1.	Build Docker image
	2.	Push to Google Artifact Registry
	3.	Deploy to Cloud Run
	4.	Connect domain api.moriel.work
	5.	Configure HTTPS + env variables

(Full Cloud Run deployment guide can be added on request.)


---


📌 Features (Current + Planned)
Module
Status
Auth (JWT) ✔
Companies (tenants) ✔
Users & roles ✔
Customers ⏳
Jobs / Dispatch ⏳
Calendar + map routing ⏳
Invoices & payments ⏳
SMS & WhatsApp ⏳
Reporting dashboards ⏳


📄 License
MIT License
© 2025 Moriel
