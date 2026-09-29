import PageShell from "../components/PageShell";
import AuthForm from "../components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : "/painel";

  return (
    <PageShell eyebrow="Bem-vindo de volta" title="Entre para continuar no PayArt." description="Acesse sua área de artista ou seu perfil de comprador.">
      <AuthForm mode="login" redirectTo={redirectTo} />
    </PageShell>
  );
}
