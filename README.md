# JobTrack — Job Application Tracker

A modern, clean, and responsive job application tracker built as a premium single-user SaaS-style workspace. Manage every application, interview, and follow-up from one place — synced with Supabase and accessible anywhere.

![Stack](https://img.shields.io/badge/TanStack_Start-v1-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### Authentication & Security

- **Supabase Authentication**: Secure email & password sign in and sign up.
- **Row-Level Security (RLS)**: Enforced database security ensuring users only view and manage their own applications.

### Dashboard

- KPI cards: **Total**, **Applied**, **In Progress**, **Interview**, **Offer**, **Rejected**
- **Applications by month** bar chart (last 6 months)
- **Status distribution** donut chart
- **Recent applications**, **Upcoming interviews**, and a live **Activity feed**

### Applications

- Rich CRUD for every application (company, title, location, work mode, source, custom `sourceName`, recruiter details, salary, resume, links, notes, priority, rejection date)
- Toggle between **Table view** and **Kanban board**
- **Kanban Column Customization**: Drag-and-drop column reordering, quick shift controls, column visibility toggling, and layout reset
- **Drag-and-drop** application status changes on the Kanban (`@dnd-kit`) with status date prompts
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

### UX Polish

- Fully responsive: desktop, tablet, and mobile (bottom nav on small screens)
- Beautiful empty states
- Confirmation dialogs before deletion
- Toast notifications (`sonner`) for every action
- Smooth animations and loading states
- Accessible components (shadcn/ui + Radix)

---

## 🎨 Design

Minimal light SaaS aesthetic inspired by Linear and Notion, with a matching premium dark mode.

| Token       | Light                        | Dark                   |
| ----------- | ---------------------------- | ---------------------- |
| Background  | `#ffffff`                    | `oklch(0.16 0.02 260)` |
| Primary     | `#3b82f6` (blue-500)         | `oklch(0.7 0.16 256)`  |
| Success     | `#10b981` (emerald-500)      | same                   |
| Destructive | `#ef4444` (red-500)          | same                   |
| Font        | Inter, tabular-nums for KPIs | same                   |

All colors are semantic CSS variables — components never hardcode hex values, so theme swaps are instant.

---

## 🧰 Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) v1 (React 19, SSR)
- **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL Database + Auth + RLS)
- **Build:** Vite 7
- **Routing:** TanStack Router (file-based, type-safe)
- **State:** [Zustand](https://zustand-demo.pmnd.rs/) with Supabase sync & localStorage persistence
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
- A [Supabase](https://supabase.com) project (for cloud database and authentication)

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

### Database Migrations

Apply the migrations in `supabase/migrations/` to your Supabase instance:

```bash
npx supabase db push
```

Alternatively, run the SQL scripts in `supabase/migrations/` inside your **Supabase Dashboard → SQL Editor**.

### Install & Run

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
.
├── supabase/
│   └── migrations/            # PostgreSQL database migration scripts
├── src/
│   ├── routes/                # File-based routes
│   │   ├── __root.tsx         # Root layout, auth listener, head metadata
│   │   ├── index.tsx          # Dashboard
│   │   ├── applications.tsx   # /applications layout
│   │   ├── applications.index.tsx # Table + Kanban
│   │   ├── applications.$id.tsx   # Application details
│   │   ├── calendar.tsx       # Monthly calendar
│   │   ├── analytics.tsx      # Charts & funnel
│   │   └── settings.tsx       # Theme, import/export
│   ├── components/
│   │   ├── apps/              # ApplicationForm, KanbanBoard, StatusBadge, PriorityDot
│   │   ├── auth/              # LoginScreen, AuthGuard
│   │   ├── layout/            # Sidebar, MobileNav
│   │   ├── common/            # PageHeader, EmptyState
│   │   └── ui/                # shadcn primitives
│   ├── integrations/
│   │   └── supabase/          # Supabase client setup & generated types
│   ├── store/
│   │   ├── useApplications.ts # Zustand store + Supabase data operations
│   │   └── useAuth.ts         # Auth state store
│   ├── lib/
│   │   ├── status.ts          # Status enum, labels, groupings
│   │   └── format.ts          # Date/currency helpers
│   └── styles.css             # Tailwind v4 + theme tokens
```

---

## 🗂 Data Model

Each application record:

```ts
type Application = {
  id: string;
  company: string;
  title: string;
  status: Status; // applied → joined (13 states)
  priority: "low" | "medium" | "high";
  workMode: "remote" | "hybrid" | "onsite";
  appliedDate: string;
  source: string;
  sourceName?: string;
  location?: string;
  salary?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  jobUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  resumeUsed?: string;
  interviewDate?: string;
  followUpDate?: string;
  rejectionDate?: string;
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  statusHistory: { status: Status; at: string }[];
  interviews: Interview[];
  activity: ActivityEntry[];
};
```

### Statuses

`applied` · `recruiter_call` · `assessment` · `l1_interview` · `l2_interview` · `l3_interview` · `hr_interview` · `on_hold` · `rejected` · `ghosted` · `position_filled` · `offer` · `joined`

---

## 💾 Data & Security

- **Supabase Cloud Sync & RLS**: Data is stored securely in Supabase PostgreSQL with strict Row Level Security rules, ensuring only the authenticated user can access their data.
- **Local Fallback & Backup**: Supports local data persistence and **Settings → Export JSON** / **Import JSON** for data backups.

---

## 📄 License

MIT — build on it, ship it, own your job search.
