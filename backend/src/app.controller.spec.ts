import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  let app: INestApplication;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = testingModule.get<AppController>(AppController);
    app = testingModule.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('returns Hello World! over HTTP', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });

    it('returns 404 for unknown routes', async () => {
      await request(app.getHttpServer())
        .get('/unknown-route')
        .expect(404);
    });
  });
});
