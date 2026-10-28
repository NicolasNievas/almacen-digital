import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    // `redirect()` de Next lanza para cortar el render; lo replicamos para
    // poder verificar el destino sin depender del runtime de Next.
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/access")>();
  return {
    ...actual,
    listAccessibleStoreSlugs: vi.fn(),
  };
});

import { requireAdmin, requireSuperadmin } from "@/lib/auth";
import { listAccessibleStoreSlugs } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

const LOGIN_PATH = "/admin/login";
const NO_ACCESS_PATH = "/admin/login?motivo=sin-acceso";

const createClientMock = vi.mocked(createClient);
const listAccessibleStoreSlugsMock = vi.mocked(listAccessibleStoreSlugs);

type ServerClient = Awaited<ReturnType<typeof createClient>>;

function makeUser(role?: string): User {
  return {
    id: "user-1",
    email: "user@example.com",
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
    app_metadata: role ? { role } : {},
    user_metadata: {},
  } as User;
}

function mockSession(user: User | null, error: { message: string } | null = null) {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error });
  createClientMock.mockResolvedValue({
    auth: { getUser },
  } as unknown as ServerClient);
  return getUser;
}

async function expectRedirect(promise: Promise<unknown>, path: string) {
  await expect(promise).rejects.toThrow(`REDIRECT:${path}`);
}

beforeEach(() => {
  listAccessibleStoreSlugsMock.mockResolvedValue([]);
});

describe("requireAdmin", () => {
  it("redirige al login cuando no hay sesión", async () => {
    mockSession(null);

    await expectRedirect(requireAdmin("tienda-a"), LOGIN_PATH);
  });

  it("redirige al login cuando Supabase devuelve un error", async () => {
    mockSession(null, { message: "invalid token" });

    await expectRedirect(requireAdmin(), LOGIN_PATH);
  });

  it("redirige al login si el cliente de Supabase no se puede crear", async () => {
    createClientMock.mockRejectedValue(new Error("faltan variables de entorno"));

    await expectRedirect(requireAdmin(), LOGIN_PATH);
  });

  it("redirige al login cuando el usuario no tiene rol de panel", async () => {
    mockSession(makeUser());

    await expectRedirect(requireAdmin(), LOGIN_PATH);
    expect(listAccessibleStoreSlugsMock).not.toHaveBeenCalled();
  });

  it("permite el acceso total al superadmin sin consultar user_stores", async () => {
    const user = makeUser("superadmin");
    mockSession(user);

    const session = await requireAdmin("cualquier-tienda");

    expect(session).toEqual({ user, isSuperadmin: true, storeSlugs: [] });
    expect(listAccessibleStoreSlugsMock).not.toHaveBeenCalled();
  });

  it("permite al superadmin entrar al panel maestro", async () => {
    const user = makeUser("superadmin");
    mockSession(user);

    const session = await requireAdmin();

    expect(session.isSuperadmin).toBe(true);
    expect(session.storeSlugs).toEqual([]);
  });

  it("permite al admin acceder a una tienda asignada", async () => {
    const user = makeUser("admin");
    mockSession(user);
    listAccessibleStoreSlugsMock.mockResolvedValue(["tienda-a", "tienda-b"]);

    const session = await requireAdmin("tienda-b");

    expect(session).toEqual({
      user,
      isSuperadmin: false,
      storeSlugs: ["tienda-a", "tienda-b"],
    });
  });

  it("redirige a su propia tienda si el admin pide otra tienda", async () => {
    mockSession(makeUser("admin"));
    listAccessibleStoreSlugsMock.mockResolvedValue(["tienda-a"]);

    await expectRedirect(requireAdmin("tienda-z"), "/tienda-a/admin");
  });

  it("redirige a su tienda si el admin entra sin slug", async () => {
    mockSession(makeUser("admin"));
    listAccessibleStoreSlugsMock.mockResolvedValue(["tienda-a"]);

    await expectRedirect(requireAdmin(), "/tienda-a/admin");
  });

  it("redirige al login con aviso si el admin no tiene tiendas activas", async () => {
    mockSession(makeUser("admin"));
    listAccessibleStoreSlugsMock.mockResolvedValue([]);

    await expectRedirect(requireAdmin("tienda-a"), NO_ACCESS_PATH);
  });
});

describe("requireSuperadmin", () => {
  it("redirige al login cuando no hay sesión", async () => {
    mockSession(null);

    await expectRedirect(requireSuperadmin(), LOGIN_PATH);
  });

  it("redirige al login cuando el usuario no tiene rol de panel", async () => {
    mockSession(makeUser());

    await expectRedirect(requireSuperadmin(), LOGIN_PATH);
  });

  it("permite el panel maestro al superadmin", async () => {
    const user = makeUser("superadmin");
    mockSession(user);

    const session = await requireSuperadmin();

    expect(session).toEqual({ user, isSuperadmin: true, storeSlugs: [] });
  });

  it("deriva al admin de tienda a su propio panel", async () => {
    mockSession(makeUser("admin"));
    listAccessibleStoreSlugsMock.mockResolvedValue(["tienda-a"]);

    await expectRedirect(requireSuperadmin(), "/tienda-a/admin");
  });

  it("deriva al login con aviso si el admin no tiene tiendas", async () => {
    mockSession(makeUser("admin"));
    listAccessibleStoreSlugsMock.mockResolvedValue([]);

    await expectRedirect(requireSuperadmin(), NO_ACCESS_PATH);
  });
});
