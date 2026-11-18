import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {ReportLostTicketCommand, handleReportLostTicket} from './ReportLostTicketCommand';

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/reportlostticket/{id}:
     *   post:
     *     tags: [Park and Pay]
     *     summary: Report Lost Ticket
     *     description: A car or motorbike without a ticket pays the flat daily fee (CAR 14.00, MOTORBIKE 7.00).
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Stream id this command is applied to
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
     *             required: [licensePlate, vehicleType, leftAt]
     *             properties:
     *               licensePlate:
     *                 type: string
     *               vehicleType:
     *                 type: string
     *               leftAt:
     *                 type: string
     *                 format: date-time
     *     responses:
     *       '201':
     *         description: Accepted — LostTicketFeeCharged appended
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
     *       '500':
     *         description: Server error
     */
    // Assumption: no auth in this scaffold (no requireUser available), so the endpoint is open.
    router.post('/api/reportlostticket/:id', async (req: Request, res: Response) => {
        const id = req.params.id;
        const correlationId = req.header('correlation_id') ?? id;
        try {
            const command: ReportLostTicketCommand = {
                type: 'ReportLostTicket',
                data: {
                    licensePlate: req.body.licensePlate,
                    vehicleType: req.body.vehicleType,
                    leftAt: req.body.leftAt,
                },
                metadata: {correlation_id: correlationId, causation_id: id},
            };
            const result = await handleReportLostTicket(id, command);
            res.set('correlation_id', correlationId);
            res.set('causation_id', id);
            return res.status(201).json({
                ok: true,
                next_expected_stream_version: result.nextExpectedStreamVersion?.toString(),
                last_event_global_position: result.lastEventGlobalPosition?.toString(),
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};
