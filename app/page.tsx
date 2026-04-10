import { format } from "date-fns";
import { manualRescheduleAction } from "@/app/actions";
import { CalendarBoard } from "@/components/calendar-board";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  BlockedTimeForm,
  BlockedTimeList,
  SettingsForm,
  TaskForm,
  TaskSummaryCard
} from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { getDashboardData } from "@/lib/data";
import { formatMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Page() {
  const dashboard = await getDashboardData();
  const plannedSessions = dashboard.tasks.flatMap((task) =>
    task.sessions.filter((session) => session.status === "PLANNED")
  );
  const today = new Date();
  const todaysSessions = plannedSessions.filter(
    (session) => session.startAt.toDateString() === today.toDateString()
  );
  const atRiskCount = dashboard.tasks.filter((task) => task.status === "AT_RISK").length;
  const totalPlannedMinutes = plannedSessions.reduce(
    (sum, session) => sum + session.plannedMinutes,
    0
  );
  const calendarItems = [
    ...dashboard.tasks.flatMap((task) =>
      task.sessions
        .filter((session) => session.status === "PLANNED")
        .map((session) => ({
          id: session.id,
          title: task.name,
          startAt: session.startAt,
          endAt: session.endAt,
          kind: "task" as const,
          color: task.category.color,
          meta: `${task.category.name} • ${session.plannedMinutes}m`
        }))
    ),
    ...dashboard.blockedTimes.map((blockedTime) => ({
      id: blockedTime.id,
      title: blockedTime.label || "Unavailable",
      startAt: blockedTime.startAt,
      endAt: blockedTime.endAt,
      kind: "blocked" as const,
      color: "#e76f51",
      meta: "Blocked time"
    }))
  ];
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const upcomingScheduledItem = [...calendarItems]
    .filter((item) => item.kind === "task" && item.startAt >= startOfToday)
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())[0];
  const fallbackAnchorDate =
    upcomingScheduledItem?.startAt ??
    [...dashboard.tasks]
      .filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED")
      .sort((left, right) => left.doDate.getTime() - right.doDate.getTime())[0]?.doDate ??
    [...calendarItems].sort((left, right) => left.startAt.getTime() - right.startAt.getTime())[0]?.startAt ??
    today;
  const unscheduledTasks = dashboard.tasks.filter(
    (task) => task.status === "AT_RISK" && task.sessions.filter((session) => session.status === "PLANNED").length === 0
  );

  return (
    <DashboardShell
      heading="FlexPlan"
      subheading="Adaptive scheduling for real life."
    >
      <section className="spread-grid">
        <aside className="planner-column planner-column-left planner-side">
          <p className="planner-page-label">Planner tools</p>
          <div className="panel planner-paper space-y-4">
            <div>
              <p className="section-kicker">Start Here</p>
              <h2 className="panel-title">How to use FlexPlan</h2>
              <p className="mt-1 text-sm text-ink/65">
                Set your working hours, add a task, then let the planner place work on the calendar.
              </p>
            </div>
            <div className="space-y-3 text-sm text-ink/70">
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">1. Set your work window</p>
                <p className="mt-1">Choose the days and hours when FlexPlan is allowed to schedule.</p>
              </div>
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">2. Add tasks</p>
                <p className="mt-1">
                  Fill in the task form on the right. You can pick an existing category or type your own.
                </p>
              </div>
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">3. Remove sample items</p>
                <p className="mt-1">Use the Archive button on a task card if you want to clear out the sample tasks.</p>
              </div>
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">4. Review the schedule</p>
                <p className="mt-1">Use the calendar on the right to see what is planned today and across the week.</p>
              </div>
            </div>
          </div>

          <SettingsForm user={dashboard} />
          <BlockedTimeForm />

          <div className="space-y-4">
            <div>
              <p className="section-kicker">Sticker Stack</p>
              <h2
                className="text-2xl tracking-tight text-[#54483f]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Task List
              </h2>
              <p className="mt-1 text-sm text-ink/65">
                Open any task to inspect sessions, mark completion, or report an overrun.
              </p>
            </div>
            <div className="space-y-4">
              {dashboard.tasks.length ? (
                dashboard.tasks.map((task) => <TaskSummaryCard key={task.id} task={task} />)
              ) : (
                <div className="panel text-sm text-ink/60">No tasks yet. Start with the task intake form on the right page.</div>
              )}
            </div>
          </div>
        </aside>

        <section className="planner-column planner-main">
          <p className="planner-page-label">Schedule page</p>
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-kicker">This Week</p>
                <h2
                  className="text-4xl tracking-tight text-[#54483f] md:text-5xl"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  Schedule spread
                </h2>
                <p className="mt-3 max-w-2xl text-base text-ink/65">
                  Your calendar is the main page of the planner. Tasks, conflicts, and changes all flow back here.
                </p>
              </div>
              <form action={manualRescheduleAction}>
                <SubmitButton className="button-primary" pendingLabel="Rebuilding...">
                  Rebuild everything
                </SubmitButton>
              </form>
            </div>

            <TaskForm categories={dashboard.categories} />

            <div className="summary-strip">
              <div className="hero-summary">
                <p className="section-kicker">Today</p>
                <h3
                  className="mt-1 text-3xl tracking-tight text-[#54483f]"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {todaysSessions.length ? `${todaysSessions.length} session(s) planned` : "Nothing scheduled today"}
                </h3>
                <p className="mt-3 text-sm text-ink/65">
                  {todaysSessions.length
                    ? `${formatMinutes(todaysSessions.reduce((sum, session) => sum + session.plannedMinutes, 0))} planned for today.`
                    : "Add a task or rebuild the schedule to fill today's page."}
                </p>
              </div>

              <div className="summary-card">
                <p className="section-kicker">Schedule Pulse</p>
                <div className="mt-2 space-y-2 text-sm text-ink/68">
                  <p>{plannedSessions.length} total planned session(s)</p>
                  <p>{formatMinutes(totalPlannedMinutes)} scheduled this week view</p>
                  <p>{atRiskCount} at-risk task(s)</p>
                  <p>
                    {dashboard.scheduleRuns[0]
                      ? `Last run ${format(dashboard.scheduleRuns[0].startedAt, "PPp")}`
                      : "No scheduler activity yet"}
                  </p>
                </div>
              </div>
            </div>

            <CalendarBoard anchorDate={fallbackAnchorDate} items={calendarItems} />

            {unscheduledTasks.length ? (
              <div className="panel rose-wash space-y-4">
                <div>
                  <p className="section-kicker">Needs Attention</p>
                  <h2 className="panel-title">Tasks not placed on the calendar yet</h2>
                  <p className="mt-1 text-sm text-ink/65">
                    These tasks exist, but FlexPlan could not place them inside the current available work window.
                  </p>
                </div>
                <div className="space-y-3">
                  {unscheduledTasks.map((task) => (
                    <div className="rounded-[1.4rem] border border-ink/10 bg-white/92 p-4" key={task.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#54483f]">{task.name}</p>
                          <p className="mt-1 text-sm text-ink/65">
                            Do date {format(task.doDate, "PP")} - due {format(task.dueDate, "PP")}
                            {task.dueTime ? ` at ${task.dueTime}` : ""}
                          </p>
                        </div>
                        <span className="badge bg-coral/15 text-coral">At risk</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <BlockedTimeList items={dashboard.blockedTimes} />
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}
