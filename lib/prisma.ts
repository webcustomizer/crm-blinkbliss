// lib/prisma.ts
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// Cache the client in ALL environments (not just dev) so serverless
// warm invocations reuse the same client/pool instead of creating a new one.
globalForPrisma.prisma = prisma;
