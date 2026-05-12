import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { LoginSchema } from "@/validators/auth.validator";

export const runtime = "nodejs";

function isDatabaseConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Driver adapter puede exponer ECONNREFUSED como código además de P1001/P1017
    if (["P1001", "P1017", "ECONNREFUSED"].includes(err.code)) return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /ECONNREFUSED|Can't reach database|P1001/i.test(msg);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "admin" | "viewer",
    });

    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    if (isDatabaseConnectionError(err)) {
      return NextResponse.json(
        {
          error:
            "No se pudo conectar a la base de datos. Compruebe que PostgreSQL esté en ejecución, que DATABASE_URL en .env sea correcta y que haya ejecutado npm run db:push y npm run db:seed.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
