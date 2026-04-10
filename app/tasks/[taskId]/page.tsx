import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyTaskRedirect({
  params
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  redirect(`/planner/tasks/${taskId}`);
}
