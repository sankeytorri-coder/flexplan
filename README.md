# Scheduler MVP

This project is a planner-style scheduler app built with Next.js, Prisma, and TypeScript.

The key idea is simple:
- `Do date` = when the user wants or plans to work on a task
- `Due date` = when the task must be finished

The app never asks the user to rank tasks by priority.

## Quick Start

1. Install dependencies:
   `npm install`
2. Create a `.env` file and add your database URL:
   `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scheduler"`
3. Create the database tables:
   `npx prisma migrate dev --name init`
4. Add demo data:
   `npx prisma db seed`
5. Start the app:
   `npm run dev`
6. Open:
   `http://localhost:3000`

## Simple File Guide

### App pages

- `app/page.tsx`
  This is the main planner page. It shows settings, task entry, blocked time entry, the calendar board, and the task list.

- `app/tasks/[taskId]/page.tsx`
  This is the task detail page. It shows one task, its sessions, continuation tasks, and the overrun form.

- `app/actions.ts`
  These are the server actions used by the forms. They save tasks, save blocked time, mark sessions done, create continuation tasks, and trigger rescheduling.

### Components

- `components/dashboard-shell.tsx`
  The outer page layout and top header.

- `components/forms.tsx`
  The main form components for settings, task entry, blocked time, session completion, and overrun reporting.

- `components/calendar-board.tsx`
  The weekly planner-style calendar view.

### Scheduling logic

- `lib/scheduler.ts`
  This is the main scheduling engine. It decides where sessions go on the calendar.

- `lib/time.ts`
  Helper functions for working with dates, deadlines, and work-day time windows.

- `lib/data.ts`
  Connects the scheduling engine to the database. When something changes, this file re-runs scheduling and saves the new planned sessions.

- `lib/types.ts`
  Shared scheduler types.

### Database

- `prisma/schema.prisma`
  The Prisma database schema for users, categories, tasks, sessions, blocked time, and schedule runs.

- `prisma/seed.ts`
  Demo data used to populate the app after setup.

### Tests

- `tests/scheduler.test.ts`
  Basic tests for the scheduling engine.

## How the Scheduling Logic Works

Here is the simple version of the scheduler:

1. The app reads the user’s working days and working hours.
2. It reads all active tasks, blocked time, and existing completed sessions.
3. It sorts tasks by nearest deadline.
4. For each task, it treats the `do date` as the preferred day to place work.
5. It looks for open time between the `do date` and the `due date`.
6. It avoids:
   existing planned work,
   completed historical sessions,
   blocked time like meetings or appointments.
7. If needed, it splits one task into multiple work sessions.
8. If all required time fits, the task is marked as scheduled.
9. If some time does not fit before the deadline, the task is still placed as best as possible and marked `at risk`.

## How Rescheduling Works

The app reschedules when:
- a new task is created
- a task is edited
- blocked time is added, changed, or deleted
- settings change
- the user manually presses rebuild schedule
- an overrun creates a continuation task

When rescheduling happens:
1. old planned sessions are cleared
2. completed sessions stay in history
3. the scheduler recalculates future planned sessions
4. task statuses are updated to `scheduled` or `at risk`

## How Overruns Work

If a task took longer than expected:
1. the user opens the task
2. the user reports extra hours or minutes
3. the app creates a linked continuation task
4. the continuation task keeps the same category
5. the continuation task inherits the original due date by default
6. the calendar is rebuilt

This keeps the original task history intact instead of changing past estimates.

## Design Direction

The UI is styled to feel like a digital daily planner:
- soft paper colors
- rounded task cards like stickers
- category-based color accents
- clean layout with a planner-page feeling instead of a corporate dashboard

## Important Notes

- This workspace did not have `node` or `npm` available in the shell used for implementation, so the code was written but not executed here.
- After Node is installed, run the setup steps above and then test with:
  `npm test`
