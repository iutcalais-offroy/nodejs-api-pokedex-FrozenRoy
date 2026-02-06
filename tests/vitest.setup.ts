import {mockDeep, mockReset, DeepMockProxy} from 'vitest-mock-extended';
import {vi, beforeEach} from 'vitest';
import {PrismaClient} from '../src/generated/prisma/client';
import {prisma} from '../src/database';

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-secret-key-for-vitest';

vi.mock('../src/database', () => ({
    prisma: mockDeep<PrismaClient>()
}));

beforeEach(() => {
    mockReset(prismaMock);
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
