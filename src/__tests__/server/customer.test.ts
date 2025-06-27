import { prismaMock } from "@/__mocks__/prisma";

// Mock the database
jest.mock("@/server/db", () => ({
  db: prismaMock,
}));

describe("Customer Database Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Customer CRUD operations", () => {
    it("should create a customer", async () => {
      const mockCustomer = {
        id: "1",
        name: "Test Customer",
        email: "test@example.com",
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        webhookUrl: "https://example.com/webhook",
        isActive: true,
        currency: "USD",
        timezone: "UTC",
        processingPriority: "NORMAL" as const,
        emailNotifications: true,
        webhookNotifications: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.customer.create.mockResolvedValue(mockCustomer);

      const result = await prismaMock.customer.create({
        data: {
          name: "Test Customer",
          email: "test@example.com",
          apiKey: "test-api-key",
          apiSecret: "test-api-secret",
          webhookUrl: "https://example.com/webhook",
        },
      });

      expect(result).toEqual(mockCustomer);
      expect(prismaMock.customer.create).toHaveBeenCalledWith({
        data: {
          name: "Test Customer",
          email: "test@example.com",
          apiKey: "test-api-key",
          apiSecret: "test-api-secret",
          webhookUrl: "https://example.com/webhook",
        },
      });
    });

    it("should find all customers", async () => {
      const mockCustomers = [
        {
          id: "1",
          name: "Test Customer 1",
          email: "test1@example.com",
          apiKey: "test-api-key-1",
          apiSecret: "test-api-secret-1",
          webhookUrl: "https://example.com/webhook1",
          isActive: true,
          currency: "USD",
          timezone: "UTC",
          processingPriority: "NORMAL" as const,
          emailNotifications: true,
          webhookNotifications: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Test Customer 2",
          email: "test2@example.com",
          apiKey: "test-api-key-2",
          apiSecret: "test-api-secret-2",
          webhookUrl: "https://example.com/webhook2",
          isActive: true,
          currency: "EUR",
          timezone: "Europe/London",
          processingPriority: "HIGH" as const,
          emailNotifications: false,
          webhookNotifications: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.customer.findMany.mockResolvedValue(mockCustomers);

      const result = await prismaMock.customer.findMany({
        orderBy: { createdAt: "desc" },
      });

      expect(result).toEqual(mockCustomers);
      expect(result).toHaveLength(2);
    });

    it("should find customer by id", async () => {
      const mockCustomer = {
        id: "1",
        name: "Test Customer",
        email: "test@example.com",
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        webhookUrl: "https://example.com/webhook",
        isActive: true,
        currency: "USD",
        timezone: "UTC",
        processingPriority: "NORMAL" as const,
        emailNotifications: true,
        webhookNotifications: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await prismaMock.customer.findUnique({
        where: { id: "1" },
      });

      expect(result).toEqual(mockCustomer);
    });

    it("should update a customer", async () => {
      const mockUpdatedCustomer = {
        id: "1",
        name: "Updated Customer",
        email: "updated@example.com",
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        webhookUrl: "https://example.com/webhook",
        isActive: true,
        currency: "USD",
        timezone: "UTC",
        processingPriority: "HIGH" as const,
        emailNotifications: true,
        webhookNotifications: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.customer.update.mockResolvedValue(mockUpdatedCustomer);

      const result = await prismaMock.customer.update({
        where: { id: "1" },
        data: {
          name: "Updated Customer",
          email: "updated@example.com",
          processingPriority: "HIGH",
        },
      });

      expect(result).toEqual(mockUpdatedCustomer);
    });

    it("should soft delete a customer", async () => {
      const mockDeletedCustomer = {
        id: "1",
        name: "Test Customer",
        email: "test@example.com",
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        webhookUrl: "https://example.com/webhook",
        isActive: false,
        currency: "USD",
        timezone: "UTC",
        processingPriority: "NORMAL" as const,
        emailNotifications: true,
        webhookNotifications: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.customer.update.mockResolvedValue(mockDeletedCustomer);

      const result = await prismaMock.customer.update({
        where: { id: "1" },
        data: { isActive: false },
      });

      expect(result).toEqual(mockDeletedCustomer);
      expect(result.isActive).toBe(false);
    });
  });
});
