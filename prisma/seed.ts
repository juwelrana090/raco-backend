import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash password for admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@racocommerce.com' },
    update: {},
    create: {
      email: 'admin@racocommerce.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create categories hierarchy
  const electronics = await prisma.category.upsert({
    where: { id: 'electronics-root' },
    update: {},
    create: {
      id: 'electronics-root',
      name: 'Electronics',
      description: 'Electronic devices and accessories',
    },
  });

  const phones = await prisma.category.upsert({
    where: { id: 'phones-cat' },
    update: {},
    create: {
      id: 'phones-cat',
      name: 'Smartphones',
      description: 'Mobile phones and accessories',
      parentId: electronics.id,
    },
  });

  const laptops = await prisma.category.upsert({
    where: { id: 'laptops-cat' },
    update: {},
    create: {
      id: 'laptops-cat',
      name: 'Laptops',
      description: 'Laptop computers',
      parentId: electronics.id,
    },
  });

  const accessories = await prisma.category.upsert({
    where: { id: 'accessories-cat' },
    update: {},
    create: {
      id: 'accessories-cat',
      name: 'Accessories',
      description: 'Electronic accessories',
      parentId: electronics.id,
    },
  });

  console.log(
    '✅ Created categories:',
    electronics.name,
    phones.name,
    laptops.name,
    accessories.name,
  );

  // Create sample products
  const products = [
    {
      sku: 'PHONE-001',
      name: 'iPhone 15 Pro Max',
      description:
        'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system',
      price: 185000, // BDT in poisha
      stock: 50,
      categoryId: phones.id,
      imageUrl: 'https://example.com/iphone15.jpg',
    },
    {
      sku: 'PHONE-002',
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Premium Android smartphone with S Pen and AI features',
      price: 165000,
      stock: 45,
      categoryId: phones.id,
      imageUrl: 'https://example.com/galaxy24.jpg',
    },
    {
      sku: 'LAPTOP-001',
      name: 'MacBook Pro 16" M3 Max',
      description: 'Powerful laptop for professionals with M3 Max chip',
      price: 350000,
      stock: 20,
      categoryId: laptops.id,
      imageUrl: 'https://example.com/macbook.jpg',
    },
    {
      sku: 'LAPTOP-002',
      name: 'Dell XPS 15',
      description:
        'Windows laptop with stunning 4K display and powerful performance',
      price: 285000,
      stock: 25,
      categoryId: laptops.id,
      imageUrl: 'https://example.com/dellxps.jpg',
    },
    {
      sku: 'ACC-001',
      name: 'AirPods Pro 2',
      description: 'Premium wireless earbuds with active noise cancellation',
      price: 32000,
      stock: 100,
      categoryId: accessories.id,
      imageUrl: 'https://example.com/airpods.jpg',
    },
    {
      sku: 'ACC-002',
      name: 'Samsung Fast Charger 45W',
      description: 'Rapid charging adapter for Samsung devices',
      price: 3500,
      stock: 200,
      categoryId: accessories.id,
      imageUrl: 'https://example.com/charger.jpg',
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log(`✅ Created ${products.length} sample products`);

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
