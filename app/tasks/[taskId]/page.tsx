import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  OverrunForm,
  SessionDoneForm,
  TaskControls,
  TaskForm
} from "@/components/forms";
import { getDashboardData } from "@/lib/data";
import { formatMinutes } from "@/lib/utils";

export default async function TaskDetailPage({
  params
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const dashboard = await getDashboardData();
  const task = dashboard.tasks.find((item) => item.id === taskId);

  if (!task) {
    notFound();
  }

  return (
    <DashboardShell
      heading={task.name}
      subheading="Review the plan for this task, close out sessions, and create a continuation if the work grew beyond the original estimate."
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel planner-paper space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge" style={{ backgroundColor: `${task.category.color}20`, color: task.category.color }}>
              {task.category.name}
            </span>
            <span
              className={`badge ${
                task.status === "AT_RISK"
                  ? "bg-coral/15 text-coral"
                  : task.status === "DONE"
                    ? "bg-teal/15 text-teal"
                    : "bg-ink/10 text-ink"
              }`}
            >
              {task.status.replace("_", " ").toLowerCase()}
            </span>
            {task.createdFromOverrun ? <span className="badge bg-sun/20 text-ink">Continuation task</span> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-ink/10 bg-white/90 p-4">
              <p className="text-sm text-ink/55">Do date</p>
              <p className="mt-1 font-semibold">{format(task.doDate, "PPP")}</p>
            </div>
            <div className="rounded-[1.4rem] border border-ink/10 bg-white/90 p-4">
              <p className="text-sm text-ink/55">Due date</p>
              <p className="mt-1 font-semibold">
                {format(task.dueDate, "PPP")}
                {task.dueTime ? ` at ${task.dueTime}` : ""}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-ink/10 bg-white/90 p-4">
              <p className="text-sm text-ink/55">Estimated work</p>
              <p className="mt-1 font-semibold">{formatMinutes(task.estimatedMinutes)}</p>
            </div>
            <div className="rounded-[1.4rem] border border-ink/10 bg-white/90 p-4">
              <p className="text-sm text-ink/55">Linked parent</p>
              <p className="mt-1 font-semibold">{task.parentTask?.name ?? "None"}</p>
            </div>
          </div>

          <TaskControls taskId={task.id} />
        </div>

        <OverrunForm taskId={task.id} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <TaskForm categories={dashboard.categories} task={task} />
        <div className="panel peach-wash space-y-4">
          <div>
            <p className="section-kicker">Planned Sessions</p>
            <h2 className="panel-title">Scheduled Sessions</h2>
            <p className="mt-1 text-sm text-ink/65">Complete individual work sessions as they happen.</p>
          </div>
          <div className="space-y-4">
            {task.sessions.length ? (
              task.sessions.map((session) => (
                <div className="space-y-3 rounded-[1.4rem] border border-ink/10 bg-white/92 p-4" key={session.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {format(session.startAt, "PPp")} - {format(session.endAt, "p")}
                      </p>
                      <p className="mt-1 text-sm text-ink/60">
                        {session.plannedMinutes} planned minutes • {session.status.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  {session.status === "PLANNED" ? <SessionDoneForm sessionId={session.id} /> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/60">No sessions are currently planned for this task.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel planner-paper space-y-4">
          <div>
            <p className="section-kicker">Linked Work</p>
            <h2 className="panel-title">Continuation Tasks</h2>
            <p className="mt-1 text-sm text-ink/65">Tasks created when actual work exceeded the original estimate.</p>
          </div>
          <div className="space-y-3">
            {task.continuations.length ? (
              task.continuations.map((continuation) => (
                <Link className="sticker-card block" href={`/tasks/${continuation.id}`} key={continuation.id}>
                  <p className="font-medium">{continuation.name}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {formatMinutes(continuation.estimatedMinutes)} • due {format(continuation.dueDate, "PPP")}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-ink/60">No continuation tasks yet.</p>
            )}
          </div>
        </div>

        <div className="panel sage-wash space-y-4">
          <div>
            <p className="section-kicker">Navigation</p>
            <h2 className="panel-title">Navigation</h2>
            <p className="mt-1 text-sm text-ink/65">Return to the full task list and calendar.</p>
          </div>
          <Link className="button-secondary" href="/">
            Back to dashboard
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
