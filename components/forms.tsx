import Link from "next/link";
import { Category, TaskStatus } from "@prisma/client";
import {
  archiveTaskAction,
  completeTaskAction,
  deleteBlockedTimeAction,
  manualRescheduleAction,
  markSessionDoneAction,
  reportOverrunAction,
  saveBlockedTimeAction,
  saveTaskAction,
  updateSettingsAction
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatMinutes, toDateValue } from "@/lib/utils";

export function SettingsForm({
  user
}: {
  user: {
    id: string;
    timezone: string;
    defaultWorkDays: number[];
    defaultWorkStartTime: string;
    defaultWorkEndTime: string;
  };
}) {
  const weekdays = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 }
  ];

  return (
    <form action={updateSettingsAction} className="panel sage-wash space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Planner Setup</p>
          <h2 className="panel-title">Working Hours</h2>
          <p className="mt-1 text-sm text-ink/65">
            Scheduling only happens inside these days and time windows. Use 24-hour time, like `17:00` for 5 PM.
          </p>
        </div>
        <SubmitButton className="button-primary" pendingLabel="Saving...">
          Save settings
        </SubmitButton>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="field">
          <span className="field-label">Timezone</span>
          <input className="text-input" defaultValue={user.timezone} name="timezone" />
        </label>
        <label className="field">
          <span className="field-label">Start time</span>
          <input className="text-input" defaultValue={user.defaultWorkStartTime} name="defaultWorkStartTime" type="time" />
        </label>
        <label className="field">
          <span className="field-label">End time</span>
          <input className="text-input" defaultValue={user.defaultWorkEndTime} name="defaultWorkEndTime" type="time" />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        {weekdays.map((weekday) => (
          <label
            className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/90 px-4 py-2 text-sm"
            key={weekday.value}
          >
            <input
              defaultChecked={user.defaultWorkDays.includes(weekday.value)}
              name="defaultWorkDays"
              type="checkbox"
              value={weekday.value}
            />
            {weekday.label}
          </label>
        ))}
      </div>
    </form>
  );
}

export function TaskForm({
  categories,
  task
}: {
  categories: Category[];
  task?: {
    id: string;
    categoryId: string;
    name: string;
    doDate: Date;
    dueDate: Date;
    dueTime: string | null;
    estimatedMinutes: number;
  };
}) {
  const estimatedHours = task ? Math.floor(task.estimatedMinutes / 60) : 1;
  const estimatedMinutes = task ? task.estimatedMinutes % 60 : 0;

  return (
    <form action={saveTaskAction} className="panel peach-wash space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Task Entry</p>
          <h2 className="panel-title">{task ? "Edit Task" : "Task Intake"}</h2>
          <p className="mt-1 text-sm text-ink/65">Do date is the preferred work date. Due date is the actual deadline.</p>
        </div>
        <SubmitButton className="button-primary" pendingLabel={task ? "Updating..." : "Creating..."}>
          {task ? "Update task" : "Create task"}
        </SubmitButton>
      </div>
      {task ? <input name="taskId" type="hidden" value={task.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field md:col-span-2">
          <span className="field-label">Task name</span>
          <input className="text-input" defaultValue={task?.name} name="name" placeholder="Prepare board slide draft" required />
        </label>
        <label className="field">
          <span className="field-label">Category</span>
          <select className="select-input" defaultValue={task?.categoryId ?? categories[0]?.id} name="categoryId">
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Or make a new category</span>
          <input className="text-input" name="newCategoryName" placeholder="Reading, Health, Chores..." />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            <span className="field-label">Est. hours</span>
            <input className="text-input" defaultValue={estimatedHours} min={0} name="estimatedHours" type="number" />
          </label>
          <label className="field">
            <span className="field-label">Est. minutes</span>
            <input className="text-input" defaultValue={estimatedMinutes} max={59} min={0} name="estimatedMinutes" step={15} type="number" />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Do date</span>
          <input className="text-input" defaultValue={task ? toDateValue(task.doDate) : ""} name="doDate" required type="date" />
        </label>
        <label className="field">
          <span className="field-label">Due date</span>
          <input className="text-input" defaultValue={task ? toDateValue(task.dueDate) : ""} name="dueDate" required type="date" />
        </label>
        <label className="field">
          <span className="field-label">Due time (optional)</span>
          <input className="text-input" defaultValue={task?.dueTime ?? ""} name="dueTime" type="time" />
        </label>
      </div>
    </form>
  );
}

export function BlockedTimeForm() {
  return (
    <form action={saveBlockedTimeAction} className="panel rose-wash space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Conflict Block</p>
          <h2 className="panel-title">Blocked Time</h2>
          <p className="mt-1 text-sm text-ink/65">Add meetings or conflicts so the scheduler avoids them.</p>
        </div>
        <SubmitButton className="button-primary" pendingLabel="Saving...">
          Save block
        </SubmitButton>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="field">
          <span className="field-label">Label</span>
          <input className="text-input" name="label" placeholder="Dentist appointment" />
        </label>
        <label className="field">
          <span className="field-label">Start</span>
          <input className="text-input" name="startAt" required type="datetime-local" />
        </label>
        <label className="field">
          <span className="field-label">End</span>
          <input className="text-input" name="endAt" required type="datetime-local" />
        </label>
      </div>
    </form>
  );
}

export function TaskControls({ taskId }: { taskId: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <form action={completeTaskAction}>
        <input name="taskId" type="hidden" value={taskId} />
        <SubmitButton className="button-primary" pendingLabel="Saving...">
          Mark task done
        </SubmitButton>
      </form>
      <form action={archiveTaskAction}>
        <input name="taskId" type="hidden" value={taskId} />
        <SubmitButton className="button-danger" pendingLabel="Archiving...">
          Archive
        </SubmitButton>
      </form>
      <form action={manualRescheduleAction}>
        <SubmitButton className="button-secondary" pendingLabel="Rebuilding...">
          Rebuild schedule
        </SubmitButton>
      </form>
    </div>
  );
}

export function SessionDoneForm({ sessionId }: { sessionId: string }) {
  return (
    <form action={markSessionDoneAction} className="flex flex-wrap items-end gap-3 rounded-[1.4rem] border border-ink/10 bg-white/90 p-4">
      <input name="sessionId" type="hidden" value={sessionId} />
      <label className="field">
        <span className="field-label">Actual minutes</span>
        <input className="text-input min-w-24" min={0} name="actualMinutes" placeholder="120" type="number" />
      </label>
      <SubmitButton className="button-secondary" pendingLabel="Saving...">
        Mark session done
      </SubmitButton>
    </form>
  );
}

export function OverrunForm({ taskId }: { taskId: string }) {
  return (
    <form action={reportOverrunAction} className="panel rose-wash space-y-4">
      <input name="taskId" type="hidden" value={taskId} />
      <div>
        <p className="section-kicker">Adjustment</p>
        <h2 className="panel-title">Report Overrun</h2>
        <p className="mt-1 text-sm text-ink/65">Create a linked continuation task when the original estimate was too small.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          <span className="field-label">Extra hours</span>
          <input className="text-input" defaultValue={1} min={0} name="extraHours" type="number" />
        </label>
        <label className="field">
          <span className="field-label">Extra minutes</span>
          <input className="text-input" defaultValue={0} max={59} min={0} name="extraMinutes" step={15} type="number" />
        </label>
      </div>
      <SubmitButton className="button-primary" pendingLabel="Creating...">
        Create continuation task
      </SubmitButton>
    </form>
  );
}

export function TaskSummaryCard({
  task
}: {
  task: {
    id: string;
    name: string;
    status: TaskStatus;
    doDate: Date;
    dueDate: Date;
    dueTime: string | null;
    estimatedMinutes: number;
    category: {
      name: string;
      color: string;
    };
    sessions: Array<{
      id: string;
      startAt: Date;
      endAt: Date;
      plannedMinutes: number;
      status: string;
    }>;
  };
}) {
  const nextSession = task.sessions.find((session) => session.status === "PLANNED");

  return (
    <div className="sticker-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
          <div>
            <h3 className="text-xl text-[#54483f]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {task.name}
            </h3>
            <p className="mt-1 text-sm text-ink/65">
              {formatMinutes(task.estimatedMinutes)} planned • do {toDateValue(task.doDate)} • due {toDateValue(task.dueDate)}
              {task.dueTime ? ` at ${task.dueTime}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-ink/60">
          <p>{task.sessions.filter((session) => session.status === "PLANNED").length} planned sessions</p>
          <p>{nextSession ? `Next ${nextSession.startAt.toLocaleString()}` : "No future session"}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="button-secondary" href={`/tasks/${task.id}`}>
          Open task
        </Link>
        <form action={archiveTaskAction}>
          <input name="taskId" type="hidden" value={task.id} />
          <SubmitButton className="button-danger" pendingLabel="Archiving...">
            Archive
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

export function BlockedTimeList({
  items
}: {
  items: Array<{ id: string; label: string | null; startAt: Date; endAt: Date }>;
}) {
  return (
    <div className="panel rose-wash space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Planner Conflicts</p>
          <h2 className="panel-title">Current Conflicts</h2>
          <p className="mt-1 text-sm text-ink/65">These windows are removed from scheduling availability.</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-ink/10 bg-white/92 p-4" key={item.id}>
              <div>
                <p className="font-medium">{item.label || "Unavailable"}</p>
                <p className="text-sm text-ink/60">
                  {item.startAt.toLocaleString()} to {item.endAt.toLocaleString()}
                </p>
              </div>
              <form action={deleteBlockedTimeAction}>
                <input name="blockedTimeId" type="hidden" value={item.id} />
                <SubmitButton className="button-danger" pendingLabel="Deleting...">
                  Delete
                </SubmitButton>
              </form>
            </div>
          ))
        ) : (
          <p className="text-sm text-ink/60">No blocked time yet.</p>
        )}
      </div>
    </div>
  );
}
