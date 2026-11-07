"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import Toast from "./Toast";
import MediaImage from "./MediaImage";
import useRegisteredAccounts from "./use-registered-accounts";

export default function ArtistDirectory() {
  const { accounts, error, ready } = useRegisteredAccounts();
  const artists = accounts.filter((account) => account.role === "artist");

  return (
    <section className="mt-12">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6d28d9]">Artistas da comunidade</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Conheça quem cria.</h2>
      {error && <div className="mt-5"><Toast type="error" message={error} /></div>}
      {!ready ? (
        <div role="status" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-56 animate-pulse rounded-[22px] bg-white/70" />)}
        </div>
      ) : artists.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-black/5 bg-white/70 p-5 text-sm text-[#475569]">
          Os perfis de artistas cadastrados aparecerão aqui.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <article id={artist.id} key={artist.id} className="scroll-mt-8 overflow-hidden rounded-[22px] border border-black/5 bg-white/80 shadow-lg">
              <MediaImage
                src={artist.banner}
                alt={`Banner de ${artist.name}`}
                objectPosition={`${artist.bannerPosition.x}% ${artist.bannerPosition.y}%`}
                imageFit={artist.bannerFit}
                className="h-32 bg-gradient-to-br from-[#6d28d9] via-[#8b5cf6] to-[#facc15]"
              />
              <div className="p-5">
                <div className="-mt-12 mb-3 h-16 w-16 rounded-full border-4 border-white bg-white text-[#6d28d9]">
                  <MediaImage
                    src={artist.avatar}
                    alt={`Foto de ${artist.name}`}
                    objectPosition={`${artist.avatarPosition.x}% ${artist.avatarPosition.y}%`}
                    imageFit={artist.avatarFit}
                    className="h-full w-full rounded-full"
                    sizes="64px"
                    fallback={<UserRound className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" size={27} />}
                  />
                </div>
                <h3 className="text-lg font-bold">{artist.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-[#475569]">{artist.bio || "Artista independente na comunidade PayArt."}</p>
                <p className="mt-3 text-xs font-semibold text-[#6d28d9]">{artist.artworks.filter((artwork) => !artwork.isSold).length} {artist.artworks.filter((artwork) => !artwork.isSold).length === 1 ? "obra publicada" : "obras publicadas"}</p>
                <Link href={`/artistas/${encodeURIComponent(artist.id)}`} className="mt-4 inline-flex rounded-lg border border-[#6d28d9]/20 px-4 py-2 text-sm font-bold text-[#6d28d9] hover:bg-[#f4efff]">Ver perfil e obras</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
