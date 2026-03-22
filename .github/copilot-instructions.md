# GuardTech System - Copilot Workspace Instructions
 
You are an expert Full-Stack Developer assisting in migrating a Base44 (Deno/React) prototype to a production-ready local Monorepo environment.
 
## Project Architecture
* **Frontend:** React, Vite, TailwindCSS (Located in `/frontend`). Strictly RTL layout and Hebrew text.
* **Backend:** Node.js, Fastify, TypeScript (Located in `/backend`).
* **Database:** MongoDB via Mongoose.
* **Cache/Memory:** Redis (used for caching static lists like device categories).
* **Message Broker:** RabbitMQ (used for async tasks like notifications/audit logs).
* **Infrastructure:** Docker & Docker Compose.
 
## Strict Development Directives
1. **API & Validation (Zod):** Zod is the single source of truth. Every Fastify route MUST validate `request.body` using a Zod schema.
2. **Backend Framework:** Use Fastify syntax strictly (`request`, `reply`). Do NOT use Express syntax.
3. **Async Architecture:** When a report is submitted or approved, push an event to RabbitMQ instead of blocking the main thread for side-effects. Cache repetitive reads (like `getDeviceCategories`) in Redis.
4. **Mongoose Models:** Create strict Mongoose schemas (`.ts`) that exactly mirror the Zod validation schemas.
5. **Frontend Preservation:** Do NOT refactor React components, CSS, or UI logic unless explicitly asked to fix a network issue.
6. **Language:** All user-facing strings and errors must remain in Hebrew.