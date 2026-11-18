import {Request, Response, Router} from 'express';
import {WebApiSetup} from "@event-driven-io/emmett-expressjs";
import {getKnexInstance, parseJsonColumn} from "./db";

export const api =
    (): WebApiSetup =>
        (router: Router): void => {

            /**
             * @openapi
             * /api/events:
             *   get:
             *     tags: [Events]
             *     summary: Read all events (rows of emt_messages), newest first
             *     security: []
             *     parameters:
             *       - {in: query, name: streamId, schema: {type: string}, description: Only this stream}
             *       - {in: query, name: afterPosition, schema: {type: string}, description: Only events with a higher global position}
             *       - {in: query, name: limit, schema: {type: integer}, description: Max number of events (default - all)}
             *     responses:
             *       200:
             *         description: "{events: [{globalPosition, streamId, streamPosition, type, kind, archived, data, metadata, created}]}"
             */
            router.get('/api/events', async (req: Request, res: Response) => {
                const limit = req.query.limit ? Math.max(parseInt(String(req.query.limit), 10) || 1, 1) : null;
                const streamId = req.query.streamId ? String(req.query.streamId) : null;
                const after = req.query.afterPosition ? String(req.query.afterPosition) : null;
                try {
                    const q = getKnexInstance()('emt_messages').select({
                        globalPosition: getKnexInstance().raw('CAST(global_position AS TEXT)'),
                        streamId: 'stream_id',
                        streamPosition: getKnexInstance().raw('CAST(stream_position AS TEXT)'),
                        type: 'message_type',
                        kind: 'message_kind',
                        archived: 'is_archived',
                        data: 'message_data',
                        metadata: 'message_metadata',
                        created: 'created',
                    }).orderBy('global_position', 'desc');
                    if (streamId) q.where('stream_id', streamId);
                    if (after) q.where('global_position', '>', Number(after));
                    if (limit) q.limit(limit);
                    // SQLite hands JSON columns back as TEXT, and booleans as 0/1.
                    const rows = (await q).map((r: any) => ({
                        ...r,
                        archived: Boolean(r.archived),
                        data: parseJsonColumn(r.data),
                        metadata: parseJsonColumn(r.metadata),
                    }));
                    // The UI matches on human-readable event names ("Parking Fee Paid"); stored types are PascalCase.
                    const events = rows.map((r: {type: string}) => ({...r, type: r.type.replace(/([a-z])([A-Z])/g, '$1 $2')}));
                    return res.json({events});
                } catch (err: any) {
                    console.error(err);
                    return res.status(500).json({error: 'Server error'});
                }
            });
        };
