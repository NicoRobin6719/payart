const maximumSourceBytes = 5 * 1024 * 1024;
const maximumSourcePixels = 40_000_000;
const imageBudgets = {
  avatar: { maxDimension: 512, maxDataUrlLength: 90 * 1024 },
  banner: { maxDimension: 1600, maxDataUrlLength: 180 * 1024 },
  artwork: { maxDimension: 1400, maxDataUrlLength: 700 * 1024 },
} as const;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("O navegador não conseguiu processar esta imagem."));
      },
      "image/webp",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Não foi possível preparar a imagem."));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    reader.readAsDataURL(blob);
  });
}

export async function uploadAccountImage(
  _accountId: string,
  file: File,
  kind: "avatar" | "banner" | "artwork",
) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > maximumSourceBytes) {
    throw new Error("A imagem original deve ter até 5 MB.");
  }

  let source: ImageBitmap;
  try {
    source = await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível abrir esta imagem. Tente exportá-la como JPG, PNG ou WebP.");
  }

  try {
    if (source.width * source.height > maximumSourcePixels) {
      throw new Error("A imagem tem dimensões muito grandes. Reduza-a antes de enviar.");
    }
    const { maxDimension, maxDataUrlLength } = imageBudgets[kind];
    const largestSide = Math.max(source.width, source.height);
    let scale = Math.min(1, maxDimension / largestSide);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("O navegador não conseguiu preparar a imagem.");
      context.drawImage(source, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToBlob(canvas, Math.max(0.48, 0.84 - attempt * 0.06));
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl.length <= maxDataUrlLength) return dataUrl;
      scale *= 0.82;
    }
  } finally {
    source.close();
  }

  throw new Error("Esta imagem não pôde ser compactada o suficiente. Escolha outra imagem com menos detalhes ou dimensões menores.");
}
