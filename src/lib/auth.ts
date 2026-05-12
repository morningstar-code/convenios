import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { AuthUser } from "@/types";

/** Mismo id que el usuario `dev@local.skip` en prisma/seed.ts (FK al crear convenios). */
export const DEV_BYPASS_USER_ID = "clocaldevskip001";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "convenios-app-secret-change-in-production"
);

/**
 * En desarrollo, por defecto se omite el login (probar UI sin DB de auth).
 * En producción nunca aplica. Ponga DEV_SKIP_AUTH=false en .env para exigir login en local.
 */
export function shouldBypassAuth(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEV_SKIP_AUTH !== "false";
}

export function devBypassUser(): AuthUser {
  return {
    id: DEV_BYPASS_USER_ID,
    email: "dev@local.skip",
    name: "Modo prueba (sin login)",
    role: "admin",
  };
}
export async function signToken(payload: AuthUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (token) {
    const user = await verifyToken(token);
    if (user) return user;
  }
  if (shouldBypassAuth()) return devBypassUser();
  return null;
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<AuthUser | null> {
  const token = req.cookies.get("auth-token")?.value;
  if (token) {
    const user = await verifyToken(token);
    if (user) return user;
  }
  if (shouldBypassAuth()) return devBypassUser();
  return null;
}
export function requireAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}
