import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { User } from './user.entity.js';
import { usersService } from './users.service.js';
import { AuthProvider } from './auth.provider.js';

describe('usersService error paths', () => {
  function mockRepository() {
    return {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    };
  }

  it('surfaces database errors instead of swallowing them', async () => {
    const repository = mockRepository();
    repository.findOne.mockRejectedValue(new Error('database unavailable'));
    const service = new usersService(
      repository as unknown as Repository<User>,
      {} as AuthProvider,
    );

    await expect(service.getCurrentUser(1)).rejects.toThrow('database unavailable');
  });

  it('throws NotFoundException when a user is missing', async () => {
    const repository = mockRepository();
    repository.findOne.mockResolvedValue(undefined);
    const service = new usersService(
      repository as unknown as Repository<User>,
      {} as AuthProvider,
    );

    await expect(service.getCurrentUser(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid membership updates as bad input', async () => {
    const repository = mockRepository();
    repository.findOne.mockResolvedValue({
      id: 1,
      userType: 'instructor',
      membership: 'default',
    } as User);
    const service = new usersService(
      repository as unknown as Repository<User>,
      {} as AuthProvider,
    );

    await expect(service.updateMembership(1, 'silver' as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects deleting another account for a non-admin', async () => {
    const repository = mockRepository();
    repository.findOne.mockResolvedValue({ id: 2 } as User);
    const service = new usersService(
      repository as unknown as Repository<User>,
      {} as AuthProvider,
    );

    await expect(service.deleteUser(2, { id: 1, userType: 'student' } as any))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
