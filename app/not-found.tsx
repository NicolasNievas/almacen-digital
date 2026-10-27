import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <Home className="h-7 w-7" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-brand">Error 404</p>
      <h1 className="mt-2 text-2xl font-extrabold text-neutral-900 sm:text-3xl dark:text-neutral-100">
        No encontramos esta página
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        La URL que buscás no existe o fue movida. Volvé al inicio para explorar las demos.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-accent"
      >
        <ArrowLeft size={15} /> Ir al inicio
      </Link>
    </div>
  );
}
