import { Router } from 'express';
import { pool } from '../db.js';
import { asyncRoute } from '../lib/http.js';

const router = Router();

async function countByCategory(table) {
  const { rows } = await pool.query(
    `select category, count(*)::int as count
     from public.${table}
     group by category
     order by count desc, category asc`
  );
  return rows;
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
