import type { ReactNode } from "react";
import Link from "next/link";
import MobileNav from "./MobileNav";

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
    <div className="min-h-screen bg-[#f3f0ee] text-[#121212]">
      <header className="mx-auto max-w-[1280px] px-6 py-5">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="text-3xl font-extrabold tracking-[-0.08em]">
              Pay<span className="text-[#5c2df2]">Art</span>
              <span className="text-[#ff53c6]">.</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="/explorar" className="text-black/70 transition hover:text-black">Explorar</Link>
            <Link href="/vender" className="text-black/70 transition hover:text-black">Vender</Link>
            <Link href="/artistas" className="text-black/70 transition hover:text-black">Para Artistas</Link>
            <Link href="/sobre" className="text-black/70 transition hover:text-black">Sobre</Link>
            <Link href="/contato" className="text-black/70 transition hover:text-black">Contato</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-xl border border-black/10 bg-white/50 px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 sm:block">
              Entrar
            </Link>
            <Link href="/cadastro" className="rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5">
              Cadastrar
            </Link>
          </div>
          <MobileNav />
        </nav>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">{eyebrow}</p>
        <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.98] tracking-[-0.07em] sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5f586d]">{description}</p>
        {children}
      </main>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-[#5f586d]">
        © 2026 PayArt. Todos os direitos reservados.
      </footer>
    </div>
  );
}
