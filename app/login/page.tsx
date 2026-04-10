import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { AuthCard } from "@/components/planner-forms";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/planner");
  }

  const { error } = await searchParams;

  return (
    <DashboardShell
      heading="FlexPlan"
      subheading="Adaptive scheduling for real life."
      nav={
        <>
          <Link className="button-secondary" href="/welcome">
            Home
          </Link>
          <Link className="button-primary" href="/signup">
            Create account
          </Link>
        </>
      }
    >
      <section className="mx-auto max-w-4xl space-y-6">
        <AuthCard
          error={error}
          mode="login"
          subtitle="Log in to see your own planner, schedule, and categories."
          title="Log in to your planner"
        />
      </section>
    </DashboardShell>
  );
}
