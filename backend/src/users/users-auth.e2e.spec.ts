import { BadRequestException, ConflictException, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UsersController } from './users.controller.js';
import { usersService } from './users.service.js';
import { AuthGuard } from './guards/auth.guard.js';
import { UserType } from '../utils/enum.js';

describe('Users authentication and validation (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const users = {
    register: vi.fn(),
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-only-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [UsersController],
      providers: [
        { provide: usersService, useValue: users },
        AuthGuard,
        { provide: ConfigService, useValue: { get: (key: string) => key === 'JWT_SECRET' ? 'test-only-secret' : undefined } },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers an adult with valid fields', async () => {
    users.register.mockResolvedValue({ message: 'Registration successful' });
    await request(app.getHttpServer())
      .post('/api/users/auth/register')
      .send({
        email: 'adult@example.com',
        password: 'secret1',
        studentClass: 'Bac Sciences',
        phoneNumber: '12345678',
        gender: 'male',
        age: 20,
        cin: '12345678',
      })
      .expect(201)
      .expect(({ body }) => expect(body.message).toContain('Registration successful'));
  });

  it('returns conflict for duplicate registration', async () => {
    users.register.mockRejectedValue(new ConflictException('User with this email already exists'));
    await request(app.getHttpServer())
      .post('/api/users/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'secret1',
        studentClass: 'Bac Sciences',
        phoneNumber: '12345678',
        gender: 'male',
        age: 20,
        cin: '12345678',
      })
      .expect(409);
  });

  it('rejects invalid registration fields', async () => {
    await request(app.getHttpServer())
      .post('/api/users/auth/register')
      .send({ email: 'not-an-email', password: 'x', age: 'old', unknownField: true })
      .expect(400)
      .expect(({ body }) => expect(body.message).toEqual(expect.any(Array)));
  });

  it('logs in and returns an access token', async () => {
    users.login.mockResolvedValue({ accessToken: 'valid-token' });
    await request(app.getHttpServer())
      .post('/api/users/auth/login')
      .send({ email: 'student@example.com', password: 'secret1' })
      .expect(200)
      .expect(({ body }) => expect(body.accessToken).toBe('valid-token'));
  });

  it('rejects wrong and unknown credentials', async () => {
    users.login.mockRejectedValue(new UnauthorizedException('Invalid email or password'));
    await request(app.getHttpServer())
      .post('/api/users/auth/login')
      .send({ email: 'student@example.com', password: 'wrong12' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/users/auth/login')
      .send({ email: 'unknown@example.com', password: 'secret1' })
      .expect(401);
  });

  it('protects current-user from missing and invalid tokens', async () => {
    await request(app.getHttpServer()).get('/api/users/current-user').expect(401);
    await request(app.getHttpServer())
      .get('/api/users/current-user')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('rejects expired and accepts valid tokens', async () => {
    const expired = jwt.sign({ id: 1, userType: UserType.STUDENT }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/api/users/current-user')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);

    const valid = jwt.sign({ id: 1, userType: UserType.STUDENT });
    users.getCurrentUser.mockResolvedValue({ id: 1, email: 'student@example.com' });
    await request(app.getHttpServer())
      .get('/api/users/current-user')
      .set('Authorization', `Bearer ${valid}`)
      .expect(200);
  });

  it('rejects a wrong login payload and strips unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/api/users/auth/login')
      .send({ email: 'wrong', password: '1', unexpected: 'value' })
      .expect(400)
      .expect(({ body }) => expect(body.message).toEqual(expect.any(Array)));
  });
});
