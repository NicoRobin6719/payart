"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Toast from "./Toast";
import { getPublicArtworks } from "./catalog-store";
import useRegisteredAccounts from "./use-registered-accounts";
import { ARTWORK_CATEGORIES, isArtworkCategory } from "./artwork-categories";

export default function ExploreCatalog() {
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const { accounts, error, ready } = useRegisteredAccounts();
  const allArtworks = useMemo(
    () => getPublicArtworks(accounts),
    [accounts],
  );
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

  return (
    <>
      {error && <div className="mt-6"><Toast type="error" message={error} /></div>}
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
          <h2 className="text-2xl font-bold">{matchingQuery ? "Nenhum resultado encontrado" : "Nenhuma obra nesta categoria"}</h2>
          <p className="mt-3 text-[#5f586d]">Tente outro termo de busca ou selecione uma categoria diferente.</p>
        </div>
      ) : ready ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((artwork) => (
            <Link key={artwork.id} href={`/obras/${encodeURIComponent(artwork.id)}`} className="group overflow-hidden rounded-[22px] border border-black/5 bg-white/70 shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
              <div
                role="img"
                aria-label={artwork.title}
                className="h-44 bg-gradient-to-br from-[#eee8ff] via-[#f8e8f5] to-[#f3f0ee] bg-cover bg-center"
                style={artwork.image ? { backgroundImage: `url("${artwork.image}")` } : undefined}
              />
              <div className="p-5">
                <span className="text-xs font-bold text-[#5c2df2]">{artwork.category}</span>
                <h2 className="mt-2 text-xl font-bold group-hover:text-[#5c2df2]">{artwork.title}</h2>
                <p className="mt-2 text-sm text-[#5f586d]">{artwork.artist}</p>
                <p className="mt-5 font-bold">R$ {Number(artwork.price).toFixed(2).replace(".", ",")}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
