import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {PayParkingFeeCommand, handlePayParkingFee} from './PayParkingFeeCommand';

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/payparkingfee/{id}:
     *   post:
     *     tags: [Park and Pay]
     *     summary: Pay Parking Fee
     *     description: Pays the parking fee of an issued ticket. The fee is calculated and fixed at payment time.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Ticket id of the ticket to pay (events are stored in the single garage stream)
     *       - in: header
     *         name: correlation_id
     *         required: false
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [leftAt]
     *             properties:
     *               leftAt:
     *                 type: string
     *                 format: date-time
     *     responses:
     *       '201':
     *         description: Accepted — ParkingFeePaid appended
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 ok:
     *                   type: boolean
     *                 next_expected_stream_version:
     *                   type: string
     *                 last_event_global_position:
     *                   type: string
     *       '409':
     *         description: Ticket has not been issued / Ticket has already been paid
     *       '500':
     *         description: Server error
     */
    // Assumption: no auth in this scaffold (no requireUser available), so the endpoint is open.
    router.post('/api/payparkingfee/:id', async (req: Request, res: Response) => {
        const id = req.params.id;
        const correlationId = req.header('correlation_id') ?? id;
        try {
            const command: PayParkingFeeCommand = {
                type: 'PayParkingFee',
                data: {ticketId: id, leftAt: req.body.leftAt},
                metadata: {correlation_id: correlationId, causation_id: id},
            };
            const result = await handlePayParkingFee(id, command);
            res.set('correlation_id', correlationId);
            res.set('causation_id', id);
            return res.status(201).json({
                ok: true,
                next_expected_stream_version: result.nextExpectedStreamVersion?.toString(),
                last_event_global_position: result.lastEventGlobalPosition?.toString(),
            });
        } catch (err: any) {
            const msg = errorMapping(err?.code);
            if (msg) return res.status(409).json({error: msg});
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};

const errorMapping = (code: string): string | null => {
    switch (code) {
        case 'ticket_not_issued': return 'Ticket has not been issued';
        case 'already_paid': return 'Ticket has already been paid';
        default: return null;
    }
};
