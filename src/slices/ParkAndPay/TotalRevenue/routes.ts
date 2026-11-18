import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {getKnexInstance as getDb} from '../../../common/db';
import {TOTAL_ID, tableName} from './TotalRevenueProjection';

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/query/totalrevenue-collection:
     *   get:
     *     tags: [Park and Pay]
     *     summary: Total Revenue
     *     description: Total revenue from paid parking fees and lost ticket fees, with the number of payments.
     *     responses:
     *       '200':
     *         description: The TotalRevenue read model
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TotalRevenueReadModel'
     *       '500':
     *         description: Server error
     * components:
     *   schemas:
     *     TotalRevenueReadModel:
     *       type: object
     *       properties:
     *         totalRevenue:
     *           type: number
     *         payments:
     *           type: integer
     *           format: int32
     *         asOf:
     *           type: string
     *           format: date-time
     */
    // Assumption: no auth in this scaffold (no requireUser available), so the endpoint is open.
    router.get('/api/query/totalrevenue-collection', async (_req: Request, res: Response) => {
        try {
            const row = await getDb()(tableName).where({id: TOTAL_ID}).first();
            return res.status(200).json({
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
