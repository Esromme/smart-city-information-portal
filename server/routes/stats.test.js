import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { mockPool } = vi.hoisted(() => ({ mockPool: { query: vi.fn() } }));

vi.mock('../db.js', () => ({ pool: mockPool, healthCheck: vi.fn() }));

const { buildApp } = await import('../test/buildApp.js');
const { default: stats } = await import('./stats.js');

const app = buildApp(stats);

beforeEach(() => {
  mockPool.query.mockReset();
});

describe('GET /stats', () => {
  it('aggregates legacy categories onto the canonical set', async () => {
    mockPool.query.mockImplementation((sql) => {
      if (sql.includes('group by category')) {
        const table = sql.includes('public.services')
          ? 'services'
          : sql.includes('public.service_locations')
            ? 'locations'
            : 'announcements';

        const rowsByTable = {
          announcements: [
            { category: 'transport', count: 1 },
            { category: 'utilities', count: 2 },
          ],
          services: [
            { category: 'emergency', count: 2 },
            { category: 'health', count: 3 },
          ],
          locations: [{ category: 'water', count: 4 }],
        };

        return Promise.resolve({ rows: rowsByTable[table] });
      }

      if (sql.includes('public.services')) return Promise.resolve({ rows: [{ count: 5 }] });
      if (sql.includes('public.service_locations')) return Promise.resolve({ rows: [{ count: 4 }] });
      return Promise.resolve({ rows: [{ count: 3 }] });
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.data.totals).toEqual({
      announcements: 3,
      services: 5,
      locations: 4,
    });

    const { announcements, services, locations } = response.body.data.byCategory;

    expect(announcements).toEqual([
      { category: 'other', count: 2 },
      { category: 'transportation', count: 1 },
    ]);
    expect(services).toEqual([
      { category: 'other', count: 3 },
      { category: 'emergency', count: 2 },
    ]);
    expect(locations).toEqual([{ category: 'water', count: 4 }]);
  });
});
