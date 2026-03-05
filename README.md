# Degree Programme Pathways

Generic web app for understanding degree programme pathways: prerequisite chains, skills, and module choices. For any university.

## Structure

- **`api/`** — Node.js + Express + Prisma (SQLite dev). Auth (JWT), CRUD for universities/programmes/catalogues/modules/skills, import endpoint, pathway and graph APIs.
- **`web/`** — (Planned) Angular frontend: graph view, filters, pathway explorer.
- **`poc/`** — Original proof-of-concept (static JSON + simple UI). Kept for reference.

## Quick start (API)

1. **Install and DB**
   ```bash
   cd degree-pathways/api
   npm install
   ```
   Ensure `api/.env` has:
   - `DATABASE_URL="file:./dev.db"`
   - `JWT_SECRET="your-secret"`

2. **Migrations** (if needed)
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Seed sample data**
   ```bash
   npm run seed
   ```

4. **Run API**
   ```bash
   npm run dev
   ```
   API: `http://localhost:4000`

## API overview

- **Auth:** `POST /auth/register`, `POST /auth/login` (returns JWT).
- **Read:** `GET /universities`, `GET /programmes`, `GET /catalogues`, `GET /modules`, `GET /skills`, `GET /graph`, `GET /pathways/from-module/:id`.
- **Import (CURATOR/ADMIN):** `POST /import/catalogue` — body: `{ university, programme, catalogue, skills?, modules[] }`. Use `Authorization: Bearer <token>`.

## Switching to PostgreSQL

1. In `api/prisma/schema.prisma` set `provider = "postgresql"` and `url = env("DATABASE_URL")`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `npx prisma migrate dev` (new migrations).
4. Optional: use `degree-pathways/docker-compose.yml` to run Postgres locally.

## Reference

Project reference: **103895** — Interface for understanding degree programme pathways (Part A → final year, skills, stakeholders: prospective students, employers, current students).
