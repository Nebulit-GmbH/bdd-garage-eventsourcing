import knex, {Knex} from "knex";

export const sqliteDbPath = process.env.SQLITE_DB_PATH ?? './data/app.db';

let knexInstance: Knex | null = null;

// One physical connection makes Knex's pool a strict FIFO queue, so writes run in request order instead of
// racing each other (and the event store's own connection on the same file) for SQLite's single write lock.
export const getKnexInstance = (): Knex => {
    if (!knexInstance) {
        knexInstance = knex({
            client: 'sqlite3',
            connection: {filename: sqliteDbPath},
            useNullAsDefault: true,
            pool: {
                min: 1,
                max: 1,
                afterCreate: (conn: {run: (sql: string, cb: (err: Error | null) => void) => void}, done: (err: Error | null, conn: unknown) => void) =>
                    conn.run('PRAGMA busy_timeout = 15000;', err => done(err, conn)),
            },
        });
    }
    return knexInstance;
};

export const closeDb = async (): Promise<void> => {
    await knexInstance?.destroy();
    knexInstance = null;
};

// SQLite returns JSON columns (emt_messages.message_data/message_metadata) as raw TEXT.
export const parseJsonColumn = (value: unknown): unknown => {
    if (typeof value !== 'string') return value ?? null;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};
