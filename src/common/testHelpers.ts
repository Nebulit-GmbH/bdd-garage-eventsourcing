import {randomUUID} from 'crypto';
import {tmpdir} from 'os';
import {join} from 'path';
import {Database} from 'sqlite3';
import {migrateSqlite} from './sqliteMigrationRunner';

// Fresh temp SQLite file with the app schema applied, for use with SQLiteProjectionSpec.for({fileName}).
export async function createTestSqliteDb(): Promise<string> {
    const dbPath = join(tmpdir(), `sqlite-test-${randomUUID()}.db`);
    await migrateSqlite(dbPath, [join(process.cwd(), 'migrations', 'sqlite')]);

    // Switch the file to WAL once, awaited, before tests open it: emmett-sqlite issues PRAGMA journal_mode = WAL
    // on every new connection, which can intermittently fail on the very first one.
    await new Promise<void>((resolve, reject) => {
        const db = new Database(dbPath);
        db.run('PRAGMA journal_mode = WAL;', (err) => {
            if (err) { db.close(); reject(err); return; }
            db.close((closeErr) => (closeErr ? reject(closeErr) : resolve()));
        });
    });
    return dbPath;
}
