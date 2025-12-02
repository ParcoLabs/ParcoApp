import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function getDatabaseUrl(): string {
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, DATABASE_URL } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const password = encodeURIComponent(PGPASSWORD);
    return `postgresql://${PGUSER}:${password}@${PGHOST}:${PGPORT || '5432'}/${PGDATABASE}?sslmode=require`;
  }
  return DATABASE_URL!;
}

const connectionString = getDatabaseUrl();

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
