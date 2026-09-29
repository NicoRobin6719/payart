import PageShell from "../components/PageShell";

export default function ContatoPage() {
  return (
    <PageShell eyebrow="Fale com a gente" title="Vamos criar algo incrível?" description="Tem dúvidas, sugestões ou quer conversar sobre uma parceria? Nossa equipe está pronta para ouvir você.">
      <a href="mailto:contato@payart.com" className="mt-10 inline-flex rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-7 py-4 font-bold text-white">Enviar um e-mail</a>
    </PageShell>
  );
}
