import { resetTestDb } from './testDb';

resetTestDb();

import request from 'supertest';
import app from '../src/index';
import { closeDb } from '../src/db/db';

describe('API /api/candidates', () => {
  afterAll(() => {
    closeDb();
    resetTestDb();
  });

  it('crea un candidato', async () => {
    const res = await request(app).post('/api/candidates').send({ full_name: 'Juan Pérez', phone: '555-1234' });
    expect(res.status).toBe(201);
    expect(res.body.full_name).toBe('Juan Pérez');
  });

  it('rechaza crear un candidato sin nombre', async () => {
    const res = await request(app).post('/api/candidates').send({ phone: '555-1234' });
    expect(res.status).toBe(400);
  });

  it('lista candidatos', async () => {
    const res = await request(app).get('/api/candidates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
