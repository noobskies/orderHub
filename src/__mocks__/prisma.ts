import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>();

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Export the mock as default for jest.mock() usage
export default prismaMock;

// Type for the mocked Prisma client
export type MockPrisma = DeepMockProxy<PrismaClient>;
