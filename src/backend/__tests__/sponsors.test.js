const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
jest.mock('../models', () => ({
    sequelize: new (require('sequelize').Sequelize)('sqlite::memory:', { logging: false }),
}));
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) =>
        req.headers.authorization ? next() : res.sendStatus(401),
    requirePermission: () => (req, res, next) =>
        req.headers.authorization === 'admin' ? next() : res.sendStatus(403),
}));
const { sequelize } = require('../models');
const app = express();
app.use(express.json());
app.use('/sponsors', require('../routes/sponsors'));
const event = {
    eventId: randomUUID(),
    creativeId: 'easywallet-banner',
    type: 'impression',
    visitorId: randomUUID(),
    pageViewId: randomUUID(),
};
beforeAll(async () => {
    const sql = fs.readFileSync(
        path.join(__dirname, '../database/migrations/017_sponsor_events.sql'),
        'utf8',
    );
    for (const statement of sql.split(';').filter((s) => s.trim()))
        await sequelize.query(statement);
});
afterAll(() => sequelize.close());
it('rejects invalid payloads and protects reports', async () => {
    expect(
        (
            await request(app)
                .post('/sponsors/events')
                .send({ ...event, creativeId: 'arbitrary' })
        ).status,
    ).toBe(400);
    expect((await request(app).get('/sponsors/stats')).status).toBe(401);
    expect((await request(app).get('/sponsors/stats').set('Authorization', 'member')).status).toBe(
        403,
    );
    expect(
        (
            await request(app)
                .get('/sponsors/stats?from=2026-02-30&to=2026-03-01')
                .set('Authorization', 'admin')
        ).status,
    ).toBe(400);
});
it('persists and deduplicates events and campaign visitors across creatives', async () => {
    for (const payload of [
        event,
        event,
        { ...event, eventId: randomUUID() },
        { ...event, eventId: randomUUID(), creativeId: 'easywallet-details' },
        { ...event, eventId: randomUUID(), type: 'open' },
    ]) {
        expect((await request(app).post('/sponsors/events').send(payload)).status).toBe(204);
    }
    const result = await request(app)
        .get('/sponsors/stats?from=2020-01-01&to=2099-01-01')
        .set('Authorization', 'admin');
    expect(result.status).toBe(200);
    expect(result.body.total).toEqual({ impressions: 2, visitors: 1, opens: 1 });
    expect(result.body.creatives.find((row) => row.id === 'easywallet-coupons').impressions).toBe(
        0,
    );
});
it('uses Taipei midnight boundaries', async () => {
    await sequelize.query("UPDATE sponsor_events SET created_at = '2026-10-06T16:00:00.000Z'");
    const get = (day) =>
        request(app).get(`/sponsors/stats?from=${day}&to=${day}`).set('Authorization', 'admin');
    expect((await get('2026-10-06')).body.total.impressions).toBe(0);
    expect((await get('2026-10-07')).body.total.impressions).toBe(2);
});
