import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar · Nexo Commerce",
  description: "Acceso al panel de administración.",
};

/**
 * Login del panel. El proxy permite verlo a usuarios autenticados sin tienda
 * asignada (con `?motivo=sin-acceso`) para que puedan cambiar de cuenta sin
 * entrar en un loop de redirecciones.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  return <LoginForm noAccess={motivo === "sin-acceso"} />;
}
