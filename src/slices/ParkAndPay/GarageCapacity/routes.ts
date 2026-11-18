import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {queryGarageCapacity} from './GarageCapacityReadModel';

export const api = (): WebApiSetup => (router: Router): void => {

    /**
     * @openapi
     * /api/query/garagecapacity-collection:
     *   get:
     *     tags: [Park and Pay]
     *     summary: Garage Capacity
     *     description: Garage capacity, cars currently in the garage and free spots.
     *     responses:
     *       '200':
     *         description: The GarageCapacity read model
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/GarageCapacityReadModel'
     *       '500':
     *         description: Server error
     * components:
     *   schemas:
     *     GarageCapacityReadModel:
     *       type: object
     *       properties:
     *         capacity: {type: integer, format: int32}
     *         carsInGarage: {type: integer, format: int32}
     *         freeSpots: {type: integer, format: int32}
     */
    // Assumption: no auth in this scaffold; freeSpots may be negative if capacity was lowered below occupancy.
    router.get('/api/query/garagecapacity-collection', async (_req: Request, res: Response) => {
        try {
            return res.status(200).json(await queryGarageCapacity());
        } catch (err) {
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};
