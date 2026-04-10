"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className,
  type = "submit"
}: {
  children: ReactNode;
  pendingLabel: string;
  className: string;
  type?: "submit" | "button";
}) {
  const { pending } = useFormStatus();

  return (
    <button aria-busy={pending} className={className} disabled={pending} type={type}>
      {pending ? pendingLabel : children}
    </button>
  );
}
