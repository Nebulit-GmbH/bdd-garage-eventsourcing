import {join} from 'path';
import {migrateSqlite} from '../src/common/sqliteMigrationRunner';

async function main(): Promise<void> {
    const dbPath = process.env.SQLITE_DB_PATH ?? './data/app.db';
    console.log(`[migrate-sqlite] target: ${dbPath}`);
    const {applied} = await migrateSqlite(dbPath, [join(process.cwd(), 'migrations', 'sqlite')]);
    console.log(applied.length === 0 ? '[migrate-sqlite] already up to date' : `[migrate-sqlite] applied versions: ${applied.join(', ')}`);
}

main().catch((err) => {
    console.error('[migrate-sqlite] failed:', err);
    process.exit(1);
});
