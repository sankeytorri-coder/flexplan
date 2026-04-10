import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      heading="FlexPlan"
      subheading="Adaptive scheduling for real life."
      nav={
        user ? (
          <Link className="button-secondary" href="/planner">
            Open planner
          </Link>
        ) : (
          <>
            <Link className="button-secondary" href="/login">
              Log in
            </Link>
            <Link className="button-primary" href="/signup">
              Create account
            </Link>
          </>
        )
      }
    >
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="planner-main space-y-6">
          <div className="panel planner-paper space-y-4">
            <p className="section-kicker">How FlexPlan Works</p>
            <h2 className="panel-title text-3xl">A planner that adapts when real life changes.</h2>
            <p className="max-w-2xl text-base text-ink/68">
              FlexPlan turns task facts into a realistic work plan. You choose the task name, do date, due date, duration, category, and any blocked time. FlexPlan places the work on your calendar, updates when something changes, and keeps each person&apos;s planner private behind login.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">Separate do date and due date</p>
                <p className="mt-2 text-sm text-ink/65">Plan when you want to work, while still protecting the actual deadline.</p>
              </div>
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">No priority ranking</p>
                <p className="mt-2 text-sm text-ink/65">The app schedules from real constraints instead of asking people to score urgency.</p>
              </div>
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">Dependency-aware planning</p>
                <p className="mt-2 text-sm text-ink/65">Tasks can wait on earlier tasks, so follow-up work stays off the calendar until it can truly begin.</p>
              </div>
            </div>
          </div>

          <div className="panel peach-wash space-y-4">
            <p className="section-kicker">What you can do</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">1. Set work hours</p>
                <p className="mt-2 text-sm text-ink/65">Choose the days and hours where scheduling is allowed.</p>
              </div>
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">2. Add tasks and conflicts</p>
                <p className="mt-2 text-sm text-ink/65">Enter tasks, meetings, lunches, or appointments so the calendar reflects reality.</p>
              </div>
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">3. Let the planner place the work</p>
                <p className="mt-2 text-sm text-ink/65">The schedule updates automatically and shows sessions directly on the weekly spread.</p>
              </div>
              <div className="summary-card">
                <p className="font-medium text-[#54483f]">4. Adjust when plans change</p>
                <p className="mt-2 text-sm text-ink/65">Report overruns, mark sessions complete, and rebuild the schedule whenever needed.</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="planner-side space-y-6">
          <div className="panel sage-wash space-y-4">
            <p className="section-kicker">Personal planner</p>
            <h2 className="panel-title text-3xl">Each login gets its own schedule.</h2>
            <p className="text-sm text-ink/68">
              Your tasks, categories, blocked time, and schedule stay tied to your own account. Shared visitors no longer end up in the same competition planner.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="button-primary" href={user ? "/planner" : "/signup"}>
                {user ? "Go to my planner" : "Create my planner"}
              </Link>
              {!user ? (
                <Link className="button-secondary" href="/login">
                  I already have an account
                </Link>
              ) : null}
            </div>
          </div>

          <div className="panel rose-wash space-y-4">
            <p className="section-kicker">Best for</p>
            <ul className="space-y-3 text-sm text-ink/68">
              <li>Students balancing classes, reading, and assignments</li>
              <li>People who need do dates and due dates to stay separate</li>
              <li>Anyone whose plans shift because tasks take longer than expected</li>
            </ul>
          </div>
        </aside>
      </section>
    </DashboardShell>
  );
}
