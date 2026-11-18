import {getKnexInstance} from './db';

export const DEFAULT_GARAGE_CAPACITY = 1;

// Assumption: capacity is operational configuration (one row in garage_settings), not an event-sourced fact.
export const getGarageCapacity = async (): Promise<number> => {
    const row = await getKnexInstance()('garage_settings').where({id: 1}).first();
    return row ? Number(row.capacity) : DEFAULT_GARAGE_CAPACITY;
};

export const setGarageCapacity = async (capacity: number): Promise<void> => {
    await getKnexInstance().raw(
        `INSERT INTO garage_settings (id, capacity) VALUES (1, ?)
         ON CONFLICT (id) DO UPDATE SET capacity = excluded.capacity`,
        [capacity],
    );
};
