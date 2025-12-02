import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const getDatabaseUrl = () => {
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    const password = encodeURIComponent(process.env.PGPASSWORD);
    return `postgresql://${process.env.PGUSER}:${password}@${process.env.PGHOST}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE}?sslmode=require`;
  }
  return env("DATABASE_URL") || env("DIRECT_URL");
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
