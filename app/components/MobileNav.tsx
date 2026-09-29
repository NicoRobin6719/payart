"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  ["/explorar", "Explorar"],
  ["/vender", "Vender"],
  ["/artistas", "Para Artistas"],
  ["/sobre", "Sobre"],
  ["/contato", "Contato"],
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="rounded-xl border border-black/10 bg-white/60 p-3"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-20 z-10 border-y border-black/10 bg-[#f3f0ee] px-6 py-5 shadow-xl">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 text-sm font-semibold">
            {links.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}>Entrar</Link>
            <Link href="/cadastro" onClick={() => setOpen(false)} className="text-[#5c2df2]">Cadastrar</Link>
          </div>
        </div>
      )}
    </div>
  );
}
