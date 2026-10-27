import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StoreCatalog from "@/components/store/StoreCatalog";
import { getStoreBySlug } from "@/lib/supabase/stores";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { title: "Tienda no encontrada · Nexo" };

  return {
    title: `${store.name} · ${store.subtitle}`,
    description: store.slogan || `Catálogo online de ${store.name}.`,
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  return <StoreCatalog store={store} />;
}
