// This file is used by Prisma 7 to manage configuration rules and connection properties
import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 uses process.env to safely fetch the connection URL string
    url: process.env.DATABASE_URL || "mysql://root:@localhost:3306/hauers_db",
  },
});