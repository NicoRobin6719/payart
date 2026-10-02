"use client";

import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { ShoppingCart, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentAccount } from "./account-store";
import { subscribeToCart } from "./cart-store";
import { firebaseAuth } from "./firebase-client";
import MobileNav from "./MobileNav";

const navigationLinks = [
  ["/explorar", "Explorar"],
  ["/vender", "Vender"],
  ["/artistas", "Para Artistas"],
  ["/sobre", "Sobre"],
  ["/contato", "Contato"],
];

export default function SiteHeader() {
  const [authReady, setAuthReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let unsubscribeCart = () => {};
    const unsubscribeAuth = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        unsubscribeCart();
        unsubscribeCart = () => {};
        setCartCount(0);
        setIsSignedIn(Boolean(user));
        setIsBuyer(false);
        setAuthReady(true);
        if (!user) return;
        void getCurrentAccount().then((account) => {
          if (firebaseAuth.currentUser?.uid !== user.uid || account?.id !== user.uid) return;
          const buyer = account.role === "buyer";
          setIsBuyer(buyer);
          if (buyer) {
            unsubscribeCart = subscribeToCart(user.uid, (items) => {
              setCartCount(items.length);
            }, () => {
              setCartCount(0);
            });
          }
        }).catch(() => {
          if (firebaseAuth.currentUser?.uid === user.uid) setIsBuyer(false);
        });
      },
      () => {
        unsubscribeCart();
        unsubscribeCart = () => {};
        setCartCount(0);
        setIsSignedIn(false);
        setIsBuyer(false);
        setAuthReady(true);
      },
    );
    return () => {
      unsubscribeAuth();
      unsubscribeCart();
    };
  }, []);

  return (
    <header className="mx-auto max-w-[1280px] px-6 py-5">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="PayArt - início">
          <span className="text-3xl font-extrabold tracking-[-0.08em]">
            Pay<span className="text-[#5c2df2]">Art</span>
            <span className="text-[#ff53c6]">.</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navigationLinks.map(([href, label]) => (
            <Link key={href} href={href} className="text-black/70 transition hover:text-black">
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden min-w-52 items-center justify-end gap-3 sm:flex">
          {authReady && isBuyer && (
            <Link href="/checkout" aria-label={`Ir para o checkout; ${cartCount} ${cartCount === 1 ? "obra" : "obras"} no carrinho`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-[#5c2df2] transition hover:bg-[#f4efff]">
              <ShoppingCart size={20} />
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#ff53c6] px-1 text-[10px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>
            </Link>
          )}
          {authReady && (isSignedIn ? (
            <Link
              href="/painel"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5"
            >
              <UserRound size={17} />
              Meu perfil
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-xl border border-black/10 bg-white/50 px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5">
                Entrar
              </Link>
              <Link href="/cadastro" className="rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5">
                Cadastrar
              </Link>
            </>
          ))}
        </div>

        <MobileNav authReady={authReady} isSignedIn={isSignedIn} isBuyer={isBuyer} cartCount={cartCount} />
      </nav>
    </header>
  );
}
