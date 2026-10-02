"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Account, getCurrentAccount } from "./account-store";
import { addToCart, subscribeToCart } from "./cart-store";
import { PublicArtwork } from "./catalog-store";
import Toast from "./Toast";
import MediaImage from "./MediaImage";
import useRegisteredAccounts from "./use-registered-accounts";
import { ARTWORK_CATEGORIES, isArtworkCategory } from "./artwork-categories";

export default function ExploreCatalog() {
  const router = useRouter();
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [cartArtworkIds, setCartArtworkIds] = useState<Set<string>>(new Set());
  const [cartFeedback, setCartFeedback] = useState("");
  const [addingArtworkId, setAddingArtworkId] = useState("");
  const { accounts, artworks: allArtworks, error, ready } = useRegisteredAccounts();
  const matchingQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = useMemo(
    () => allArtworks.filter((artwork) => (
      (category === "Todas" || artwork.category === category)
      && (!matchingQuery || `${artwork.title} ${artwork.artist} ${artwork.category} ${artwork.description}`.toLocaleLowerCase("pt-BR").includes(matchingQuery))
    )),
    [allArtworks, category, matchingQuery],
  );
  const matchingArtists = accounts
    .filter((account) => account.role === "artist" && `${account.name} ${account.bio}`.toLocaleLowerCase("pt-BR").includes(matchingQuery))
    .slice(0, 6);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeCart = () => {};
    void getCurrentAccount().then((currentAccount) => {
      if (cancelled) return;
      setAccount(currentAccount);
      if (currentAccount?.role === "buyer") {
        unsubscribeCart = subscribeToCart(currentAccount.id, (items) => {
          setCartArtworkIds(new Set(items.map((item) => item.id)));
        }, (issue) => setCartFeedback(issue.message));
      }
    }).catch((issue: unknown) => {
      if (!cancelled) setCartFeedback(issue instanceof Error ? issue.message : "Não foi possível carregar sua conta.");
    });
    return () => {
      cancelled = true;
      unsubscribeCart();
    };
  }, []);

  async function handleAddToCart(artwork: PublicArtwork) {
    if (!account) {
      router.push(`/login?next=${encodeURIComponent("/explorar")}`);
      return;
    }
    if (account.role !== "buyer") {
      setCartFeedback("O carrinho está disponível apenas para contas de comprador.");
      return;
    }
    setAddingArtworkId(artwork.id);
    setCartFeedback("");
    try {
      await addToCart(account, artwork);
      setCartArtworkIds((current) => new Set(current).add(artwork.id));
      setCartFeedback(`“${artwork.title}” foi adicionada ao carrinho.`);
    } catch (issue) {
      setCartFeedback(issue instanceof Error ? issue.message : "Não foi possível adicionar a obra ao carrinho.");
    } finally {
      setAddingArtworkId("");
    }
  }

  return (
    <>
      {error && <div className="mt-6"><Toast type="error" message={error} /></div>}
      {cartFeedback && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#5c2df2]/15 bg-white p-3">
          <Toast type={cartFeedback.includes("adicionada") ? "success" : "error"} message={cartFeedback} />
          {account?.role === "buyer" && cartArtworkIds.size > 0 && (
            <Link href="/checkout" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#5c2df2] px-4 py-2.5 text-sm font-bold text-white">
              <ShoppingCart size={17} /> Ir ao checkout ({cartArtworkIds.size})
            </Link>
          )}
        </div>
      )}
      <label htmlFor="catalog-search" className="mt-8 block max-w-2xl text-sm font-semibold">
        Pesquise obras, categorias ou artistas
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: pintura, Aline..."
          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base font-normal outline-none transition focus:border-[#5c2df2]"
        />
      </label>
      <fieldset className="mt-8">
        <legend className="mb-3 text-sm font-semibold">Categorias</legend>
        <div className="flex flex-wrap gap-3">
          {["Todas", ...ARTWORK_CATEGORIES].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                category === item
                  ? "border-transparent bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] text-white shadow-lg shadow-purple-500/20"
                  : "border-black/10 bg-white/70 hover:border-[#5c2df2]/50 hover:bg-white"
              }`}
            >
              {item}
            </button>
          ))}
          {!isArtworkCategory(category) && category !== "Todas" && (
            <button
              type="button"
              aria-pressed="true"
              onClick={() => setCategory(category)}
              className="rounded-full border border-transparent bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20"
            >
              {category}
            </button>
          )}
        </div>
      </fieldset>
      {matchingQuery && matchingArtists.length > 0 && (
        <section aria-label="Artistas encontrados" className="mt-8">
          <h2 className="text-xl font-bold">Artistas encontrados</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {matchingArtists.map((artist) => (
              <Link key={artist.id} href={`/artistas/${encodeURIComponent(artist.id)}`} className="rounded-full border border-[#5c2df2]/20 bg-white px-4 py-2 text-sm font-semibold text-[#5c2df2] hover:bg-[#f4efff]">
                {artist.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      {!ready ? (
        <div role="status" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-[22px] bg-white/70" />
          ))}
        </div>
      ) : null}
      {ready && filtered.length === 0 ? (
        <div className="mt-10 rounded-[24px] border border-black/5 bg-white/70 p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold">
            {allArtworks.length === 0 && !matchingQuery && category === "Todas"
              ? "O catálogo ainda está vazio"
              : matchingQuery
                ? "Nenhum resultado encontrado"
                : "Nenhuma obra nesta categoria"}
          </h2>
          {allArtworks.length === 0 && !matchingQuery && category === "Todas" ? (
            <>
              <p className="mt-3 text-[#5f586d]">As obras reais dos artistas aparecerão aqui assim que forem publicadas.</p>
              <Link href="/cadastro?perfil=artista" className="mt-5 inline-flex rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">
                Criar perfil de artista e publicar
              </Link>
            </>
          ) : (
            <p className="mt-3 text-[#5f586d]">Tente outro termo de busca ou selecione uma categoria diferente.</p>
          )}
        </div>
      ) : ready ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((artwork) => (
            <article key={artwork.id} className="group overflow-hidden rounded-[22px] border border-black/5 bg-white/70 shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
              <Link href={`/obras/${encodeURIComponent(artwork.id)}`} aria-label={`Ver obra ${artwork.title}`} className="block">
                <MediaImage src={artwork.image} alt={artwork.title} className="aspect-[4/3] bg-white" imageClassName="object-contain p-3 transition duration-500 group-hover:scale-[1.02]" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
              </Link>
              <div className="p-5">
                <span className="text-xs font-bold text-[#5c2df2]">{artwork.category}</span>
                <h2 className="mt-2 text-xl font-bold group-hover:text-[#5c2df2]">
                  <Link href={`/obras/${encodeURIComponent(artwork.id)}`}>{artwork.title}</Link>
                </h2>
                <p className="mt-2 text-sm text-[#5f586d]">{artwork.artist}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="font-bold">R$ {Number(artwork.price).toFixed(2).replace(".", ",")}</p>
                  <button
                    type="button"
                    aria-label={cartArtworkIds.has(artwork.id) ? `${artwork.title} já está no carrinho` : `Adicionar ${artwork.title} ao carrinho`}
                    title={cartArtworkIds.has(artwork.id) ? "Já está no carrinho" : "Adicionar ao carrinho"}
                    disabled={addingArtworkId === artwork.id || cartArtworkIds.has(artwork.id)}
                    onClick={() => void handleAddToCart(artwork)}
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-default ${
                      cartArtworkIds.has(artwork.id)
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[#5c2df2]/20 bg-white text-[#5c2df2] hover:bg-[#f4efff] disabled:opacity-60"
                    }`}
                  >
                    <ShoppingCart size={19} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
