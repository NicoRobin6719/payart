"use client";

import { KeyboardEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Palette } from "lucide-react";
import { PublicArtwork, subscribeToPublicArtworks } from "./catalog-store";
import MediaImage from "./MediaImage";
import Toast from "./Toast";

export default function HomeArtworkShowcase() {
  const [artworks, setArtworks] = useState<PublicArtwork[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const artwork = artworks.length > 0 ? artworks[currentIndex % artworks.length] : null;

  useEffect(() => subscribeToPublicArtworks(
    (nextArtworks) => {
      setArtworks(nextArtworks);
      setError("");
    },
    (issue) => {
      setArtworks([]);
      setError(issue.message);
    },
  ), []);

  function showPrevious() {
    setCurrentIndex((index) => (index - 1 + artworks.length) % artworks.length);
  }

  function showNext() {
    setCurrentIndex((index) => (index + 1) % artworks.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  }

  return (
    <div
      role="region"
      aria-label="Obras em destaque"
      aria-roledescription="carrossel"
      className="relative mx-auto w-full max-w-[580px]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="rounded-[30px] bg-[#17131f] p-3 shadow-2xl shadow-black/20">
        <div className="relative">
          <Link
            href={artwork ? `/obras/${encodeURIComponent(artwork.id)}` : "/explorar"}
            aria-label={artwork ? `Ver a obra ${artwork.title}` : "Explorar obras de artistas"}
            className="group block overflow-hidden rounded-[22px]"
          >
            <MediaImage
              key={artwork?.id ?? "empty-gallery"}
              src={artwork?.image}
              alt={artwork?.title ?? "Obras publicadas na galeria PayArt"}
              className="h-[350px] bg-gradient-to-br from-[#eee8ff] via-[#f8e8f5] to-[#f3f0ee] sm:h-[460px]"
              imageClassName="object-contain p-3 transition duration-500 group-hover:scale-[1.03]"
              sizes="(min-width: 1024px) 580px, 100vw"
              fallback={<Palette className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#5c2df2]/50" size={60} strokeWidth={1.2} />}
            />
          </Link>
          {artworks.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Obra anterior"
                onClick={showPrevious}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/95 text-[#5c2df2] shadow-lg transition hover:scale-105 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c2df2] sm:left-5 sm:h-12 sm:w-12"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Próxima obra"
                onClick={showNext}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/95 text-[#5c2df2] shadow-lg transition hover:scale-105 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c2df2] sm:right-5 sm:h-12 sm:w-12"
              >
                <ArrowRight size={20} />
              </button>
            </>
          )}
        </div>
        {artworks.length > 1 && (
          <div className="flex justify-center gap-2 px-2 pb-1 pt-3" role="group" aria-label="Selecionar obra em destaque">
            {artworks.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Mostrar obra ${index + 1}: ${item.title}`}
                aria-current={currentIndex % artworks.length === index ? "true" : undefined}
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  currentIndex % artworks.length === index ? "w-7 bg-white" : "w-2.5 bg-white/45 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div aria-live="polite" className="absolute -bottom-6 -left-3 max-w-[calc(100%-1rem)] rounded-2xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:-left-8">
        <p className="text-xs text-[#5f586d]">{artwork ? "Obra em destaque" : "Galeria PayArt"}</p>
        <p className="mt-1 truncate font-bold">
          {artwork ? artwork.title : "Sua arte pode estar aqui"}
        </p>
        <p className="mt-1 text-xs text-[#746e80]">
          {artwork ? `por ${artwork.artist}` : "Descubra e publique obras autorais"}
        </p>
      </div>

      <Link
        href={artwork ? "/explorar" : "/cadastro?perfil=artista"}
        className="absolute -right-2 -top-5 inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/95 p-4 text-sm font-bold shadow-xl backdrop-blur-md transition hover:-translate-y-0.5 sm:-right-7"
      >
        {artwork ? "Ver galeria" : "Começar a publicar"}
        <ArrowUpRight size={16} className="text-[#5c2df2]" />
      </Link>
      {error && <div className="absolute inset-x-3 top-full mt-10"><Toast type="error" message={error} /></div>}
    </div>
  );
}
