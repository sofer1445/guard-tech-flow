# Guard Tech Flow Frontend

Frontend application for damage/loss reporting workflow.

## Stack

- React + Vite
- Tailwind CSS + Radix UI
- React Router
- React Query
- Axios

## Main Flows

- User submits a report (damage or loss).
- Commander approves or rejects reports assigned to them.
- Admin performs final logistics decision and can manage device categories.

## Pages

- /Home
- /SubmitReport
- /CommanderApprovals
- /AdminDashboard
- /MyReports

## Local Run

From the frontend directory:

```bash
npm install
npm run dev
```

The app uses /api proxy (configured in Vite) to reach the backend.

## Notes

- UI is Hebrew-first and RTL.
- Mock user switching is available in development via MockUserContext.