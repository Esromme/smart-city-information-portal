import { Router } from 'express';
import { pool } from '../db.js';
import {
  asyncRoute,
  badRequest,
  notFound,
  optionalNumber,
  parseId,
  parseLimit,
  requireString,
} from '../lib/http.js';

const router = Router();

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { category, limit } = req.query;
    const filters = ['latitude is not null', 'longitude is not null'];
    const values = [];

    if (category && category !== 'all') {
      values.push(String(category));
      filters.push(`category = $${values.length}`);
    }

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

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await pool.query('select * from public.service_locations where id = $1', [id]);
    if (!rows[0]) throw notFound('Location not found');
    res.json({ data: rows[0] });
  })
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const name = requireString(req.body.name, 'name', { max: 200 });
    const category = requireString(req.body.category ?? 'government', 'category', { max: 40 });
    const latitude = optionalNumber(req.body.latitude, 'latitude', { min: -90, max: 90 });
    const longitude = optionalNumber(req.body.longitude, 'longitude', { min: -180, max: 180 });

    const { rows } = await pool.query(
      `insert into public.service_locations (name, category, latitude, longitude)
       values ($1, $2, $3, $4)
       returning *`,
      [name, category, latitude, longitude]
    );

    res.status(201).json({ data: rows[0] });
  })
);

router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    const fields = [];
    const values = [];

    if (req.body.name !== undefined) {
      values.push(requireString(req.body.name, 'name', { max: 200 }));
      fields.push(`name = $${values.length}`);
    }
    if (req.body.category !== undefined) {
      values.push(requireString(req.body.category, 'category', { max: 40 }));
      fields.push(`category = $${values.length}`);
    }
    if (req.body.latitude !== undefined) {
      values.push(optionalNumber(req.body.latitude, 'latitude', { min: -90, max: 90 }));
      fields.push(`latitude = $${values.length}`);
    }
    if (req.body.longitude !== undefined) {
      values.push(optionalNumber(req.body.longitude, 'longitude', { min: -180, max: 180 }));
      fields.push(`longitude = $${values.length}`);
    }

    if (!fields.length) throw badRequest('No fields to update');

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

router.delete(
  '/:id',
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
