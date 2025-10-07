// Mock pour l'adaptateur Prisma de Better Auth
module.exports = {
  prismaAdapter: jest.fn(() => ({
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }))
};