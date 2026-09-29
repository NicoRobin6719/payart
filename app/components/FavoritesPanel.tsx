"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { Account } from "./account-store";
import { getPublicArtworks, PublicArtwork } from "./catalog-store";
import { getFavoriteIds, toggleFavorite } from "./community-store";
import Toast from "./Toast";

function formatPrice(price: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(price));
}

export default function FavoritesPanel({ account }: { account: Account }) {
  const [artworks, setArtworks] = useState<PublicArtwork[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const loadFavorites = useCallback(() => {
    try {
      const favoriteIds = getFavoriteIds(account.id);
      setArtworks(getPublicArtworks().filter((artwork) => favoriteIds.includes(artwork.id)));
      setError("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível carregar os favoritos.");
    } finally {
      setReady(true);
    }
  }, [account.id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadFavorites();
    });
    return () => { cancelled = true; };
  }, [loadFavorites]);

  function removeFavorite(artworkId: string) {
    try {
      toggleFavorite(account.id, artworkId);
      loadFavorites();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível remover dos favoritos.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Sua coleção</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Obras favoritas</h1>
        <p className="mt-2 text-sm text-[#5f586d]">Obras que você guardou para encontrar depois.</p>
      </div>
      {error && <div className="mb-5"><Toast type="error" message={error} /></div>}
      {!ready ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : artworks.length === 0 ? (
        <div className="rounded-[24px] border border-black/5 bg-white/80 p-8 text-center">
          <Heart className="mx-auto text-[#5c2df2]" size={30} />
          <h2 className="mt-4 text-xl font-bold">Sua lista está vazia</h2>
          <p className="mt-2 text-sm text-[#5f586d]">Explore as obras e toque no coração para salvá-las aqui.</p>
          <Link href="/explorar" className="mt-5 inline-flex rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">Explorar obras</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {artworks.map((artwork) => (
            <article key={artwork.id} className="overflow-hidden rounded-[22px] border border-black/5 bg-white/80 shadow-sm">
              <Link href={`/obras/${encodeURIComponent(artwork.id)}`} className="flex gap-4 p-4 transition hover:bg-[#faf9fc]">
                <div role="img" aria-label={artwork.title} className="h-24 w-24 shrink-0 rounded-xl bg-gradient-to-br from-[#eee8ff] to-[#f8e8f5] bg-cover bg-center" style={artwork.image ? { backgroundImage: `url("${artwork.image}")` } : undefined} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#5c2df2]">{artwork.category}</p>
                  <h2 className="mt-1 truncate font-bold">{artwork.title}</h2>
                  <p className="mt-1 text-sm text-[#5f586d]">{artwork.artist}</p>
                  <p className="mt-2 text-sm font-bold">{formatPrice(artwork.price)}</p>
                </div>
              </Link>
              <div className="border-t border-black/5 px-4 py-3">
                <button onClick={() => removeFavorite(artwork.id)} className="inline-flex items-center gap-2 text-xs font-semibold text-[#746e80] hover:text-red-700"><Trash2 size={14} /> Remover dos favoritos</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
