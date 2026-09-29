import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Palette,
  ShieldCheck,
  Globe,
} from "lucide-react";

const artworks = [
  {
    title: "Ritmo do Traço",
    artist: "Aline Varela",
    category: "Desenho artístico",
    price: "R$ 820",
    image:
      "https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Estrutura da Memória",
    artist: "Tomás Bragança",
    category: "Artes plásticas",
    price: "R$ 1.260",
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Vibrações Urbanas",
    artist: "Laura Mendes",
    category: "Pintura",
    price: "R$ 1.280",
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Luz de Futuro",
    artist: "Nina Costa",
    category: "Ilustração",
    price: "R$ 950",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80",
  },
];

const artists = [
  {
    name: "Aline Varela",
    initials: "AV",
    description: "Desenhos que transformam sentimentos em traços.",
  },
  {
    name: "Tomás Bragança",
    initials: "TB",
    description: "Explorando formas, memórias e texturas.",
  },
  {
    name: "Laura Mendes",
    initials: "LM",
    description: "Pinturas urbanas cheias de cor e movimento.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f3f0ee] text-[#121212]">
      {/* NAVBAR */}
      <header className="mx-auto max-w-[1280px] px-6 py-5">
        <nav className="flex items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-center">
            <span className="text-3xl font-extrabold tracking-[-0.08em]">
              Pay
              <span className="text-[#5c2df2]">Art</span>
              <span className="text-[#ff53c6]">.</span>
            </span>
          </Link>

          {/* MENU */}
          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link
              href="/explorar"
              className="text-black/70 transition hover:text-black"
            >
              Explorar
            </Link>

            <Link
              href="/vender"
              className="text-black/70 transition hover:text-black"
            >
              Vender
            </Link>

            <Link
              href="/artistas"
              className="text-black/70 transition hover:text-black"
            >
              Para Artistas
            </Link>

            <Link
              href="/sobre"
              className="text-black/70 transition hover:text-black"
            >
              Sobre
            </Link>

            <Link
              href="/contato"
              className="text-black/70 transition hover:text-black"
            >
              Contato
            </Link>
          </div>

          {/* AÇÕES */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-xl border border-black/10 bg-white/50 px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 sm:block"
            >
              Entrar
            </Link>

            <Link
              href="/vender"
              className="rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5"
            >
              Cadastrar
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">

        {/* TEXTO */}
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

        {/* IMAGEM */}
        <div className="relative mx-auto w-full max-w-[580px]">
          <div className="rounded-[30px] bg-[#17131f] p-3 shadow-2xl shadow-black/20">
            <div
              className="h-[350px] rounded-[22px] bg-cover bg-center sm:h-[460px]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(92,45,242,.2), rgba(255,83,198,.12)), url('https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80')",
              }}
            />
          </div>

          {/* CARD FLUTUANTE */}
          <div className="absolute -bottom-6 -left-3 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:-left-8">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eee8ff] text-[#5c2df2]">
                <Palette size={22} />
              </div>

              <div>
                <p className="text-xs text-[#5f586d]">
                  Obras exclusivas
                </p>
                <p className="font-bold">
                  Feitas por artistas
                </p>
              </div>
            </div>
          </div>

          {/* CORAÇÃO */}
          <div className="absolute -right-2 -top-5 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:-right-7">
            <div className="flex items-center gap-2">
              <Heart
                size={20}
                className="fill-[#ff53c6] text-[#ff53c6]"
              />
              <span className="text-sm font-bold">
                Arte que conecta
              </span>
            </div>
          </div>
        </div>
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

      {/* OBRAS */}
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#5c2df2]">
              Descubra
            </p>

            <h2 className="text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">
              Obras em destaque
            </h2>
          </div>

          <Link
            href="/explorar"
            className="flex items-center gap-2 font-bold text-[#5c2df2]"
          >
            Ver todas
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {artworks.map((artwork) => (
            <article
              key={artwork.title}
              className="group overflow-hidden rounded-[22px] border border-black/5 bg-white/75 shadow-lg shadow-black/[0.04] transition duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              <div
                className="h-[280px] bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                style={{
                  backgroundImage: `url('${artwork.image}')`,
                }}
              />

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#eee8ff] px-3 py-1.5 text-[11px] font-bold text-[#5c2df2]">
                    {artwork.category}
                  </span>

                  <span className="text-sm font-bold">
                    {artwork.price}
                  </span>
                </div>

                <h3 className="text-lg font-bold">
                  {artwork.title}
                </h3>

                <p className="mt-1 text-sm text-[#5f586d]">
                  {artwork.artist}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ARTISTAS */}
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <div className="mb-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#5c2df2]">
            Comunidade
          </p>

          <h2 className="text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">
            Artistas em destaque
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {artists.map((artist, index) => (
            <article
              key={artist.name}
              className="rounded-[22px] border border-black/5 bg-white/70 p-8 text-center shadow-lg shadow-black/[0.04]"
            >
              <div
                className={`mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full text-xl font-extrabold text-white ${
                  index === 0
                    ? "bg-gradient-to-br from-[#5c2df2] to-[#ff53c6]"
                    : index === 1
                      ? "bg-gradient-to-br from-[#ff7a59] to-[#ff53c6]"
                      : "bg-gradient-to-br from-[#2bb3ff] to-[#5c2df2]"
                }`}
              >
                {artist.initials}
              </div>

              <h3 className="text-xl font-bold">
                {artist.name}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#5f586d]">
                {artist.description}
              </p>
            </article>
          ))}
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