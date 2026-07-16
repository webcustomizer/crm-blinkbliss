// lib/prisma.ts
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 3, // cap connections per instance — tune so (instances × max) stays under your pooler's pool_size
});

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// Cache the client in ALL environments (not just dev) so serverless
// warm invocations reuse the same client/pool instead of creating a new one.
globalForPrisma.prisma = prisma;
