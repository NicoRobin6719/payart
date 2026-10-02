import { NextRequest, NextResponse } from "next/server";

type ShippingProduct = {
  width: number;
  height: number;
  length: number;
  weight: number;
  insuranceValue: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveNumber(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
}

function parseProducts(value: unknown): ShippingProduct[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null;
  const products: ShippingProduct[] = [];
  for (const item of value) {
    if (
      !isRecord(item)
      || !isPositiveNumber(item.width, 200)
      || !isPositiveNumber(item.height, 200)
      || !isPositiveNumber(item.length, 200)
      || !isPositiveNumber(item.weight, 100)
      || !isPositiveNumber(item.insuranceValue, 1_000_000)
    ) return null;
    products.push({
      width: item.width,
      height: item.height,
      length: item.length,
      weight: item.weight,
      insuranceValue: item.insuranceValue,
    });
  }
  return products;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A solicitação de estimativa está inválida." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "A solicitação de estimativa está inválida." }, { status: 400 });
  }

  const destinationPostalCode = typeof body.destinationPostalCode === "string"
    ? body.destinationPostalCode.replace(/\D/g, "")
    : "";
  const products = parseProducts(body.products);
  if (!/^\d{8}$/.test(destinationPostalCode) || !products) {
    return NextResponse.json({ error: "Informe um CEP de destino válido e os dados completos das embalagens." }, { status: 400 });
  }

  const chargeableWeight = products.reduce((total, product) => {
    const volumetricWeight = product.width * product.height * product.length / 5000;
    return total + Math.max(product.weight, volumetricWeight);
  }, 0);
  const declaredValue = products.reduce((total, product) => total + product.insuranceValue, 0);
  const basePrice = Math.max(
    14.9,
    11 + chargeableWeight * 7.5 + declaredValue * 0.012 + products.length * 2.5,
  );
  const quotes = [
    {
      serviceId: "payart-simulated-economico",
      name: "Econômico (simulação)",
      price: Number(basePrice.toFixed(2)),
      deliveryDays: 7,
    },
    {
      serviceId: "payart-simulated-expresso",
      name: "Expresso (simulação)",
      price: Number((basePrice * 1.55).toFixed(2)),
      deliveryDays: 3,
    },
  ];

  return NextResponse.json({ quotes, simulated: true });
}
