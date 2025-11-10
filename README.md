# 🧩 ConsentVault Core

**Proof of consent, made simple.**

ConsentVault helps companies securely **collect, store, and verify user consent** — in minutes, not months.  
Built to be elegant, minimal, and revenue-ready from day one.

---

## 🚀 What Is ConsentVault?

ConsentVault is a **modern consent management API + dashboard**.  
It lets businesses and creators embed a customizable widget, track consent logs, and export verified proof with one click.

> 💡 Designed for teams that need compliance *without the complexity* — privacy forms, audit trails, or multi-region headaches.

---

## 🧱 Architecture Overview

- **FastAPI backend** for secure consent capture and export  
- **Next.js frontend** for the dashboard and widget generator  
- **PostgreSQL** for storing immutable consent records  
- **Docker Compose** for one-command local setup  
- **Optional Stripe checkout** for instant monetization  

**Simple, transparent, and production-ready.**

```
consentvault/
├── apps/
│   ├── api/ → FastAPI backend
│   └── web/ → Next.js dashboard + widget
├── docker-compose.yml
├── Makefile
└── scripts/ → create_user, smoke_test, validate_imports
```

---

## ✨ Features

✅ **Collect Consent Anywhere**  
Embed a lightweight `<script>` to display a consent prompt on any site or app.

✅ **View & Export Records**  
Simple dashboard for listing, searching, and exporting proof (CSV or PDF).

✅ **Role-based Access**  
Manage users as `Admin`, `Manager`, or `Viewer` per organization.

✅ **Stripe Integration (Optional)**  
Turn on billing with a single product plan using Stripe Checkout.

✅ **Secure by Design**  
JWT auth, hashed passwords, isolated org access — no extra dependencies.

---

## 🧰 Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/yourusername/consentvault.git
cd consentvault
cp .env.example .env
# edit .env with your DATABASE_URL, SECRET_KEY, etc.
```

### 2. Run Locally

```bash
make dev
```

Visit:
- **API** → http://localhost:8000/docs
- **Web** → http://localhost:3000

### 3. Create First User

```bash
make create-user EMAIL=admin@example.com PASSWORD=password123
```

### 4. Test Widget

Embed this snippet in any HTML file:

```html
<script src="http://localhost:8000/widget.js" 
        data-org="ORG_ID" 
        data-purpose="marketing" 
        data-text="I agree to receive updates."></script>
```

---

## 💾 Deployment

ConsentVault runs anywhere with Docker and Postgres.

**Option A — Render.com**
- Deploy API and Web as two services
- Add `DATABASE_URL`, `SECRET_KEY`, `APP_ENV=prod`

**Option B — DigitalOcean App Platform**
- Create a Managed Postgres database
- Deploy directly from GitHub
- Use `docker-compose.yml` or Dockerfiles in `/apps/*`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed steps.

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| Frontend | Next.js 15 + Tailwind |
| Auth | JWT + bcrypt |
| Deployment | Docker Compose / Render / DO |
| Billing | Stripe Checkout (optional) |

---

## 🔐 Core Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/login` | Login, returns JWT |
| POST | `/consents` | Create consent record |
| GET | `/consents` | List consents by org |
| GET | `/consents/export.csv` | Export CSV |
| GET | `/widget.js` | Serve embedded widget |

Full API documentation available at `/docs` when running locally.

---

## 💡 Why It Exists

Most consent platforms are bloated, expensive, and regulation-heavy.

ConsentVault strips it down to what actually matters:

✅ Proof that consent was collected  
✅ Record of what was shown  
✅ Easy export for auditors  

**Nothing else.**

---

## 📈 Roadmap

- [ ] Team onboarding flows
- [ ] Custom widget theming
- [ ] Webhook delivery for consent events
- [ ] Multi-tenant analytics (Pro tier)
- [ ] Region-specific data storage (Enterprise)

---

## 🏁 Version

**Current Release:** `v1.0-core`  
**Tag:** `final: ConsentVault Core architecture complete and validated`

---

## ❤️ Built For

- **SaaS founders** who need privacy trust instantly
- **Agencies** managing client consent compliance
- **Creators** who want to monetize "trust" as part of their brand

---

## 📚 Documentation

- [README_CORE.md](./README_CORE.md) - Technical architecture details
- [CHECKLIST.md](./CHECKLIST.md) - Pre-deployment checklist
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Step-by-step deployment guide
- [FINAL_VALIDATION.md](./FINAL_VALIDATION.md) - Validation and testing

---

## 🤝 Contributing

This is a focused, minimal implementation. For feature requests or issues, please open a GitHub issue.

---

**Ready to deploy?** Start with [DEPLOYMENT.md](./DEPLOYMENT.md) or run `make dev` to see it in action.
