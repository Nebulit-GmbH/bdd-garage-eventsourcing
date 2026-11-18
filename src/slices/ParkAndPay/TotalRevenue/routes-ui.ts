import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {getKnexInstance as getDb} from '../../../common/db';
import {TOTAL_ID, tableName} from './TotalRevenueProjection';

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/query/totalrevenue:
     *   get:
     *     tags: [Park and Pay]
     *     summary: Total revenue projection ({totalRevenue, payments}), used by the garage UI
     */
    router.get('/api/query/totalrevenue', async (_req: Request, res: Response) => {
        try {
            const row = await getDb()(tableName).where({id: TOTAL_ID}).first();
            return res.json({
                totalRevenue: row ? Number(row.total_revenue) : 0,
                payments: row ? row.payments : 0,
                asOf: row ? row.as_of : new Date().toISOString(),
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};
