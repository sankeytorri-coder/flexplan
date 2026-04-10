import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { AuthCard } from "@/components/planner-forms";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage({
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
          <Link className="button-secondary" href="/login">
            Log in
          </Link>
        </>
      }
    >
      <section className="mx-auto max-w-4xl space-y-6">
        <AuthCard
          error={error}
          mode="signup"
          subtitle="Create a private FlexPlan account so your tasks and schedule belong only to you."
          title="Create your FlexPlan account"
        />
      </section>
    </DashboardShell>
  );
}
