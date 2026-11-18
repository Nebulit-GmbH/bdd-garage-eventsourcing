import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {ChangeGarageCapacityCommand, handleChangeGarageCapacity} from './ChangeGarageCapacityCommand';

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/changegaragecapacity/{id}:
     *   post:
     *     tags: [Park and Pay]
     *     summary: Change Garage Capacity
     *     description: Sets the number of parking spots in the garage.
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
     *             required: [capacity]
     *             properties:
     *               capacity:
     *                 type: integer
     *                 format: int32
     *                 example: 60
     *     responses:
     *       '201':
     *         description: Accepted — GarageCapacityChanged appended
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
     *         description: capacity must be a positive integer
     *       '500':
     *         description: Server error
     */
    // Assumption: no auth in this scaffold (no requireUser available), so the endpoint is open.
    router.post('/api/changegaragecapacity/:id', async (req: Request, res: Response) => {
        const id = req.params.id;
        const correlationId = req.header('correlation_id') ?? id;
        try {
            const command: ChangeGarageCapacityCommand = {
                type: 'ChangeGarageCapacity',
                data: {capacity: req.body.capacity},
                metadata: {correlation_id: correlationId, causation_id: id},
            };
            const result = await handleChangeGarageCapacity(id, command);
            res.set('correlation_id', correlationId);
            res.set('causation_id', id);
            return res.status(201).json({
                ok: true,
                next_expected_stream_version: result.nextExpectedStreamVersion?.toString(),
                last_event_global_position: result.lastEventGlobalPosition?.toString(),
            });
        } catch (err: any) {
            if (err?.code === 'invalid_capacity') {
                return res.status(409).json({error: err.message});
            }
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};
