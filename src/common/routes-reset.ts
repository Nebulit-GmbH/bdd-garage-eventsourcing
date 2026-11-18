import {Request, Response, Router} from 'express';
import {WebApiSetup} from '@event-driven-io/emmett-expressjs';
import {resetAllData} from './resetData';

export const api = (): WebApiSetup => (router: Router): void => {

    // Assumption: dev/demo helper, no auth in this scaffold. Destructive: deletes all events and read models.
    router.post('/api/reset', async (_req: Request, res: Response) => {
        try {
            await resetAllData();
            return res.status(200).json({ok: true});
        } catch (err) {
            console.error(err);
            return res.status(500).json({ok: false, error: 'Server error'});
        }
    });
};
