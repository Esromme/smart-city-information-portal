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
const { default: announcements } = await import('./announcements.js');

const app = buildApp(announcements);

beforeEach(() => {
  mockPool.query.mockReset();
  mockAuth.enforce = false;
});

describe('GET /announcements', () => {
  it('returns a limited public list', async () => {
    mockPool.query.mockResolvedValue({
      rows: [
        { id: 1, title: 'Water update', content: 'Body', category: 'water', published_at: '2026-01-01' },
      ],
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);

    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain('from public.announcements');
    expect(values).toEqual([100]);
  });

  it('filters by canonical category', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await request(app).get('/').query({ category: 'water', limit: '5' });

    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain('category = $1');
    expect(values).toEqual(['water', 5]);
  });

  it('includes the legacy transport spelling for transportation', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await request(app).get('/').query({ category: 'transportation' });

    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain("category in ($1, 'transport')");
    expect(values).toEqual(['transportation', 100]);
  });

  it('groups legacy categories under other', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await request(app).get('/').query({ category: 'other' });

    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain('category not in');
    expect(values).toEqual([100]);
  });

  it('rejects unknown category filters', async () => {
    const response = await request(app).get('/').query({ category: 'nonsense' });

    expect(response.status).toBe(400);
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

describe('POST /announcements', () => {
  it('requires authentication', async () => {
    mockAuth.enforce = true;

    const response = await request(app)
      .post('/')
      .send({ title: 'Title', content: 'Body', category: 'water' });

    expect(response.status).toBe(401);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('creates an announcement with a canonical category', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 7, title: 'Title' }] });

    const response = await request(app)
      .post('/')
      .send({ title: '  Title  ', content: ' Body ', category: 'emergency' });

    expect(response.status).toBe(201);

    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain('insert into public.announcements');
    expect(values).toEqual(['Title', 'Body', 'emergency']);
  });

  it('rejects missing fields and legacy categories on create', async () => {
    const missing = await request(app).post('/').send({ content: 'Body' });
    expect(missing.status).toBe(400);

    const legacy = await request(app)
      .post('/')
      .send({ title: 'T', content: 'B', category: 'health' });
    expect(legacy.status).toBe(400);

    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

describe('PUT /announcements/:id', () => {
  it('updates fields and keeps a legacy category when editing', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 3 }] });

    const response = await request(app)
      .put('/3')
      .send({ category: 'health' });

    expect(response.status).toBe(200);

    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain('update public.announcements');
    expect(values).toEqual(['health', 3]);
  });

  it('rejects an empty update and unknown categories', async () => {
    expect((await request(app).put('/3').send({})).status).toBe(400);
    expect(
      (await request(app).put('/3').send({ category: 'nonsense' })).status
    ).toBe(400);
  });

  it('returns 404 when the announcement does not exist', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const response = await request(app).put('/99').send({ title: 'New' });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /announcements/:id', () => {
  it('reports a successful delete', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 4 }] });

    const response = await request(app).delete('/4');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id: 4 });
  });

  it('returns 404 when nothing was deleted', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    expect((await request(app).delete('/4')).status).toBe(404);
  });
});
