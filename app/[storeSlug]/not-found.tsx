import Link from "next/link";
import { ArrowLeft, Compass, Store } from "lucide-react";
import { DEMO_STORES } from "@/lib/store";

export default function StoreNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <Compass className="h-7 w-7" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-brand">Error 404</p>
      <h1 className="mt-2 text-2xl font-extrabold text-neutral-900 sm:text-3xl dark:text-neutral-100">
        Esta tienda no existe o está pausada
      </h1>
      <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        El enlace que abriste no corresponde a un comercio activo. Podés volver a la landing o probar una de las
        demos en vivo.
      </p>

      <div className="mt-7 grid w-full gap-2 sm:grid-cols-3">
        {DEMO_STORES.map((demo) => (
          <Link
            key={demo.slug}
            href={`/${demo.slug}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-brand hover:text-brand dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <Store size={15} /> {demo.name}
          </Link>
        ))}
      </div>

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-brand dark:text-neutral-400"
      >
        <ArrowLeft size={15} /> Volver a la landing
      </Link>
    </div>
  );
}
