import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {getKnexInstance as getDb} from '../../../common/db';
import {tableName} from './CurrentParkingFeeProjection';
import {calculateFee} from './feeCalculator';

const toLocalIso = (d: Date | string) =>
    (d instanceof Date ? d.toISOString() : String(d)).replace(/\.\d+Z$/, '').replace(/Z$/, '');

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/query/currentparkingfee-collection:
     *   get:
     *     tags: [Park and Pay]
     *     summary: Current Parking Fee
     *     description: Running parking fee of a ticket as of now (or the optional asOf time).
     *     parameters:
     *       - in: query
     *         name: ticketId
     *         required: true
     *         schema: {type: string}
     *       - in: query
     *         name: asOf
     *         required: false
     *         schema: {type: string, format: date-time}
     *     responses:
     *       '200':
     *         description: The CurrentParkingFee read model
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CurrentParkingFeeReadModel'
     *       '404':
     *         description: Unknown ticket
     *       '500':
     *         description: Server error
     * components:
     *   schemas:
     *     CurrentParkingFeeReadModel:
     *       type: object
     *       properties:
     *         ticketId: {type: string}
     *         licensePlate: {type: string}
     *         vehicleType: {type: string}
     *         enteredAt: {type: string, format: date-time}
     *         asOf: {type: string, format: date-time}
     *         currentFee: {type: number}
     */
    // Assumption: no auth in this scaffold; times are local wall-clock, asOf defaults to server now.
    router.get('/api/query/currentparkingfee-collection', async (req: Request, res: Response) => {
        try {
            const ticketId = String(req.query.ticketId ?? '');
            if (!ticketId) return res.status(400).json({ok: false, error: 'ticketId required'});
            const row = await getDb()(tableName).where({ticket_id: ticketId}).first();
            if (!row) return res.status(404).json({ok: false, error: 'Unknown ticket'});
            const enteredAt = toLocalIso(row.entered_at);
            const asOf = req.query.asOf ? String(req.query.asOf) : toLocalIso(new Date());
            return res.status(200).json({
                ticketId: row.ticket_id,
                licensePlate: row.license_plate,
                vehicleType: row.vehicle_type,
                enteredAt,
                asOf,
                currentFee: calculateFee(row.vehicle_type, enteredAt, asOf),
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};
