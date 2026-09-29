"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import Toast from "./Toast";
import useRegisteredAccounts from "./use-registered-accounts";

export default function ArtistDirectory() {
  const { accounts, error, ready } = useRegisteredAccounts();
  const artists = accounts.filter((account) => account.role === "artist");

  return (
    <section className="mt-12">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Artistas da comunidade</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Conheça quem cria.</h2>
      {error && <div className="mt-5"><Toast type="error" message={error} /></div>}
      {!ready ? (
        <div role="status" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-56 animate-pulse rounded-[22px] bg-white/70" />)}
        </div>
      ) : artists.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-black/5 bg-white/70 p-5 text-sm text-[#5f586d]">
          Os perfis de artistas cadastrados aparecerão aqui.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <article id={artist.id} key={artist.id} className="scroll-mt-8 overflow-hidden rounded-[22px] border border-black/5 bg-white/80 shadow-lg">
              <div
                role={artist.banner ? "img" : undefined}
                aria-label={artist.banner ? `Banner de ${artist.name}` : undefined}
                className="h-32 bg-gradient-to-br from-[#5c2df2] via-[#a45be8] to-[#ffbde7] bg-cover bg-center"
                style={artist.banner ? { backgroundImage: `url("${artist.banner}")` } : undefined}
              />
              <div className="p-5">
                <div className="-mt-12 mb-3 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#eee8ff] text-[#5c2df2]">
                  {artist.avatar ? (
                    <div role="img" aria-label={`Foto de ${artist.name}`} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${artist.avatar}")` }} />
                  ) : <UserRound size={27} />}
                </div>
                <h3 className="text-lg font-bold">{artist.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-[#5f586d]">{artist.bio || "Artista independente na comunidade PayArt."}</p>
                <p className="mt-3 text-xs font-semibold text-[#5c2df2]">{artist.artworks.length} {artist.artworks.length === 1 ? "obra publicada" : "obras publicadas"}</p>
                <Link href={`/artistas/${encodeURIComponent(artist.id)}`} className="mt-4 inline-flex rounded-lg border border-[#5c2df2]/20 px-4 py-2 text-sm font-bold text-[#5c2df2] hover:bg-[#f4efff]">Ver perfil e obras</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
