import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";

type CalendarItem = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  kind: "task" | "blocked";
  color: string;
  meta?: string;
};

const hours = Array.from({ length: 12 }, (_, index) => index + 8);
const HOUR_HEIGHT = 88;

function getTopPosition(date: Date) {
  const hourOffset = date.getHours() - hours[0];
  const minuteOffset = date.getMinutes() / 60;
  return (hourOffset + minuteOffset) * HOUR_HEIGHT;
}

function getEventHeight(startAt: Date, endAt: Date) {
  const minutes = Math.max((endAt.getTime() - startAt.getTime()) / 60000, 30);
  return Math.max((minutes / 60) * HOUR_HEIGHT, 52);
}

export function CalendarBoard({ items, anchorDate = new Date() }: { items: CalendarItem[]; anchorDate?: Date }) {
  const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({
    start,
    end: endOfWeek(addDays(start, 6), { weekStartsOn: 1 })
  });
  const timelineHeight = hours.length * HOUR_HEIGHT;

  return (
    <section className="panel planner-paper space-y-5 overflow-x-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">This Week</p>
          <h2 className="panel-title">Calendar View</h2>
          <p className="mt-1 text-sm text-ink/65">Planned work sessions and conflicts, placed at their actual times.</p>
        </div>
      </div>
      <div className="calendar-shell min-w-[1280px] overflow-hidden rounded-[1.7rem] border border-[#e7ddd0] bg-[#fffaf3]">
        <div className="calendar-header-row">
          <div className="calendar-time-head">Time</div>
          {days.map((day) => (
            <div className="calendar-day-head" key={day.toISOString()}>
              <p className="text-xs uppercase tracking-[0.15em] text-ink/50">{format(day, "EEE")}</p>
              <p className="mt-1 font-semibold">{format(day, "MMM d")}</p>
            </div>
          ))}
        </div>

        <div className="calendar-body-row">
          <div className="calendar-time-column" style={{ height: timelineHeight }}>
            {hours.map((hour) => (
              <div className="calendar-time-label" key={hour} style={{ top: hour === hours[0] ? 10 : (hour - hours[0]) * HOUR_HEIGHT - 10 }}>
                {format(new Date(2026, 0, 1, hour, 0, 0, 0), "h a")}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayItems = items.filter((item) => isSameDay(item.startAt, day));

            return (
              <div className="calendar-day-column" key={day.toISOString()} style={{ height: timelineHeight }}>
                {hours.map((hour) => (
                  <div
                    className="calendar-hour-line"
                    key={`${day.toISOString()}-${hour}`}
                    style={{ top: (hour - hours[0]) * HOUR_HEIGHT }}
                  />
                ))}

                {dayItems.map((item) => (
                  <div
                    className="calendar-event-card"
                    key={item.id}
                    style={{
                      top: getTopPosition(item.startAt),
                      height: getEventHeight(item.startAt, item.endAt),
                      backgroundColor: `${item.color}26`,
                      color: item.color
                    }}
                  >
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1">
                      {format(item.startAt, "h:mm a")} - {format(item.endAt, "h:mm a")}
                    </p>
                    {item.meta ? <p className="mt-1 opacity-80">{item.meta}</p> : null}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-ink/65">
        <span className="badge bg-teal/10 text-teal">Task work</span>
        <span className="badge bg-coral/10 text-coral">Blocked time</span>
        <span>Each event appears once at its actual time, so lunch blocks and tasks are easier to read.</span>
      </div>
    </section>
  );
}
