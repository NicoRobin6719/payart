import PageShell from "../components/PageShell";
import AuthForm from "../components/AuthForm";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string }>;
}) {
  const { perfil } = await searchParams;

  return (
    <PageShell eyebrow="Comece agora" title="Crie sua conta no PayArt." description="Escolha seu perfil: descubra e acompanhe artistas como comprador ou publique suas obras como artista.">
      <AuthForm mode="cadastro" defaultRole={perfil === "artista" ? "artist" : "buyer"} />
    </PageShell>
  );
}
