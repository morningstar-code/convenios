import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id: conventionId, draftId } = await params;

  const draft = await prisma.conventionDraft.update({
    where: { id: draftId, conventionId },
    data: { aceptado: true },
  });

  return NextResponse.json(draft);
}
