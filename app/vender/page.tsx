import Link from "next/link";
import PageShell from "../components/PageShell";

export default function VenderPage() {
  return (
    <PageShell eyebrow="Para quem cria" title="Venda sua arte para quem valoriza criatividade." description="Apresente seu trabalho, alcance novos públicos e transforme sua paixão em oportunidades.">
      <Link href="/cadastro?perfil=artista" className="mt-10 inline-flex rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-7 py-4 font-bold text-white">Quero começar</Link>
    </PageShell>
  );
}
