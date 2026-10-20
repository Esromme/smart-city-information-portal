import { Router } from 'express';
import { pool } from '../db.js';
import { asyncRoute } from '../lib/http.js';
import { canonicalCategoryForStats } from '../lib/categories.js';

const router = Router();

// Aggregate legacy category values onto the canonical categories so the
// dashboard reports one figure per canonical service area.
async function countByCategory(table) {
  const { rows } = await pool.query(
    `select category, count(*)::int as count
     from public.${table}
     group by category`
  );

  const totals = new Map();

  for (const row of rows) {
    const key = canonicalCategoryForStats(row.category);
    totals.set(key, (totals.get(key) ?? 0) + row.count);
  }

  return Array.from(totals, ([category, count]) => ({ category, count })).sort(
    (a, b) => b.count - a.count || a.category.localeCompare(b.category)
  );
}

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const [announcements, services, locations, announcementCategories, serviceCategories, locationCategories] =
      await Promise.all([
        pool.query('select count(*)::int as count from public.announcements'),
        pool.query('select count(*)::int as count from public.services'),
        pool.query('select count(*)::int as count from public.service_locations'),
        countByCategory('announcements'),
        countByCategory('services'),
        countByCategory('service_locations'),
      ]);

    res.json({
      data: {
        totals: {
          announcements: announcements.rows[0].count,
          services: services.rows[0].count,
          locations: locations.rows[0].count,
        },
        byCategory: {
          announcements: announcementCategories,
          services: serviceCategories,
          locations: locationCategories,
        },
      },
    });
  })
);

export default router;
