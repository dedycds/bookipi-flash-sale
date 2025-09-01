import request, { Response } from 'supertest';
import pool from '../../src/db/connection';
import { FLASH_SALE_ID, PRODUCT_ID } from '../../src/globals';

beforeAll(() => {});

describe('GET /sales', () => {
    it('should return 200 and JSON body', async () => {
        const res = await request('http://localhost:8001')
            .get('/sales')
            .expect('Content-Type', /json/)
            .expect(200);
        expect(res.body).toBeDefined();
    });
});

describe('POST /sales/update', () => {
    const start_date = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const end_date = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const quantity = 100;
    let res: Response;

    beforeAll(async () => {
        res = await request('http://localhost:8001').post('/sales/update').send({
            start_date,
            end_date,
            quantity,
        });
    });
    it('should return 200 and updated data', async () => {
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject(
            expect.objectContaining({
                start_date,
                end_date,
                product_id: PRODUCT_ID,
                flash_sale_id: FLASH_SALE_ID,
                quantity,
            })
        );

        // check redis
    });

    it('should update db correctly', async () => {
        // check databse
        const dbResult = await pool.query(
            `SELECT
                fs.flash_sale_id,
                fs.start_date,
                fs.end_date
            FROM flash_sales fs
            WHERE fs.product_id = $1
            LIMIT 1`,
            [PRODUCT_ID]
        );

        expect(dbResult.rows[0]).toMatchObject({
            flash_sale_id: FLASH_SALE_ID,
            start_date: start_date,
            end_date: end_date,
        });
    });
});
