import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Get first admin user
  const users = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    take: 1,
    select: { id: true, email: true }
  });

  // Get first product
  const products = await prisma.product.findMany({
    take: 1,
    select: { id: true, name: true }
  });

  console.log(JSON.stringify({ users, products }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());