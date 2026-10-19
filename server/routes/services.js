import { Router } from 'express';
import { pool } from '../db.js';
import {
  asyncRoute,
  badRequest,
  notFound,
  optionalString,
  parseId,
  parseLimit,
  requireString,
} from '../lib/http.js';

const router = Router();

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { category, search, limit } = req.query;
    const filters = [];
    const values = [];

    if (category && category !== 'all') {
      values.push(String(category));
      filters.push(`category = $${values.length}`);
    }

    if (search) {
      values.push(`%${String(search).trim()}%`);
      filters.push(
        `(name ILIKE $${values.length} OR description ILIKE $${values.length} OR location ILIKE $${values.length})`
      );
    }

    values.push(parseLimit(limit));
    const where = filters.length ? `where ${filters.join(' and ')}` : '';
    const { rows } = await pool.query(
      `select id, name, category, description, location, created_at
       from public.services
       ${where}
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
    const { rows } = await pool.query('select * from public.services where id = $1', [id]);
    if (!rows[0]) throw notFound('Service not found');
    res.json({ data: rows[0] });
  })
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const name = requireString(req.body.name, 'name', { max: 200 });
    const category = requireString(req.body.category ?? 'government', 'category', { max: 40 });
    const description = optionalString(req.body.description, 'description', { max: 5000 });
    const location = optionalString(req.body.location, 'location', { max: 500 });

    const { rows } = await pool.query(
      `insert into public.services (name, category, description, location)
       values ($1, $2, $3, $4)
       returning *`,
      [name, category, description, location]
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
    if (req.body.description !== undefined) {
      values.push(optionalString(req.body.description, 'description', { max: 5000 }));
      fields.push(`description = $${values.length}`);
    }
    if (req.body.location !== undefined) {
      values.push(optionalString(req.body.location, 'location', { max: 500 }));
      fields.push(`location = $${values.length}`);
    }

    if (!fields.length) throw badRequest('No fields to update');

    values.push(id);
    const { rows } = await pool.query(
      `update public.services
       set ${fields.join(', ')}
       where id = $${values.length}
       returning *`,
      values
    );

    if (!rows[0]) throw notFound('Service not found');
    res.json({ data: rows[0] });
  })
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await pool.query(
      'delete from public.services where id = $1 returning id',
      [id]
    );
    if (!rows[0]) throw notFound('Service not found');
    res.json({ data: { id: rows[0].id } });
  })
);

export default router;
