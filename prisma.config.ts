import "dotenv/config";
import { defineConfig } from "prisma/config";
import path from "path";

// Also load .env.local for Next.js compatibility
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts", // <-- Configurado de volta para TypeScript com tsx
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});