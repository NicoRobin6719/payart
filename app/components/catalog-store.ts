import { Account, Artwork, getAccounts } from "./account-store";

export type PublicArtwork = Artwork & {
  artistId: string | null;
  artist: string;
  artistEmail: string;
};

const exampleArtworks: PublicArtwork[] = [
  {
    id: "sample-1",
    title: "Ritmo do Traço",
    artist: "Aline Varela",
    artistId: null,
    artistEmail: "",
    category: "Desenho artístico",
    price: "820.00",
    description: "Uma composição original que transforma sentimentos em linhas, texturas e movimento.",
    image: "https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sample-2",
    title: "Estrutura da Memória",
    artist: "Tomás Bragança",
    artistId: null,
    artistEmail: "",
    category: "Artes plásticas",
    price: "1260.00",
    description: "Formas, memórias e texturas se encontram nesta obra de arte contemporânea.",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sample-3",
    title: "Vibrações Urbanas",
    artist: "Laura Mendes",
    artistId: null,
    artistEmail: "",
    category: "Pintura",
    price: "1280.00",
    description: "Cores e formas urbanas registradas em uma pintura cheia de movimento.",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sample-4",
    title: "Luz de Futuro",
    artist: "Nina Costa",
    artistId: null,
    artistEmail: "",
    category: "Ilustração",
    price: "950.00",
    description: "Uma ilustração original sobre possibilidades, luz e novos caminhos.",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  },
];

export function getPublicArtworks(accounts = getAccounts()): PublicArtwork[] {
  const publishedArtworks = accounts.flatMap((account) => account.role === "artist"
    ? account.artworks.map((artwork) => ({
        ...artwork,
        artist: account.name,
        artistId: account.id,
        artistEmail: account.email,
      }))
    : []);

  return [...publishedArtworks, ...exampleArtworks];
}

export function getPublicArtwork(id: string, accounts?: Account[]) {
  return getPublicArtworks(accounts).find((artwork) => artwork.id === id) ?? null;
}
