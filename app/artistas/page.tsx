import Link from "next/link";
import PageShell from "../components/PageShell";
import ArtistDirectory from "../components/ArtistDirectory";

export default function ArtistasPage() {
  return (
    <PageShell eyebrow="Comunidade de artistas" title="Seu trabalho merece ser descoberto." description="Faça parte de uma rede que conecta artistas independentes a pessoas em busca de obras autênticas.">
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {["Perfil autoral", "Mais visibilidade", "Novas conexões"].map((item) => (
          <div key={item} className="rounded-[22px] border border-black/5 bg-white/70 p-6 shadow-lg">
            <h2 className="text-xl font-bold">{item}</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f586d]">Mostre sua identidade e alcance pessoas que se conectam com sua arte.</p>
          </div>
        ))}
      </div>
      <Link href="/cadastro?perfil=artista" className="mt-10 inline-flex rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-7 py-4 font-bold text-white">Criar perfil de artista</Link>
      <ArtistDirectory />
    </PageShell>
  );
}
