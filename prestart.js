const { execSync } = require("child_process");
const path = require("path");

const prisma = path.resolve(__dirname, "node_modules/.bin/prisma");

try {
  console.log("Running Prisma migrations...");
  execSync(`${prisma} migrate deploy`, { stdio: "inherit" });
} catch (e) {
  console.log("Migration skipped:", e.message);
}

console.log("Starting application...");
require("./dist/src/main");