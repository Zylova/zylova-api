const { execSync } = require("child_process");
const path = require("path");

const prisma = path.resolve(__dirname, "node_modules/.bin/prisma");

try {
  console.log("Running Prisma migrations...");
  execSync(`${prisma} migrate deploy`, { stdio: "inherit" });
  console.log("Running seed...");
  execSync(`node ${path.resolve(__dirname, "seed.js")}`, { stdio: "inherit" });
} catch (e) {
  console.log("Migration or seed skipped:", e.message);
}

console.log("Starting application...");
require("./dist/src/main");