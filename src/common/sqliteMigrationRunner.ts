import {readdirSync, readFileSync} from 'fs';
import {join} from 'path';
import {Database} from 'sqlite3';

// PB - Flyway can technically target SQLite (bundled JDBC driver), but pulling in a JVM purely to
// migrate one SQLite file undercuts the point of the on-prem target: no extra services beyond the
// Node backend and the PocketBase binary. This is a small dedicated runner instead, tracking applied
// versions in a schema_migrations table inside the same SQLite file.

const VERSION_PATTERN = /^V(\d+)__.+\.sql$/;

type MigrationFile = {
    version: number;
    fileName: string;
    fullPath: string;
};

function collectMigrations(dirs: string[]): MigrationFile[] {
    const migrations: MigrationFile[] = [];
    for (const dir of dirs) {
        let entries: string[];
        try {
            entries = readdirSync(dir);
        } catch {
            continue;
        }
        for (const fileName of entries) {
            const match = VERSION_PATTERN.exec(fileName);
            if (!match) continue;
            migrations.push({version: parseInt(match[1], 10), fileName, fullPath: join(dir, fileName)});
        }
    }
    const byVersion = new Map<number, MigrationFile>();
    for (const migration of migrations) {
        const existing = byVersion.get(migration.version);
        if (existing) {
            throw new Error(`Duplicate migration version V${migration.version}: ${existing.fullPath} and ${migration.fullPath}`);
        }
        byVersion.set(migration.version, migration);
    }
    return [...byVersion.values()].sort((a, b) => a.version - b.version);
}

function run(db: Database, sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, (err) => (err ? reject(err) : resolve()));
    });
}

function exec(db: Database, sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });
}

function all<T>(db: Database, sql: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
    });
}

function close(db: Database): Promise<void> {
    return new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
    });
}

export async function migrateSqlite(dbPath: string, migrationDirs: string[]): Promise<{applied: number[]}> {
    const migrations = collectMigrations(migrationDirs);
    // PB - a correctly configured migration root always ships at least the baseline schema; finding
    // zero files here means the directories were resolved incorrectly (e.g. a __dirname-relative path
    // that breaks once compiled), not a legitimate "nothing to do" state. Fail loudly rather than
    // silently booting against an empty schema.
    if (migrations.length === 0) {
        throw new Error(`No migration files found in any of: ${migrationDirs.join(', ')}`);
    }
    const db = new Database(dbPath);

    try {
        await run(db, `
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version    INTEGER PRIMARY KEY,
                file_name  TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            )
        `);

        const appliedRows = await all<{version: number}>(db, 'SELECT version FROM schema_migrations');
        const appliedVersions = new Set(appliedRows.map(r => r.version));

        const applied: number[] = [];
        for (const migration of migrations) {
            if (appliedVersions.has(migration.version)) continue;
            const sql = readFileSync(migration.fullPath, 'utf8');
            await exec(db, sql);
            await run(db, 'INSERT INTO schema_migrations (version, file_name) VALUES (?, ?)', [migration.version, migration.fileName]);
            applied.push(migration.version);
        }

        return {applied};
    } finally {
        // PB - awaited: an un-awaited close() can race a caller that immediately reopens the same
        // file (e.g. SQLiteProjectionSpec.for() in tests), occasionally surfacing as "cannot change
        // into wal mode from within a transaction" on the new connection.
        await close(db);
    }
}
