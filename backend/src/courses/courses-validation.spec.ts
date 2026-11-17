import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { AuthRolesGuard } from '../users/guards/auth-roles.guard.js';

describe('Course POST validation', () => {
  let app: INestApplication;
  const coursesService = { create: vi.fn(), findAll: vi.fn(), findOne: vi.fn() };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        { provide: CoursesService, useValue: coursesService },
      ],
    });
    const module = await moduleBuilder
      .overrideGuard(AuthRolesGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = { id: 1, userType: 'instructor' };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => vi.clearAllMocks());

  it('rejects missing required fields', async () => {
    await request(app.getHttpServer())
      .post('/api/courses')
      .send({})
      .expect(400)
      .expect(({ body }) => expect(body.message).toEqual(expect.any(Array)));
  });

  it('rejects wrong field types and invalid enum values', async () => {
    await request(app.getHttpServer())
      .post('/api/courses')
      .send({ title: 123, section: 'invalid-section' })
      .expect(400)
      .expect(({ body }) => expect(body.message).toEqual(expect.any(Array)));
  });

  it('rejects unknown fields with whitelist enabled', async () => {
    await request(app.getHttpServer())
      .post('/api/courses')
      .send({
        title: 'Algebra',
        section: 'course',
        unknownField: 'remove me',
      })
      .expect(400);
  });

  it('accepts a valid course payload', async () => {
    coursesService.create.mockResolvedValue({ id: 1, title: 'Algebra' });
    await request(app.getHttpServer())
      .post('/api/courses')
      .send({ title: 'Algebra', section: 'course', subject: 'math' })
      .expect(201)
      .expect(({ body }) => expect(body.title).toBe('Algebra'));
  });
});
