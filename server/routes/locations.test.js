import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { mockPool, mockAuth } = vi.hoisted(() => ({
  mockPool: { query: vi.fn() },
  mockAuth: {
    enforce: false,
    respond: (_req, res) =>
      res.status(401).json({ error: 'Authentication required' }),
  },
}));

vi.mock('../db.js', () => ({ pool: mockPool, healthCheck: vi.fn() }));
vi.mock('../middleware/requireAdmin.js', () => ({
  requireAdmin: (req, res, next) =>
    mockAuth.enforce ? mockAuth.respond(req, res, next) : next(),
  authStatus: { configured: true, allowlistConfigured: true },
}));

const { buildApp } = await import('../test/buildApp.js');
const { default: locations } = await import('./locations.js');

const app = buildApp(locations);

beforeEach(() => {
  mockPool.query.mockReset();
  mockAuth.enforce = false;
});

describe('GET /service-locations', () => {
  it('only returns rows with valid coordinates', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await request(app).get('/');

    const [sql] = mockPool.query.mock.calls[0];
    expect(sql).toContain('latitude is not null');
    expect(sql).toContain('latitude between -90 and 90');
    expect(sql).toContain('longitude between -180 and 180');
  });

  it('supports the transportation alias', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await request(app).get('/').query({ category: 'transportation' });

    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain("category in ($1, 'transport')");
    expect(values).toEqual(['transportation', 500]);
  });
});

describe('POST /service-locations', () => {
  it('rejects out-of-range coordinates', async () => {
    const response = await request(app)
      .post('/')
      .send({ name: 'Far away', category: 'water', latitude: '120', longitude: '39' });

    expect(response.status).toBe(400);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('creates a location with a canonical category', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

    const response = await request(app)
      .post('/')
      .send({ name: 'Depot', category: 'waste', latitude: '11.08', longitude: '39.74' });

    expect(response.status).toBe(201);

    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain('insert into public.service_locations');
    expect(values).toEqual(['Depot', 'waste', 11.08, 39.74]);
  });

  it('requires authentication', async () => {
    mockAuth.enforce = true;

    const response = await request(app)
      .post('/')
      .send({ name: 'Depot', category: 'waste', latitude: '11', longitude: '39' });

    expect(response.status).toBe(401);
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

describe('PUT /service-locations/:id', () => {
  it('allows keeping an existing legacy category', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 2 }] });

    const response = await request(app).put('/2').send({ category: 'utilities' });

    expect(response.status).toBe(200);
    const [, values] = mockPool.query.mock.calls[0];
    expect(values).toEqual(['utilities', 2]);
  });
});
