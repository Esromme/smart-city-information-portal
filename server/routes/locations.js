import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  asyncRoute,
  badRequest,
  notFound,
  optionalNumber,
  parseId,
  parseLimit,
  requireString,
} from '../lib/http.js';
import {
  addCategoryFilter,
  normalizeCategory,
} from '../lib/categories.js';

const router = Router();

// PUBLIC: List mapped service locations
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { category, limit } = req.query;
    const filters = [
      'latitude is not null',
      'longitude is not null',
      'latitude between -90 and 90',
      'longitude between -180 and 180',
    ];
    const values = [];

    addCategoryFilter(filters, values, category);

    values.push(parseLimit(limit, 500, 500));

    const { rows } = await pool.query(
      `select id, name, category, latitude, longitude, created_at
       from public.service_locations
       where ${filters.join(' and ')}
       order by name asc, id asc
       limit $${values.length}`,
      values
    );

    res.json({ data: rows, count: rows.length });
  })
);

// PUBLIC: Get one location
router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);

    const { rows } = await pool.query(
      'select * from public.service_locations where id = $1',
      [id]
    );

    if (!rows[0]) throw notFound('Location not found');

    res.json({ data: rows[0] });
  })
);

// ADMIN ONLY: Create location
router.post(
  '/',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const name = requireString(req.body.name, 'name', {
      max: 200,
    });
    const category = normalizeCategory(
      req.body.category ?? 'emergency',
      { field: 'category' }
    );
    const latitude = optionalNumber(
      req.body.latitude,
      'latitude',
      { min: -90, max: 90 }
    );
    const longitude = optionalNumber(
      req.body.longitude,
      'longitude',
      { min: -180, max: 180 }
    );

    const { rows } = await pool.query(
      `insert into public.service_locations
       (name, category, latitude, longitude)
       values ($1, $2, $3, $4)
       returning *`,
      [name, category, latitude, longitude]
    );

    res.status(201).json({ data: rows[0] });
  })
);

// ADMIN ONLY: Update location
router.put(
  '/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    const fields = [];
    const values = [];

    if (req.body.name !== undefined) {
      values.push(
        requireString(req.body.name, 'name', { max: 200 })
      );
      fields.push(`name = $${values.length}`);
    }

    if (req.body.category !== undefined) {
      values.push(
        normalizeCategory(req.body.category, {
          field: 'category',
          allowLegacy: true,
        })
      );
      fields.push(`category = $${values.length}`);
    }

    if (req.body.latitude !== undefined) {
      values.push(
        optionalNumber(req.body.latitude, 'latitude', {
          min: -90,
          max: 90,
        })
      );
      fields.push(`latitude = $${values.length}`);
    }

    if (req.body.longitude !== undefined) {
      values.push(
        optionalNumber(req.body.longitude, 'longitude', {
          min: -180,
          max: 180,
        })
      );
      fields.push(`longitude = $${values.length}`);
    }

    if (!fields.length) {
      throw badRequest('No fields to update');
    }

    values.push(id);

    const { rows } = await pool.query(
      `update public.service_locations
       set ${fields.join(', ')}
       where id = $${values.length}
       returning *`,
      values
    );

    if (!rows[0]) throw notFound('Location not found');

    res.json({ data: rows[0] });
  })
);

// ADMIN ONLY: Delete location
router.delete(
  '/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);

    const { rows } = await pool.query(
      'delete from public.service_locations where id = $1 returning id',
      [id]
    );

    if (!rows[0]) throw notFound('Location not found');

    res.json({ data: { id: rows[0].id } });
  })
);

export default router;
