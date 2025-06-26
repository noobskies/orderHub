import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create default admin user
  const adminPassword = await bcrypt.hash("admin123", 12);

  const adminUser = await prisma.adminUser.upsert({
    where: { email: "admin@orderhub.com" },
    update: {},
    create: {
      email: "admin@orderhub.com",
      name: "System Administrator",
      password: adminPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Created admin user:", adminUser.email);

  // Create sample customer for testing
  const testCustomer = await prisma.customer.upsert({
    where: { email: "test@customer.com" },
    update: {},
    create: {
      name: "Test E-commerce Store",
      email: "test@customer.com",
      apiKey: "test_api_key_12345",
      apiSecret: await bcrypt.hash("test_secret", 12),
      webhookUrl: "https://test-store.com/webhook/callback",
      currency: "USD",
      timezone: "America/New_York",
      processingPriority: "NORMAL",
      emailNotifications: true,
      webhookNotifications: true,
      isActive: true,
    },
  });

  console.log("✅ Created test customer:", testCustomer.name);

  // Create sample Taobao products for testing
  const taobaoProducts = [
    {
      taobaoItemId: "123456789",
      url: "https://item.taobao.com/item.htm?id=123456789",
      title: "Wireless Bluetooth Headphones",
      price: 29.99,
      currency: "CNY",
      availability: "IN_STOCK",
      verified: true,
      images: [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ],
      specifications: {
        brand: "TechBrand",
        model: "TB-WH100",
        color: "Black",
        connectivity: "Bluetooth 5.0",
      },
      variations: {
        colors: ["Black", "White", "Blue"],
        sizes: ["One Size"],
      },
    },
    {
      taobaoItemId: "987654321",
      url: "https://item.taobao.com/item.htm?id=987654321",
      title: "Smartphone Case - iPhone 15",
      price: 12.5,
      currency: "CNY",
      availability: "IN_STOCK",
      verified: true,
      images: ["https://example.com/case1.jpg"],
      specifications: {
        compatibility: "iPhone 15",
        material: "TPU + PC",
        protection: "Drop Protection",
      },
      variations: {
        colors: ["Clear", "Black", "Blue", "Pink"],
        sizes: ["iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max"],
      },
    },
  ];

  for (const product of taobaoProducts) {
    await prisma.taobaoProduct.upsert({
      where: { taobaoItemId: product.taobaoItemId },
      update: {},
      create: product,
    });
  }

  console.log("✅ Created sample Taobao products");

  // Create sample order for testing
  const sampleOrder = await prisma.order.upsert({
    where: {
      customerId_externalOrderId: {
        customerId: testCustomer.id,
        externalOrderId: "TEST_ORDER_001",
      },
    },
    update: {},
    create: {
      externalOrderId: "TEST_ORDER_001",
      orderNumber: "ORD-2024-001",
      customerId: testCustomer.id,
      customerEmail: "customer@test-store.com",
      status: "PENDING",
      priority: "NORMAL",
      originalTotal: 59.98,
      currency: "USD",
      shippingAddress: {
        name: "John Doe",
        line1: "123 Main Street",
        line2: "Apt 4B",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
        phone: "+1234567890",
      },
      billingAddress: {
        name: "John Doe",
        line1: "123 Main Street",
        line2: "Apt 4B",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
      },
      promoCode: "SAVE10",
      discountAmount: 5.99,
      processingNotes: "Sample order for testing",
      estimatedProcessingTime: "2-4 hours",
    },
  });

  console.log("✅ Created sample order:", sampleOrder.externalOrderId);

  // Create sample order items
  const orderItems = [
    {
      orderId: sampleOrder.id,
      productId: "prod_headphones_001",
      name: "Wireless Bluetooth Headphones",
      originalPrice: 29.99,
      quantity: 2,
      options: {
        color: "Black",
        size: "One Size",
      },
      sellerId: "seller_123",
      sellerName: "TechStore Inc",
      taobaoUrl: "https://item.taobao.com/item.htm?id=123456789",
      taobaoData: {
        itemId: "123456789",
        verified: true,
        lastChecked: new Date().toISOString(),
      },
      status: "PENDING",
    },
  ];

  for (const item of orderItems) {
    await prisma.orderItem.create({
      data: item,
    });
  }

  console.log("✅ Created sample order items");

  // Create initial processing log entry
  await prisma.processingLog.create({
    data: {
      orderId: sampleOrder.id,
      adminUserId: adminUser.id,
      action: "ORDER_RECEIVED",
      status: "PENDING",
      notes: "Order received via webhook and queued for processing",
      metadata: {
        source: "webhook",
        customerApiKey: "test_api_key_12345",
        receivedAt: new Date().toISOString(),
      },
    },
  });

  console.log("✅ Created processing log entry");

  console.log("🎉 Database seeding completed successfully!");
  console.log("\n📋 Summary:");
  console.log("- Admin user: admin@orderhub.com (password: admin123)");
  console.log("- Test customer: Test E-commerce Store");
  console.log("- Sample order: TEST_ORDER_001");
  console.log("- Taobao products: 2 sample products");
  console.log("\n🚀 You can now start the application and log in!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
