const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@zylova.com" },
    update: {},
    create: { email: "admin@zylova.com", password: hashedPassword, name: "Zylova Admin", role: "ADMIN" },
  });
  console.log("Admin user seeded");

  const products = [
    {
      id: "e-commerce-ultra", name: "E-Commerce Ultra",
      description: "Multi-channel e-commerce platform with Stripe, admin dashboard, and SEO optimization.",
      price: 499, category: "web", status: "approved", tags: ["Next.js 14", "Stripe Ready", "SEO Optimized", "Full Source Code"],
      image: "https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&q=80&w=800",
      demoUrl: "https://demo.example.com/ecommerce",
      features: ["Stripe Payment Integration", "Product CMS", "SEO Optimization", "100% Responsive", "PWA Support", "Admin Dashboard"],
    },
    {
      id: "saas-boilerplate-pro", name: "SaaS Boilerplate Pro",
      description: "Complete SaaS starter with auth, subscriptions, team management, and REST API.",
      price: 299, category: "saas", status: "approved", tags: ["Next.js 14", "Stripe Ready", "SEO Optimized", "Full Source Code"],
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
      demoUrl: "https://demo.example.com/saas",
      features: ["Auth & Membership", "Subscription Billing", "Team Management", "REST API", "Role-based Access", "Analytics Dashboard"],
    },
    {
      id: "agency-portfolio-system", name: "Agency Portfolio System",
      description: "Premium portfolio with Bento Grid, animations, dark mode, and built-in blog.",
      price: 149, category: "web", status: "approved", tags: ["Next.js 14", "Framer Motion", "SEO Optimized", "Full Source Code"],
      image: "https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&q=80&w=800",
      demoUrl: "https://demo.example.com/portfolio",
      features: ["Bento Grid Layout", "Framer Motion Animations", "Dark Mode Support", "Built-in Blog", "Contact Form", "Project CMS"],
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({ where: { id: product.id }, update: product, create: product });
  }
  console.log("Products seeded");

  const services = [
    { id: "web-development", title: "Web Development", description: "Next.js, React, Node.js. Full-stack applications optimized for SEO, Core Web Vitals, and conversion.", icon: "Globe", priceRange: "$2,000 - $15,000" },
    { id: "mobile-apps", title: "Mobile Apps", description: "Cross-platform iOS & Android with React Native. Native performance, shared codebase, faster delivery.", icon: "Smartphone", priceRange: "$3,000 - $20,000" },
    { id: "security-first", title: "Security First", description: "Enterprise-grade security with SSL, encryption, and regular penetration testing to protect your data.", icon: "Shield", priceRange: "$1,000 - $8,000" },
    { id: "global-ready", title: "Global Ready", description: "Multi-language, multi-currency, and CDN-optimized infrastructure ready to scale worldwide.", icon: "Globe", priceRange: "$1,500 - $10,000" },
  ];

  for (const service of services) {
    await prisma.serviceEntity.upsert({ where: { id: service.id }, update: service, create: service });
  }
  console.log("Services seeded");

  console.log("Seed completed successfully");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
