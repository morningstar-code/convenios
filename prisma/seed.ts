import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("🌱 Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const viewerPassword = await bcrypt.hash("viewer123", 10);

  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Administrador del Sistema",
      password: adminPassword,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@demo.com" },
    update: {},
    create: {
      email: "viewer@demo.com",
      name: "Analista de Convenios",
      password: viewerPassword,
      role: "viewer",
    },
  });

  /** Usuario fijo para modo "sin login" en desarrollo (src/lib/auth.ts DEV_BYPASS_USER_ID) */
  const devBypassPassword = await bcrypt.hash("unused", 10);
  await prisma.user.upsert({
    where: { email: "dev@local.skip" },
    update: { name: "Modo prueba (sin login)", role: "admin" },
    create: {
      id: "clocaldevskip001",
      email: "dev@local.skip",
      name: "Modo prueba (sin login)",
      password: devBypassPassword,
      role: "admin",
    },
  });

  console.log("✅ Users: admin@demo.com, viewer@demo.com, dev@local.skip (sin login)");
  console.log("🧹 Seed sin convenios ni alertas demo.");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Credenciales:");
  console.log("  Admin:  admin@demo.com  / admin123");
  console.log("  Viewer: viewer@demo.com / viewer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
