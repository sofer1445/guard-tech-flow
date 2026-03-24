# Guard Tech Flow

Production-oriented monorepo for a military equipment damage/loss reporting flow.

## What This App Does

Guard Tech Flow manages the full lifecycle of equipment incident reports:

- Soldiers submit a report (damage or loss), with optional image upload.
- Commander reviews and approves/rejects.
- Logistics admin performs final approval and treatment decision.
- Status transitions are tracked end-to-end.

## Tech Stack

- Frontend: React, Vite, TailwindCSS (RTL-first UI)
- Backend: Node.js, Fastify, TypeScript, Zod
- Database: MongoDB (Mongoose)
- Cache: Redis
- Async messaging: RabbitMQ
- Object storage: MinIO (image uploads)
- Infra: Docker Compose

## Repository Structure

```text
.
├── backend/          # Fastify + TypeScript API
├── frontend/         # React + Vite UI
├── guardTechFlow/    # Legacy Base44 archive code
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Docker + Docker Compose
- Node.js 20+
- npm 10+

## Environment Variables

Copy examples before running locally:

- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env`

Key backend variables:

- `MONGO_URI`
- `REDIS_URI`
- `RABBITMQ_URI`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `UPLOAD_MAX_FILE_SIZE_MB`
- `UPLOAD_CLEANUP_ENABLED`
- `UPLOAD_CLEANUP_INTERVAL_MINUTES`
- `UPLOAD_ORPHAN_GRACE_HOURS`
- `UPLOAD_MAX_UNREFERENCED_AGE_DAYS`

## Run The Stack

1. Start infrastructure services:

```bash
docker compose up -d mongodb redis rabbitmq minio
```

2. Install dependencies:

```bash
npm --prefix backend install
npm --prefix frontend install
```

3. Run backend and frontend (separate terminals):

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

## Core API Endpoints

- `GET /api/health` health status for MongoDB/Redis/RabbitMQ
- `GET /api/categories` list device categories (cached in Redis)
- `POST /api/reports` submit damage/loss report
- `PATCH /api/reports/:id/commander-approval` commander decision
- `PATCH /api/reports/:id/admin-approval` logistics decision
- `POST /api/upload` image upload to MinIO
- `GET /api/upload/:filename` image proxy stream (same-origin)
- `DELETE /api/upload/:filename` uploaded image removal

## Image Upload Guardrails

- Global upload file-size limit enforced by Fastify multipart.
- Allowed formats: JPG, PNG, WEBP.
- Automatic cleanup scheduler removes unreferenced files from MinIO based on configured TTL windows.

## Notes

- User-facing app strings are Hebrew.
- Legacy Base44 code remains in `guardTechFlow/` for reference only.
