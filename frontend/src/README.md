# Damage Report Management System — Technical Handover Document

> **Version:** 1.1.0 | **Platform:** Base44 (React + Deno backend functions) | **Date:** 2026-03-18

---

## 1. Project Overview

A web-based equipment damage and loss reporting system designed for organizational (military-adjacent) use. The workflow is Hebrew-first, fully RTL, and enforces a multi-stage approval chain:

1. **Employee** submits a report for a damaged or lost device.
2. **Commander** reviews and approves/rejects the report (forwards it to logistics).
3. **Admin (רע"ן / Logistics Manager)** performs the final operational decision — selecting a treatment type and adding administrative notes before final approval or rejection.

All role-based access control is enforced server-side. Submitter identity is always extracted from the authenticated session token, never trusted from the request body.

The system features **role-specific dashboards**: regular users see their personal report history and submission stats; commanders see a shift-scoped view of reports pending their approval; admins see a national-level dashboard with all reports across the organization, CSV export, and full lifecycle control.

---

## 2. Database Schemas

### 2a. `DamageReport` Entity

| Field | Type | Required | Enum Values / Notes |
|---|---|---|---|
| `submitterId` | `string` | ✅ | Extracted server-side from auth token |
| `submitterName` | `string` | ✅ | Extracted server-side from auth token |
| `submitterEmail` | `string` | ✅ | Extracted server-side from auth token |
| `deviceType` | `string` | ✅ | Dynamically validated string (references `DeviceCategory.name`) |
| `deviceId` | `string` | ✅ | Serial number or asset identifier |
| `incidentType` | `string` (enum) | ✅ | `DAMAGE`, `LOSS` |
| `incidentDate` | `string` (date) | ✅ | ISO 8601 date format: `YYYY-MM-DD` |
| `description` | `string` | ✅ | Detailed incident description |
| `photoUrl` | `string` (url) | ❌ | Optional URL to uploaded photo evidence |
| `commanderId` | `string` | ✅ | ID of the assigned approving commander |
| `commanderName` | `string` | ✅ | Display name of the assigned commander |
| `status` | `string` (enum) | ✅ | See status lifecycle below. Default: `PENDING_COMMANDER` |
| `commanderNotes` | `string` | ❌ | Commander's notes at time of approval/rejection |
| `adminNotes` | `string` | ❌ | Logistics manager's notes at final decision |
| `treatmentType` | `string` (enum) | ❌ | `הועבר לתיקון במעבדה`, `הוזמן ציוד חלופי`, `נגרע מהמלאי (השבתה)` |
| `commanderApprovedAt` | `string` (datetime) | ❌ | ISO 8601 timestamp of commander action |
| `adminApprovedAt` | `string` (datetime) | ❌ | ISO 8601 timestamp of admin final decision |
| `priority` | `string` (enum) | ❌ | `LOW`, `MEDIUM` (default), `HIGH` |

> **Built-in Base44 fields (auto-managed, not in schema):** `id`, `created_date`, `updated_date`, `created_by`

### 2b. `DeviceCategory` Entity (NEW)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | ✅ | Device category name (e.g., `מכשיר קשר`, `סלולר`, `טאבלט`, `מחשב נייד`) |

> **Built-in Base44 fields (auto-managed, not in schema):** `id`, `created_date`, `updated_date`, `created_by`

**Purpose:** Replaces hardcoded device type enums. Allows admins to dynamically manage the list of available device categories without code deployments. Seeded with default categories on first `getDeviceCategories` call.

### Status Lifecycle

```
PENDING_COMMANDER  ──(commander/admin approves)──►  PENDING_LOGISTICS
PENDING_COMMANDER  ──(commander/admin rejects)───►  REJECTED
PENDING_LOGISTICS  ──(admin approves + treatmentType)──►  APPROVED
PENDING_LOGISTICS  ──(admin rejects)─────────────►  REJECTED
```

---

## 3. API Contracts

All backend functions are Deno HTTP handlers deployed on Base44. They require a valid authenticated session (Bearer token via SDK). All inputs are validated with Zod — the schema is the single source of truth.

---

### `POST /submitDamageReport`

**Auth:** Required (any authenticated user)

**Zod Schema — Request Body:**

```typescript
{
  deviceType:    string,           // min length 1 — dynamically validated against DeviceCategory.name
  deviceId:      string,           // min length 1
  incidentType:  "DAMAGE" | "LOSS",
  incidentDate:  string,           // ISO date: "YYYY-MM-DD"
  description:   string,           // min length 1
  commanderId:   string,           // min length 1
  commanderName?: string,          // optional
  photoUrl?:     string | null,    // valid URL or null
  priority?:     "LOW" | "MEDIUM" | "HIGH"  // default: "MEDIUM"
}
```

> **Security Note:** `submitterId`, `submitterName`, and `submitterEmail` are **never accepted from the client**. They are always resolved from the authenticated user session server-side.

**Success Response `200`:**
```json
{ "success": true, "reportId": "<uuid>", "message": "הדוח הוגש בהצלחה" }
```

**Error Responses:** `400` (validation), `401` (unauthenticated), `405` (wrong method), `500` (server error)

---

### `POST /approveReport`

**Auth:** Required — role must be `commander` or `admin`

**Zod Schema — Request Body:**

```typescript
{
  reportId:       string,     // min length 1 — the DamageReport entity ID
  approved:       boolean,    // true = approve, false = reject
  notes?:         string,     // commander notes (used in commander flow)
  treatmentType?: string,     // REQUIRED when admin approves a PENDING_LOGISTICS report
  adminNotes?:    string      // admin free-text notes
}
```

**Role-Based Logic:**

| Caller Role | Report Status | `approved=true` → | `approved=false` → |
|---|---|---|---|
| `commander` | `PENDING_COMMANDER` | `PENDING_LOGISTICS` | `REJECTED` |
| `admin` | `PENDING_COMMANDER` | `PENDING_LOGISTICS` | `REJECTED` |
| `admin` | `PENDING_LOGISTICS` | `APPROVED` *(treatmentType required)* | `REJECTED` |

> **Security Notes:**
> - Commander role verifies `report.commanderId === user.id` to prevent IDOR.
> - `treatmentType` is enforced server-side when an admin approves a `PENDING_LOGISTICS` report — the client cannot bypass this check.
> - User role is read from the auth token, never from the request body.

**Success Response `200`:**
```json
{ "success": true, "message": "<Hebrew status message>" }
```

**Error Responses:** `400` (validation / wrong state), `401` (unauthenticated), `403` (wrong role / IDOR attempt), `404` (report not found), `405` (wrong method), `500` (server error)

---

### `GET /getDeviceCategories` (Backend Function)

**Auth:** Required (any authenticated user)

**Purpose:** Fetches the current list of device categories. Returns cached data from `DeviceCategory` entity. If the table is empty on first call, automatically seeds it with default categories.

**Zod Schema — Response `200`:**

```typescript
{
  data: [
    { id: string, name: string, created_date: string, updated_date: string, created_by: string },
    { id: string, name: string, created_date: string, updated_date: string, created_by: string },
    // ... more categories
  ]
}
```

**Default Seed Categories (on first call):**
- `מכשיר קשר`
- `סלולר`
- `טאבלט`
- `מחשב נייד`

**Frontend Optimization:** The `SubmitReport` page caches categories in `localStorage` with a 5-minute TTL. On first render, it loads cached data instantly while fetching fresh data in the background, eliminating form UI freeze.

**Error Responses:** `401` (unauthenticated), `405` (wrong method), `500` (server error)

---

### `POST /addDeviceCategory` (Backend Function)

**Auth:** Required — role must be **`admin`** only

**RBAC Rule:** Only users with `role === 'admin'` can add new device categories. All other roles receive `403 Forbidden`.

**Zod Schema — Request Body:**

```typescript
{
  name: string  // min length 1, trimmed — e.g., "מחשב שולחני"
}
```

**Validation:**
- `name` must be a non-empty trimmed string.
- Duplicate names are prevented — if a category with the same name already exists, returns `400` error.

**Success Response `200`:**
```json
{ "success": true, "message": "סוג מכשיר התווסף בהצלחה" }
```

**Error Responses:** 
- `400` (validation / duplicate name), 
- `401` (unauthenticated), 
- `403` (non-admin user), 
- `405` (wrong method), 
- `500` (server error)

---

### `POST /updateDeviceCategory` (Backend Function)

**Auth:** Required — role must be **`admin`** only

**RBAC Rule:** Only admins can modify existing categories. Non-admin users receive `403 Forbidden`.

**Zod Schema — Request Body:**

```typescript
{
  categoryId: string,  // min length 1 — the DeviceCategory entity ID to update
  name:      string   // min length 1, trimmed — the new category name
}
```

**Validation:**
- `name` must be a non-empty trimmed string.
- Duplicate names are prevented across categories (excluding the current category being edited).

**Success Response `200`:**
```json
{ "data": { id: string, name: string, created_date: string, updated_date: string, created_by: string }, "message": "קטגוריה עודכנה בהצלחה" }
```

**Error Responses:** 
- `400` (validation / duplicate name), 
- `401` (unauthenticated), 
- `403` (non-admin user), 
- `405` (wrong method), 
- `500` (server error)

---

### `POST /deleteDeviceCategory` (Backend Function)

**Auth:** Required — role must be **`admin`** only

**RBAC Rule:** Only admins can delete categories. Non-admin users receive `403 Forbidden`.

**Zod Schema — Request Body:**

```typescript
{
  categoryId: string  // min length 1 — the DeviceCategory entity ID to delete
}
```

**Data Integrity Check (before deletion):**
Before deleting the category, the server queries all `DamageReport` records and checks whether any report's `deviceType` matches the category's `name`. If one or more linked reports exist, the deletion is **blocked** and the endpoint returns:

**`409 Conflict`:**
```json
{ "error": "לא ניתן למחוק קטגוריה זו כי קיימים דוחות המשויכים אליה" }
```

**Success Response `200`:**
```json
{ "success": true, "message": "קטגוריה נמחקה בהצלחה" }
```

**Error Responses:** 
- `400` (validation), 
- `401` (unauthenticated), 
- `403` (non-admin user), 
- `405` (wrong method), 
- `409` (linked DamageReport records exist — deletion blocked),
- `500` (server error)

---

## 4. Environment Setup

### Platform
This application runs entirely on **Base44** — no separate server setup is required. Backend functions run as Deno Deploy serverless handlers. The database is managed by the Base44 entities layer.

### Environment Variables
No custom environment variables are required. The following are injected automatically by the Base44 platform:

| Variable | Source | Purpose |
|---|---|---|
| `BASE44_APP_ID` | Auto-injected by platform | Identifies the app in SDK calls |
| Auth session token | SDK `createClientFromRequest(req)` | Authenticates all backend function calls |

> There are no third-party API keys or secrets currently in use.

### User Roles
The system uses Base44's built-in `User` entity with the following role values:

| Role | Hebrew Label | Access Level |
|---|---|---|
| `user` | עובד | Can submit damage reports |
| `commander` | מפקד | Can approve/reject reports assigned to them |
| `admin` | רע"ן / מנהל לוגיסטיקה | Full access — final approval, admin dashboard, CSV export |

### `MockUserContext` (Development Only)

Located at `components/MockUserContext.jsx`. Used exclusively in development to simulate different user roles without requiring multiple accounts.

| Mock User Key | Mock Role | Purpose |
|---|---|---|
| `USER` | `user` | Test report submission flow |
| `COMMANDER` | `commander` | Test commander approval flow |
| `ADMIN` | `admin` | Test admin dashboard and final approval |

**The `MockUserProvider` wraps the entire app in `App.jsx`.** In production, the active mock user defaults to `null` and has no effect on the real auth flow — real user identity is always resolved via `base44.auth.me()` in backend functions.

---

## 5. Page & Component Map

| Path | Role Access | Description |
|---|---|---|
| `/Home` | All | Landing dashboard with stats and role-based navigation |
| `/SubmitReport` | `user`, `admin` | Form to submit a new damage/loss report |
| `/CommanderApprovals` | `commander`, `admin` | Table of pending reports for commander review |
| `/AdminDashboard` | `admin` | Full report management dashboard with CSV export |

### Key Components

| Component | Description |
|---|---|
| `components/AdminReportModal` | Modal for admin to review, approve/reject a report and set `treatmentType` |
| `components/EditReportModal` | **Full-screen overlay** for users to edit a pending report; matches `SubmitReport` screen dimensions for a consistent editing experience |
| `components/SystemSettingsModal` | Admin-only modal (opened via "הגדרות מערכת" button in `AdminDashboard`) for managing `DeviceCategory` records — supports create, rename, and delete with referential integrity enforcement |
| `components/MockUserContext` | Dev-only context for simulating user roles |
| `components/MockUserInjector` | Hook that formats mock user data for backend calls in dev |
| `components/PendingApprovalsCard` | Reusable navigation card for dashboard quick-links |

---

## 6. CSV Export

Available on the Admin Dashboard. Exports the **currently filtered** report list.

- **File name:** `damage_reports.csv`
- **Encoding:** UTF-8 with BOM (`\uFEFF`) — required for correct Hebrew rendering in Microsoft Excel
- **Hebrew Column Headers:** `שם מדווח`, `סוג מכשיר`, `מזהה מכשיר`, `סוג אירוע`, `תאריך אירוע`, `סטטוס`, `אופן טיפול`, `הערות`
- **Trigger:** "ייצוא לאקסל" button (outline style) next to the status filter on the Admin Dashboard