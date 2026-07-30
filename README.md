# JobTrack — Job Application Tracker

A modern, clean, and responsive job application tracker built as a premium single-user SaaS-style workspace. Manage every application, interview, and follow-up from one place — locally on your device, with zero setup and no account required.

![Stack](https://img.shields.io/badge/TanStack_Start-v1-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### Dashboard
- KPI cards: **Total**, **Applied**, **In Progress**, **Interview**, **Offer**, **Rejected**
- **Applications by month** bar chart (last 6 months)
- **Status distribution** donut chart
- **Recent applications**, **Upcoming interviews**, and a live **Activity feed**

### Applications
- Rich CRUD for every application (company, role, location, work mode, source, recruiter, salary, resume, links, notes, priority)
- Toggle between **Table view** and **Kanban board**
- **Drag-and-drop** status changes on the Kanban (`@dnd-kit`)
- Filter, sort, search, and archive
- Per-application detail page with tabs: **Timeline · Interviews · Status history · Notes**

### Calendar
- Monthly grid showing interview dates and follow-ups
- Click a day to jump straight to the application

### Analytics
- Conversion funnel (Applied → Interview → Offer)
- Response rate, interview rate, offer rate
- Source performance and time-to-response insights

### Settings
- **Light / Dark theme** toggle (persists across reloads)
- **Export** all data as JSON
- **Import** JSON to restore a backup
- **Clear all** with confirmation

### UX polish
- Fully responsive: desktop, tablet, and mobile (bottom nav on small screens)
- Beautiful empty states
- Confirmation dialogs before deletion
- Toast notifications (`sonner`) for every action
- Smooth animations and loading states
- Accessible components (shadcn/ui + Radix)

---

## 🎨 Design

Minimal light SaaS aesthetic inspired by Linear and Notion, with a matching premium dark mode.

| Token       | Light                        | Dark                            |
| ----------- | ---------------------------- | ------------------------------- |
| Background  | `#ffffff`                    | `oklch(0.16 0.02 260)`          |
| Primary     | `#3b82f6` (blue-500)         | `oklch(0.7 0.16 256)`           |
| Success     | `#10b981` (emerald-500)      | same                            |
| Destructive | `#ef4444` (red-500)          | same                            |
| Font        | Inter, tabular-nums for KPIs | same                            |

All colors are semantic CSS variables — components never hardcode hex values, so theme swaps are instant.

---

## 🧰 Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) v1 (React 19, SSR)
- **Build:** Vite 7
- **Routing:** TanStack Router (file-based, type-safe)
- **State:** [Zustand](https://zustand-demo.pmnd.rs/) + `persist` middleware (localStorage key: `jat.v1`)
- **UI:** [shadcn/ui](https://ui.shadcn.com/) + Radix primitives
- **Styling:** Tailwind CSS v4 (native `@import`, oklch color tokens)
- **Charts:** Recharts
- **Drag & drop:** `@dnd-kit`
- **Dates:** `date-fns`
- **Toasts:** `sonner`
- **Icons:** `lucide-react`

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.1 (or Node.js ≥ 20 with npm/pnpm)

### Install & run

```bash
bun install
bun run dev
```

Open [http://localhost:8080](http://localhost:8080).

### Build

```bash
bun run build
bun run start
```

---

## 📁 Project Structure

```
src/
├── routes/                    # File-based routes
│   ├── __root.tsx             # Root layout, providers, head metadata
│   ├── index.tsx              # Dashboard
│   ├── applications.tsx       # /applications layout
│   ├── applications.index.tsx # Table + Kanban
│   ├── applications.$id.tsx   # Application details
│   ├── calendar.tsx           # Monthly calendar
│   ├── analytics.tsx          # Charts & funnel
│   └── settings.tsx           # Theme, import/export
├── components/
│   ├── apps/                  # ApplicationForm, KanbanBoard, StatusBadge, PriorityDot
│   ├── layout/                # Sidebar, MobileNav
│   ├── common/                # PageHeader, EmptyState
│   └── ui/                    # shadcn primitives
├── store/
│   └── useApplications.ts     # Zustand store + seed data
├── lib/
│   ├── status.ts              # Status enum, labels, groupings
│   └── format.ts              # Date/currency helpers
└── styles.css                 # Tailwind v4 + theme tokens
```

---

## 🗂 Data Model

Applications are persisted locally as JSON. Each application:

```ts
type Application = {
  id: string;
  company: string;
  title: string;
  status: Status;               // wishlist → joined (10 states)
  priority: "low" | "medium" | "high";
  workMode: "remote" | "hybrid" | "onsite";
  appliedDate: string;
  source: string;
  location?: string;
  salary?: string;
  recruiterName?: string; recruiterEmail?: string;
  jobUrl?: string; portfolioUrl?: string; githubUrl?: string; linkedinUrl?: string;
  resumeUsed?: string;
  interviewDate?: string; followUpDate?: string;
  notes?: string;
  archived: boolean;
  createdAt: string; updatedAt: string;
  statusHistory: { status: Status; at: string }[];
  interviews: Interview[];
  activity: ActivityEntry[];
};
```

### Statuses
`wishlist` · `ready_to_apply` · `applied` · `recruiter_call` · `assessment` · `technical_interview` · `hr_interview` · `final_interview` · `offer` · `joined` · `rejected` · `ghosted`

---

## 💾 Data & Privacy

- **100% local.** All data lives in your browser's `localStorage` under the key `jat.v1`.
- No account, no server, no telemetry, no cloud sync.
- Use **Settings → Export JSON** for backups, or move between browsers.

---

## 🌗 Themes

Toggle from **Settings → Appearance**. The choice persists across reloads and hot-reload cycles. Both themes ship with matching chart colors, borders, and elevation.

---

## 🛣 Roadmap

- [ ] Cloud sync (optional, opt-in) via Lovable Cloud
- [ ] Email/desktop reminders for follow-ups and interviews
- [ ] Resume file uploads
- [ ] CSV import
- [ ] Public read-only share links for offer negotiations

---

## 📄 License

MIT — build on it, ship it, own your job search.
