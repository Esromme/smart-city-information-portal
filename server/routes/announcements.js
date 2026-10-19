import { Router } from 'express';
import { pool } from '../db.js';
import {
  asyncRoute,
  badRequest,
  notFound,
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
      filters.push(`(title ILIKE $${values.length} OR content ILIKE $${values.length})`);
    }

    values.push(parseLimit(limit));
    const where = filters.length ? `where ${filters.join(' and ')}` : '';
    const { rows } = await pool.query(
      `select id, title, content, category, published_at
       from public.announcements
       ${where}
       order by published_at desc, id desc
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
    const { rows } = await pool.query('select * from public.announcements where id = $1', [id]);
    if (!rows[0]) throw notFound('Announcement not found');
    res.json({ data: rows[0] });
  })
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const title = requireString(req.body.title, 'title', { max: 200 });
    const content = requireString(req.body.content, 'content', { max: 10000 });
    const category = requireString(req.body.category ?? 'community', 'category', { max: 40 });

    const { rows } = await pool.query(
      `insert into public.announcements (title, content, category)
       values ($1, $2, $3)
       returning *`,
      [title, content, category]
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

    if (req.body.title !== undefined) {
      values.push(requireString(req.body.title, 'title', { max: 200 }));
      fields.push(`title = $${values.length}`);
    }
    if (req.body.content !== undefined) {
      values.push(requireString(req.body.content, 'content', { max: 10000 }));
      fields.push(`content = $${values.length}`);
    }
    if (req.body.category !== undefined) {
      values.push(requireString(req.body.category, 'category', { max: 40 }));
      fields.push(`category = $${values.length}`);
    }

    if (!fields.length) throw badRequest('No fields to update');

    values.push(id);
    const { rows } = await pool.query(
      `update public.announcements
       set ${fields.join(', ')}
       where id = $${values.length}
       returning *`,
      values
    );

    if (!rows[0]) throw notFound('Announcement not found');
    res.json({ data: rows[0] });
  })
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await pool.query(
      'delete from public.announcements where id = $1 returning id',
      [id]
    );
    if (!rows[0]) throw notFound('Announcement not found');
    res.json({ data: { id: rows[0].id } });
  })
);

export default router;
