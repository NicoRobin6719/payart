import ArtistPublicProfile from "../../components/ArtistPublicProfile";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArtistPublicProfile artistId={id} />;
}
