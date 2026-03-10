## Integrity Monitor - Realtime File Integrity Dashboard

A modern, real-time dashboard for monitoring file changes (additions, modifications, deletions) using React + TypeScript + Vite, TailwindCSS, and Shadcn-style UI. The app connects to a WebSocket (mocked in development) and updates UI in real-time with toasts, tables, and charts.

### Run locally

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal.

### Where to connect your real backend

- Replace the mock in `src/hooks/useMockWebSocket.ts` with your real WebSocket connection.
- Call `addEvent()` from `useEventsStore` for each incoming event with the shape:

```ts
{
  id: string
  filePath: string
  action: 'added' | 'modified' | 'deleted'
  timestamp: number // Date.now()
  status: 'ok' | 'alert'
}
```

### Theme customization

- Global theme tokens live in `src/styles/theme.css` under `:root` and `.dark`.
- Adjust HSL values to change brand color, backgrounds, and surfaces.
- Tailwind is configured in `tailwind.config.cjs` to read these CSS variables.

### Tech stack

- React + TypeScript + Vite
- TailwindCSS + Lucide icons
- Zustand for state management
- @tanstack/react-query ready for data fetching
- Recharts for visualization
- Radix UI primitives for Toast/Avatar

### Features

- Sidebar + Topbar layout with theme toggle
- Dashboard with KPI cards, realtime events table, and activity chart
- Logs page with pagination and action/date filters
- Settings page for monitored path and realtime toggle
- In-app toasts on each incoming event
