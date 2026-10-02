"use client";

import { Menu, ShoppingCart, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  ["/explorar", "Explorar"],
  ["/vender", "Vender"],
  ["/artistas", "Para Artistas"],
  ["/sobre", "Sobre"],
  ["/contato", "Contato"],
];

export default function MobileNav({
  authReady,
  isSignedIn,
  isBuyer,
  cartCount,
}: {
  authReady: boolean;
  isSignedIn: boolean;
  isBuyer: boolean;
  cartCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 md:hidden">
      {authReady && isBuyer && (
        <Link href="/checkout" aria-label={`Ir para o checkout; ${cartCount} ${cartCount === 1 ? "obra" : "obras"} no carrinho`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-white/60 text-[#5c2df2]">
          <ShoppingCart size={20} />
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#ff53c6] px-1 text-[10px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>
        </Link>
      )}
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
            {authReady && (isSignedIn ? (
              <Link href="/painel" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 text-[#5c2df2]">
                <UserRound size={17} /> Meu perfil
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>Entrar</Link>
                <Link href="/cadastro" onClick={() => setOpen(false)} className="text-[#5c2df2]">Cadastrar</Link>
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
