import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export default function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#121212]">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#6d28d9]">{eyebrow}</p>
        <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.98] tracking-[-0.07em] sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#475569]">{description}</p>
        {children}
      </main>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-[#475569]">
        © 2026 PayArt. Todos os direitos reservados.
      </footer>
    </div>
  );
}
