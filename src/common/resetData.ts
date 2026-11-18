import {getKnexInstance} from './db';

// Event store tables and every read-model table. Schema, migrations history and projection registrations stay.
const TABLES_TO_CLEAR = [
    'emt_messages',
    'emt_streams',
    'total_revenue',
    'current_parking_fee',
    'cars_in_garage',
];
const DEFAULT_CAPACITY = 1;

// Destructive: deletes all events and read models and restores the default garage capacity.
export async function resetAllData(): Promise<void> {
    await getKnexInstance().transaction(async trx => {
        for (const table of TABLES_TO_CLEAR) await trx(table).delete();
        await trx.raw(
            `INSERT INTO garage_settings (id, capacity) VALUES (1, ?)
             ON CONFLICT (id) DO UPDATE SET capacity = excluded.capacity`,
            [DEFAULT_CAPACITY],
        );
    });
}
