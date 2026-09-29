"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Palette, UserRound } from "lucide-react";
import { Account, getAccounts } from "./account-store";
import { getPublicArtworks, PublicArtwork } from "./catalog-store";
import Toast from "./Toast";

export default function ArtistPublicProfile({ artistId }: { artistId: string }) {
  const [artist, setArtist] = useState<Account | null>(null);
  const [artworks, setArtworks] = useState<PublicArtwork[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const accounts = getAccounts();
        const foundArtist = accounts.find((account) => account.id === artistId && account.role === "artist") ?? null;
        setArtist(foundArtist);
        if (foundArtist) {
          setArtworks(getPublicArtworks(accounts).filter((artwork) => artwork.artistId === foundArtist.id));
        }
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Não foi possível carregar este perfil.");
      } finally {
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [artistId]);

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-[#f3f0ee]"><p role="status">Carregando perfil do artista...</p></main>;
  }

  if (!artist) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f0ee] px-6">
        <section className="max-w-lg rounded-[24px] bg-white p-8 text-center shadow-lg">
          {error && <Toast type="error" message={error} />}
          <h1 className="mt-3 text-2xl font-bold">Perfil não encontrado</h1>
          <p className="mt-2 text-sm text-[#5f586d]">Este perfil não está disponível neste navegador.</p>
          <Link href="/artistas" className="mt-5 inline-flex rounded-xl bg-[#5c2df2] px-5 py-3 font-bold text-white">Conhecer artistas</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f0ee] px-5 py-8 text-[#17131f] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/artistas" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#5c2df2]"><ArrowLeft size={17} /> Todos os artistas</Link>
        <section className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-lg">
          <div role={artist.banner ? "img" : undefined} aria-label={artist.banner ? `Banner de ${artist.name}` : undefined} className="h-44 bg-gradient-to-r from-[#5c2df2] via-[#a45be8] to-[#ffbde7] bg-cover bg-center sm:h-64" style={artist.banner ? { backgroundImage: `url("${artist.banner}")` } : undefined} />
          <div className="px-6 pb-8 sm:px-10">
            <div className="-mt-12 grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#eee8ff] text-[#5c2df2] sm:h-28 sm:w-28">
              {artist.avatar ? (
                <div role="img" aria-label={`Foto de ${artist.name}`} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${artist.avatar}")` }} />
              ) : <UserRound size={36} />}
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Artista independente</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.06em]">{artist.name}</h1>
            <p className="mt-4 max-w-3xl whitespace-pre-wrap leading-7 text-[#5f586d]">{artist.bio || "Este artista ainda está preparando sua apresentação."}</p>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Portfólio</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Obras de {artist.name}</h2>
            </div>
            <span className="text-sm text-[#5f586d]">{artworks.length} {artworks.length === 1 ? "obra" : "obras"}</span>
          </div>
          {artworks.length === 0 ? (
            <div className="rounded-[24px] border border-black/5 bg-white/80 p-8 text-center">
              <Palette className="mx-auto text-[#5c2df2]" size={30} />
              <p className="mt-3 text-sm text-[#5f586d]">Este artista ainda não publicou obras.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {artworks.map((artwork) => (
                <Link key={artwork.id} href={`/obras/${encodeURIComponent(artwork.id)}`} className="group overflow-hidden rounded-[22px] border border-black/5 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div role="img" aria-label={artwork.title} className="h-52 bg-gradient-to-br from-[#eee8ff] to-[#f8e8f5] bg-cover bg-center" style={artwork.image ? { backgroundImage: `url("${artwork.image}")` } : undefined} />
                  <div className="p-5">
                    <p className="text-xs font-bold text-[#5c2df2]">{artwork.category}</p>
                    <h3 className="mt-2 text-xl font-bold group-hover:text-[#5c2df2]">{artwork.title}</h3>
                    <p className="mt-3 font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(artwork.price))}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
