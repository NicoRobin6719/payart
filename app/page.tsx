import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import HomeArtworkShowcase from "./components/HomeArtworkShowcase";
import {
  ArrowRight,
  Heart,
  Palette,
  ShieldCheck,
  Globe,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f3f0ee] text-[#121212]">
      <SiteHeader />

      <section className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">
            Marketplace de arte
          </p>

          <h1 className="max-w-2xl text-5xl font-extrabold leading-[0.95] tracking-[-0.07em] sm:text-6xl lg:text-[76px]">
            A arte que você procura.
            <span className="mt-2 block bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] bg-clip-text text-transparent">
              O artista que você encontra.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-[#5f586d] sm:text-lg">
            Descubra obras únicas, conheça novos artistas e encontre peças
            que tenham significado para você.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/explorar"
              className="flex min-h-[54px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-7 font-bold text-white shadow-xl shadow-purple-500/20 transition hover:-translate-y-1"
            >
              Explorar obras
              <ArrowRight size={19} />
            </Link>

            <Link
              href="/cadastro?perfil=artista"
              className="flex min-h-[54px] items-center rounded-xl border border-black/10 bg-white/40 px-7 font-bold transition hover:-translate-y-1"
            >
              Quero vender minha arte
            </Link>
          </div>
        </div>

        <HomeArtworkShowcase />
      </section>

      {/* BENEFÍCIOS */}
      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-5 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Palette,
            title: "Arte autêntica",
            text: "Obras criadas por artistas.",
          },
          {
            icon: Heart,
            title: "Conexões reais",
            text: "Encontre arte que combina com você.",
          },
          {
            icon: ShieldCheck,
            title: "Compra segura",
            text: "Uma experiência pensada para você.",
          },
          {
            icon: Globe,
            title: "Novos talentos",
            text: "Descubra artistas de diferentes lugares.",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex flex-col items-center px-5 py-6 text-center"
            >
              <div className="mb-4 grid h-[70px] w-[70px] place-items-center rounded-2xl border border-black/5 bg-white/50 text-[#5c2df2] shadow-sm">
                <Icon size={28} />
              </div>

              <h3 className="mb-2 font-bold">
                {item.title}
              </h3>

              <p className="text-sm leading-6 text-[#5f586d]">
                {item.text}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <div className="rounded-[28px] border border-black/5 bg-white/75 p-8 text-center shadow-lg sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5c2df2]">Galeria PayArt</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">Obras publicadas por artistas independentes</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#5f586d]">
            As obras publicadas aparecem no catálogo Explorar. Crie seu perfil de vendedor para apresentar seu trabalho.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/explorar" className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-5 py-3 text-sm font-bold hover:bg-black/5">
              Explorar catálogo <ArrowRight size={17} />
            </Link>
            <Link href="/cadastro?perfil=artista" className="rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">
              Criar perfil de artista
            </Link>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section
        id="sobre"
        className="mx-auto grid max-w-[1280px] gap-6 px-6 py-20 lg:grid-cols-[1.1fr_.9fr]"
      >
        <div className="rounded-[24px] border border-black/5 bg-white/70 p-8 shadow-lg sm:p-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#5c2df2]">
            Sobre o PayArt
          </p>

          <h2 className="text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">
            A arte merece espaço.
          </h2>

          <p className="mt-5 leading-7 text-[#5f586d]">
            O PayArt nasceu para aproximar artistas e pessoas que valorizam
            arte. Um espaço onde criatividade, descoberta e oportunidades
            podem existir no mesmo lugar.
          </p>
        </div>

        <div className="grid gap-4 rounded-[24px] border border-black/5 bg-white/70 p-5 shadow-lg">
          <div className="rounded-2xl bg-[#eee8ff] p-6">
            <strong className="text-4xl font-extrabold text-[#5c2df2]">
              ∞
            </strong>

            <p className="mt-2 text-sm text-[#5f586d]">
              Possibilidades criativas
            </p>
          </div>

          <div className="rounded-2xl bg-[#fff0f8] p-6">
            <strong className="text-4xl font-extrabold text-[#ff53c6]">
              01
            </strong>

            <p className="mt-2 text-sm text-[#5f586d]">
              Um espaço para sua arte
            </p>
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section
        id="contato"
        className="mx-auto max-w-[1280px] px-6 pb-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] border border-purple-500/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-8 sm:p-10">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#5c2df2]">
              Fale com a gente
            </p>

            <h2 className="text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
              Vamos criar algo incrível?
            </h2>
          </div>

          <a
            href="mailto:contato@payart.com"
            className="rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-6 py-4 font-bold text-white shadow-lg shadow-purple-500/20"
          >
            Entre em contato
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 py-8 text-center text-sm text-[#5f586d]">
        © 2026 PayArt. Todos os direitos reservados.
      </footer>
    </div>
  );
}