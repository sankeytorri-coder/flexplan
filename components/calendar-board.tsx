import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, set, startOfWeek } from "date-fns";

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

export function CalendarBoard({ items, anchorDate = new Date() }: { items: CalendarItem[]; anchorDate?: Date }) {
  const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({
    start,
    end: endOfWeek(addDays(start, 6), { weekStartsOn: 1 })
  });

  return (
    <section className="panel planner-paper space-y-5 overflow-x-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">This Week</p>
          <h2 className="panel-title">Calendar View</h2>
          <p className="mt-1 text-sm text-ink/65">Planned work sessions and conflicts for the current week.</p>
        </div>
      </div>
      <div className="calendar-grid min-w-[1280px] gap-px overflow-hidden rounded-[1.7rem] border border-[#e7ddd0] bg-[#e7ddd0]">
        <div className="bg-[#fffaf3] p-4 text-sm font-medium text-ink/60">Time</div>
        {days.map((day) => (
          <div className="bg-[#fffaf3] p-4" key={day.toISOString()}>
            <p className="text-xs uppercase tracking-[0.15em] text-ink/50">{format(day, "EEE")}</p>
            <p className="mt-1 font-semibold">{format(day, "MMM d")}</p>
          </div>
        ))}

        {hours.map((hour) => (
          <div className="contents" key={`row-${hour}`}>
            <div className="bg-[#fffaf3] p-4 text-sm text-ink/60">
              {format(set(new Date(), { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 }), "h a")}
            </div>
            {days.map((day) => {
              const rowItems = items.filter(
                (item) => isSameDay(item.startAt, day) && item.startAt.getHours() <= hour && item.endAt.getHours() >= hour
              );

              return (
                <div className="min-h-24 bg-[#fffaf3] p-2" key={`${day.toISOString()}-${hour}`}>
                  <div className="flex flex-col gap-2">
                    {rowItems.map((item) => (
                      <div
                        className="rounded-[1.35rem] p-3 text-xs shadow-sm"
                        key={item.id}
                        style={{
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
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-ink/65">
        <span className="badge bg-teal/10 text-teal">Task work</span>
        <span className="badge bg-coral/10 text-coral">Blocked time</span>
        <span>Sessions are grouped by hour so the board reads like a planner spread.</span>
      </div>
    </section>
  );
}
