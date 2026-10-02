import Checkout from "../components/Checkout";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ obra?: string; itens?: string }>;
}) {
  const { obra, itens } = await searchParams;
  return <Checkout artworkId={obra} selectedArtworkIds={itens} />;
}
