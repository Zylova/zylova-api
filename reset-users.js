const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const deleted = await prisma.user.deleteMany();
  console.log("Deleted " + deleted.count + " users");

  const hash = await bcrypt.hash("admin123", 10);

  const admin1 = await prisma.user.create({
    data: { email: "ttuan0147@gmail.com", password: hash, name: "Tran Tuan", role: "ADMIN" },
  });
  console.log("Created: " + admin1.email);

  const admin2 = await prisma.user.create({
    data: { email: "dotruongphat9@gmail.com", password: hash, name: "Do Truong Phat", role: "ADMIN" },
  });
  console.log("Created: " + admin2.email);

  const count = await prisma.user.count();
  console.log("Total users: " + count);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
