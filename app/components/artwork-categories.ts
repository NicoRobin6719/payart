export const ARTWORK_CATEGORIES = [
  "Desenho artístico",
  "Artes plásticas",
  "Pintura",
  "Ilustração",
  "Ilustração editorial",
  "Retrato",
  "Desenho de paisagem",
  "Desenho arquitetônico",
  "Design de moda",
  "Desenho à mão livre",
  "Desenho de observação",
  "Desenho de figura humana",
  "Desenho anatômico",
  "Desenho de personagens",
  "Concept art",
  "Arte para jogos",
  "Storyboard",
  "Arte digital",
  "Ilustração digital",
  "Design gráfico",
  "HQ",
  "Mangá",
  "Arte para animação",
  "Cartoon",
  "Caricatura",
  "Arte conceitual",
  "Desenho infantil",
  "Arte em nanquim",
  "Desenho a lápis",
  "Desenho com caneta",
  "Lápis de cor",
  "Escultura",
  "Grafite",
] as const;

export type ArtworkCategory = (typeof ARTWORK_CATEGORIES)[number];

export function isArtworkCategory(value: string): value is ArtworkCategory {
  return ARTWORK_CATEGORIES.some((category) => category === value);
}
