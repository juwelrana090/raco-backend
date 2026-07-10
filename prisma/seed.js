"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('[SEED] Starting database seed...');
    const hashedPassword = await bcrypt_1.default.hash('Admin@1234', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@raco.com' },
        update: {},
        create: {
            email: 'admin@raco.com',
            password: hashedPassword,
            name: 'System Administrator',
            role: 'ADMIN',
        },
    });
    console.log('[SEED] Created admin user:', admin.email);
    let electronics = await prisma.category.findFirst({
        where: { name: 'Electronics' },
    });
    if (!electronics) {
        electronics = await prisma.category.create({
            data: {
                name: 'Electronics',
                description: 'Electronic devices and accessories',
            },
        });
    }
    let phones = await prisma.category.findFirst({
        where: { name: 'Smartphones' },
    });
    if (!phones) {
        phones = await prisma.category.create({
            data: {
                name: 'Smartphones',
                description: 'Mobile phones and accessories',
                parentId: electronics.id,
            },
        });
    }
    let laptops = await prisma.category.findFirst({
        where: { name: 'Laptops' },
    });
    if (!laptops) {
        laptops = await prisma.category.create({
            data: {
                name: 'Laptops',
                description: 'Laptop computers',
                parentId: electronics.id,
            },
        });
    }
    let accessories = await prisma.category.findFirst({
        where: { name: 'Accessories' },
    });
    if (!accessories) {
        accessories = await prisma.category.create({
            data: {
                name: 'Accessories',
                description: 'Electronic accessories',
                parentId: electronics.id,
            },
        });
    }
    console.log('[SEED] Created categories:', electronics.name, phones.name, laptops.name, accessories.name);
    const products = [
        {
            sku: 'PHONE-001',
            name: 'iPhone 15 Pro Max',
            description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system',
            price: 185000,
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
            description: 'Windows laptop with stunning 4K display and powerful performance',
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
    console.log(`[SEED] Created ${products.length} sample products`);
    console.log('[SEED] Database seeded successfully!');
}
main()
    .catch((e) => {
    console.error('[ERROR] Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map