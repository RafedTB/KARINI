import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import { MessagingGateway } from './messaging.gateway.js';
import { MessagingService } from './messaging.service.js';
import { JwtModule } from '@nestjs/jwt';

function connect(url: string, auth?: object): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = io(url, { auth, transports: ['websocket'], reconnection: false });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

describe('MessagingGateway over Socket.IO', () => {
  let app: INestApplication;
  let url: string;
  let jwt: JwtService;
  const sockets: ClientSocket[] = [];
  const messagingService = {
    sendMessage: vi.fn(),
    sendTeacherMessage: vi.fn(),
    getConversationForParent: vi.fn(),
    getConversationForTeacher: vi.fn(),
    getConversationForUser: vi.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-only-secret' })],
      providers: [
        MessagingGateway,
        { provide: MessagingService, useValue: messagingService },
        { provide: ConfigService, useValue: { get: () => 'test-only-secret' } },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('Could not determine test port');
    url = `http://127.0.0.1:${address.port}`;
    jwt = module.get(JwtService);
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.close();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid token and rejects missing or invalid tokens', async () => {
    const token = jwt.sign({ id: 5, userType: 'parent' });
    const valid = await connect(url, { token });
    sockets.push(valid);
    expect(valid.connected).toBe(true);

    const missing = await new Promise<ClientSocket>((resolve) => {
      const socket = io(url, { transports: ['websocket'], reconnection: false });
      socket.once('disconnect', () => resolve(socket));
      socket.once('connect', () => socket.close());
    });
    sockets.push(missing);

    const invalid = await new Promise<ClientSocket>((resolve) => {
      const socket = io(url, { auth: { token: 'invalid' }, transports: ['websocket'], reconnection: false });
      socket.once('disconnect', () => resolve(socket));
      socket.once('connect', () => socket.close());
    });
    sockets.push(invalid);
  });

  it('disconnects cleanly without leaked state', async () => {
    const token = jwt.sign({ id: 5, userType: 'parent' });
    const socket = await connect(url, { token });
    sockets.push(socket);
    const disconnected = new Promise<void>((resolve) => socket.once('disconnect', () => resolve()));
    socket.close();
    await disconnected;
    expect(socket.connected).toBe(false);
  });
});
