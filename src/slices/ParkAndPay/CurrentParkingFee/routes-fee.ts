import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {getKnexInstance as getDb} from '../../../common/db';
import {tableName} from './CurrentParkingFeeProjection';
import {calculateFee} from './feeCalculator';

// entered_at is a TIMESTAMP (wall-clock, no zone). pg parses it as server-local time into a Date, so read it back
// with local getters; toISOString() would shift it by the server's UTC offset and inflate the running fee.
const pad = (n: number) => String(n).padStart(2, '0');
const toLocalIso = (d: Date | string) =>
    d instanceof Date
        ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        : String(d).replace(/\.\d+Z$/, '').replace(/Z$/, '');

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/fee:
     *   get:
     *     tags: [Park and Pay]
     *     summary: Running fee of a ticket at a given (simulated) time, priced from the CurrentParkingFee projection
     *     parameters:
     *       - {in: query, name: ticketId, required: true, schema: {type: string}}
     *       - {in: query, name: at, required: true, schema: {type: string}}
     *     responses:
     *       '200': {description: "{amount, currency, display, exit}"}
     *       '404': {description: Ticket not (yet) in projection}
     */
    router.get('/api/fee', async (req: Request, res: Response) => {
        const ticketId = String(req.query.ticketId ?? '');
        const at = String(req.query.at ?? '');
        if (!ticketId || !at) return res.status(400).json({ok: false, error: 'ticketId and at are required'});
        try {
            const row = await getDb()(tableName).where({ticket_id: ticketId}).first();
            if (!row) return res.status(404).json({ok: false, error: 'ticket not (yet) in projection'});
            const amount = calculateFee(row.vehicle_type, toLocalIso(row.entered_at), at);
            return res.json({exit: at, amount, currency: 'EUR', display: amount.toFixed(2), source: 'projection'});
        } catch (err) {
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};
