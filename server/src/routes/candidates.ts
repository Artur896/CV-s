import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/db';
import { asyncHandler } from '../middleware/errorHandler';
import { Candidate } from '../types';

export const candidatesRouter = Router();

candidatesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await dbAll('SELECT * FROM candidates ORDER BY created_at DESC');
    res.json(rows);
  })
);

candidatesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await dbGet('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
    if (!row) {
      res.status(404).json({ error: 'Candidato no encontrado' });
      return;
    }
    res.json(row);
  })
);

candidatesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { full_name, phone, notes } = req.body as Partial<Candidate>;
    if (!full_name || !full_name.trim()) {
      res.status(400).json({ error: 'full_name es requerido' });
      return;
    }

    const id = uuidv4();
    await dbRun(`INSERT INTO candidates (id, full_name, phone, notes) VALUES (?, ?, ?, ?)`, [
      id,
      full_name.trim(),
      phone || null,
      notes || null
    ]);

    const created = await dbGet('SELECT * FROM candidates WHERE id = ?', [id]);
    res.status(201).json(created);
  })
);

candidatesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { full_name, phone, notes } = req.body as Partial<Candidate>;
    const existing = await dbGet<Candidate>('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Candidato no encontrado' });
      return;
    }

    await dbRun(`UPDATE candidates SET full_name = ?, phone = ?, notes = ? WHERE id = ?`, [
      full_name || existing.full_name,
      phone ?? null,
      notes ?? null,
      req.params.id
    ]);

    const updated = await dbGet('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
    res.json(updated);
  })
);
