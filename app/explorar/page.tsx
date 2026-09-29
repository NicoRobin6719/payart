import PageShell from "../components/PageShell";
import ExploreCatalog from "../components/ExploreCatalog";

export default function ExplorarPage() {
  return (
    <PageShell eyebrow="Galeria PayArt" title="Encontre uma obra que tenha significado para você." description="Explore categorias, descubra novos talentos e encontre peças únicas para transformar o seu espaço.">
      <ExploreCatalog />
    </PageShell>
  );
}
