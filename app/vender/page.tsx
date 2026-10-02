"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "../components/PageShell";
import { Account, getCurrentAccount } from "../components/account-store";

export default function VenderPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getCurrentAccount()
      .then((currentAccount) => {
        if (cancelled) return;
        if (currentAccount?.role === "artist") {
          setAccount(currentAccount);
          router.replace("/painel?secao=obras");
          return;
        }
        setAccount(currentAccount);
      })
      .catch((issue: unknown) => {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : "Não foi possível verificar sua conta.");
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f0ee] px-6">
        <p role={error ? "alert" : "status"} className="text-center text-sm text-[#5f586d]">
          {error || "Verificando sua conta..."}
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <PageShell eyebrow="Para quem cria" title="Não foi possível verificar sua conta." description={error}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-10 inline-flex rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-7 py-4 font-bold text-white"
        >
          Tentar novamente
        </button>
      </PageShell>
    );
  }

  if (account?.role === "buyer") {
    return (
      <PageShell
        eyebrow="Para quem cria"
        title="Sua conta atual é de comprador."
        description="Para publicar e gerenciar obras, crie uma conta de artista separada. Use um e-mail diferente do que já está vinculado à sua conta de comprador."
      >
        <Link
          href="/cadastro?perfil=artista"
          className="mt-10 inline-flex rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-7 py-4 font-bold text-white"
        >
          Criar conta de artista
        </Link>
        <Link href="/painel" className="ml-4 mt-10 inline-flex rounded-xl border border-black/10 px-7 py-4 font-bold">
          Voltar ao meu perfil
        </Link>
      </PageShell>
    );
  }

  if (account?.role === "artist") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f0ee] px-6">
        <p role="status" className="text-center text-sm text-[#5f586d]">
          Abrindo sua área de vendas...
        </p>
      </main>
    );
  }

  return (
    <PageShell
      eyebrow="Para quem cria"
      title="Venda sua arte para quem valoriza criatividade."
      description="Apresente seu trabalho, alcance novos públicos e transforme sua paixão em oportunidades."
    >
      <Link
        href="/cadastro?perfil=artista"
        className="mt-10 inline-flex rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-7 py-4 font-bold text-white"
      >
        Quero começar
      </Link>
    </PageShell>
  );
}
