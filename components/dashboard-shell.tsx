import Link from "next/link";
import { ReactNode } from "react";

export function DashboardShell({
  heading,
  subheading,
  children,
  nav
}: {
  heading: string;
  subheading: string;
  children: ReactNode;
  nav?: ReactNode;
}) {
  const isBrandHero = heading === "FlexPlan";

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="app-header">
          <div className="app-header-bar">
            <div className="brand-lockup">
              <div aria-hidden="true" className="brand-logo">
                <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
                  <rect
                    height="14"
                    rx="3.2"
                    stroke="#6c5d53"
                    strokeWidth="1.8"
                    width="14"
                    x="5"
                    y="5"
                  />
                  <path
                    d="M8.25 12.2L11 14.95L16 9.95"
                    stroke="#54483f"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                  />
                </svg>
              </div>
              <div className="brand-name">FlexPlan</div>
            </div>

            <nav className="flex items-center gap-3 text-sm">
              {nav ?? (
                <Link className="button-secondary" href="/">
                  Home
                </Link>
              )}
            </nav>
          </div>

          <div className="hero-stack">
            <h1 className="hero-title" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {isBrandHero ? <span className="title-highlight">{heading}</span> : heading}
            </h1>
            <p className="hero-tagline">{subheading}</p>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
