import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {getKnexInstance as getDb} from '../../../common/db';
import {tableName} from './CarsInGarageProjection';

const toLocalIso = (d: Date | string) =>
    (d instanceof Date ? d.toISOString() : String(d)).replace(/\.\d+Z$/, '').replace(/Z$/, '');

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/query/carsingarage-collection:
     *   get:
     *     tags: [Park and Pay]
     *     summary: Cars in Garage
     *     description: All cars currently in the garage (issued a ticket, not yet paid).
     *     responses:
     *       '200':
     *         description: The CarsInGarage read model
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/CarsInGarageReadModel'
     *       '500':
     *         description: Server error
     * components:
     *   schemas:
     *     CarsInGarageReadModel:
     *       type: object
     *       properties:
     *         ticketId: {type: string}
     *         licensePlate: {type: string}
     *         vehicleType: {type: string}
     *         enteredAt: {type: string, format: date-time}
     */
    // Assumption: no auth in this scaffold; ordered by entry time.
    router.get('/api/query/carsingarage-collection', async (_req: Request, res: Response) => {
        try {
            const rows = await getDb()(tableName).orderBy('entered_at');
            return res.status(200).json(rows.map((r: any) => ({
                ticketId: r.ticket_id,
                licensePlate: r.license_plate,
                vehicleType: r.vehicle_type,
                enteredAt: toLocalIso(r.entered_at),
            })));
        } catch (err) {
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};
