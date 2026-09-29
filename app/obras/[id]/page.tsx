import ArtworkDetail from "../../components/ArtworkDetail";

export default async function ObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArtworkDetail artworkId={id} />;
}
