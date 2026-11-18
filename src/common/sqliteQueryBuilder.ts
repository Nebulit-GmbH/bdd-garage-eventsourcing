import knex, {Knex} from 'knex';

// PB - shared query-compiling-only Knex instance for SQLite raw-SQL projections. Only `.toQuery()`
// (a synchronous local SQL-string compile) is ever called on it — it never opens a real connection —
// because SQLiteProjectionHandlerContext (unlike the Postgres one) has no connectionString to build a
// real per-call Knex client from, only a SQLiteConnection object with command/query methods.
let builder: Knex | null = null;

export const sqliteQueryBuilder = (): Knex => {
    if (!builder) {
        builder = knex({client: 'sqlite3', useNullAsDefault: true, connection: {filename: ':memory:'}});
    }
    return builder;
};
