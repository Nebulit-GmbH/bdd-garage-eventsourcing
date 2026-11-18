import {handleProjections, sqliteConnection, type SQLiteProjectionDefinition} from "@event-driven-io/emmett-sqlite";
import {glob} from "glob";
import path from "path";
import {getKnexInstance, parseJsonColumn, sqliteDbPath} from "./db";

const slicesRoot = path.resolve(__dirname, '../slices');
const BATCH = 500;

// Re-runs one projection over every stored event, in global order. Note: handlers run again on top of the
// existing read-model rows (no truncate), so non-idempotent projections such as TotalRevenue count twice.
export const replayProjection = async (projectionName: string): Promise<void> => {
    const [filePath] = await glob(`**/${projectionName}.{ts,js}`, {cwd: slicesRoot, absolute: true});
    if (!filePath) throw new Error(`Projection not found: ${projectionName}`);

    const projection: SQLiteProjectionDefinition = (await import(filePath))[projectionName];
    const connection = sqliteConnection({fileName: sqliteDbPath});
    await connection.command('PRAGMA busy_timeout = 15000;');
    try {
        let after = 0;
        for (;;) {
            const rows = await getKnexInstance()('emt_messages')
                .where('global_position', '>', after).andWhere({is_archived: 0, message_kind: 'E'})
                .orderBy('global_position').limit(BATCH);
            if (rows.length === 0) break;
            const handled = rows.filter((r: any) => projection.canHandle.includes(r.message_type));
            if (handled.length) await handleProjections({
                connection,
                projections: [projection],
                events: handled.map((r: any) => ({
                    type: r.message_type,
                    data: parseJsonColumn(r.message_data),
                    metadata: {
                        ...(parseJsonColumn(r.message_metadata) as object),
                        messageId: r.message_id,
                        streamName: r.stream_id,
                        streamPosition: BigInt(r.stream_position),
                        globalPosition: BigInt(r.global_position),
                    },
                })) as any,
            });
            after = rows[rows.length - 1].global_position;
        }
    } finally {
        connection.close();
    }
};
