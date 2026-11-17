import { DataSource, QueryFailedError } from 'typeorm';
import { User } from '../src/users/user.entity.js';
import { Course } from '../src/courses/course.entity.js';

describe('PostgreSQL integration', () => {
  let dataSource: DataSource | undefined;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'karini_test',
      entities: [User, Course],
      synchronize: true,
    });

    try {
      await dataSource.initialize();
    } catch (error) {
      console.warn(
        'Skipping database integration tests: PostgreSQL is unreachable. ' +
        `Start it on ${process.env.DB_HOST ?? '127.0.0.1'}:${process.env.DB_PORT ?? 5432}.`,
      );
      dataSource = undefined;
    }
  });

  beforeEach(async () => {
    if (!dataSource?.isInitialized) return;
    await dataSource.query('TRUNCATE TABLE "users", "courses" RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('creates and finds a user', async () => {
    if (!dataSource?.isInitialized) return;
    const repository = dataSource.getRepository(User);
    const user = await repository.save(repository.create({
      email: 'integration@example.com',
      password: 'hashed-password',
      userType: 'student',
      isAccountVerified: true,
    }));
    await expect(repository.findOneBy({ id: user.id })).resolves.toMatchObject({
      email: 'integration@example.com',
    });
  });

  it('rejects duplicate user email', async () => {
    if (!dataSource?.isInitialized) return;
    const repository = dataSource.getRepository(User);
    await repository.save(repository.create({
      email: 'duplicate@example.com',
      password: 'hashed-password',
      userType: 'student',
    }));

    await expect(repository.save(repository.create({
      email: 'duplicate@example.com',
      password: 'another-password',
      userType: 'student',
    }))).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('creates and finds a course entity', async () => {
    if (!dataSource?.isInitialized) return;
    const courseRepository = dataSource.getRepository(Course);
    const course = await courseRepository.save(courseRepository.create({
      title: 'Integration Algebra',
      section: 'course',
      subject: 'math',
      createdById: 1,
    }));
    await expect(courseRepository.findOneBy({ id: course.id })).resolves.toMatchObject({
      title: 'Integration Algebra',
    });
  });
});
