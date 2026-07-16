import { PrismaClient, Role } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});
async function main() {
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const salesPassword = await bcrypt.hash("Sales@123", 12);

  // Admin
  await prisma.user.upsert({
    where: {
      email: "admin@blinkbliss.com",
    },
    update: {},
    create: {
      name: "Master Admin",
      email: "admin@blinkbliss.com",
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // Salesperson
  await prisma.user.upsert({
    where: {
      email: "sales@blinkbliss.com",
    },
    update: {},
    create: {
      name: "Ali Sales",
      email: "sales@blinkbliss.com",
      password: salesPassword,
      role: Role.SALESPERSON,
      isActive: true,
    },
  });

  console.log("✅ Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
