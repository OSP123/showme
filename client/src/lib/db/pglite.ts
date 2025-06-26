import { PGlite } from '@electric-sql/pglite';
import { electricSync } from '@electric-sql/pglite-sync';

// Here we use IndexedDB with relaxedDurability to improve performance
// https://pglite.dev/docs/filesystems#indexeddb-fs
// https://pglite.dev/benchmarks
// Unfortunately the OPFS filesystem does not work well with Safari yet,
// and also adds the complication of needing a service worker init.
const DB_URL = 'idb://showme';

// import dbSchema from '$schema.sql?raw';

// To prevent loading the PGLite database twice, we wrap the
// initDb function in a top-level singleton that guarantees
// initDb is only run once per session, no matter how many
// times the +layout.ts load() function is called
let dbPromise: ReturnType<typeof initDb> | null = null;
export function getDbOnce(): Promise<PGlite> {
	if (!dbPromise) {
		dbPromise = getDb();
	}
	return dbPromise;
}

// NOTE here I had the idea to create the db structure in advance,
// NOTE export the blob as part of the build, then import at every
// NOTE start. The problem is the output is about 4MB gzipped, so
// NOTE this isn't any better than attempting bootstrap each time.
export async function loadDbFromDump(dbUrl: string = DB_URL, dbDumpData: string | Blob | Uint8Array): Promise<PGlite> {
	console.warn('DB not initialized, loading from tarball...');
	// Can be from a URL in browser environment
	// e.g. import dbDumpUrl from '$migrations/init/pgdata.tar.gz?url';

	let dbDumpBlob: Blob;

	if (typeof window !== 'undefined' && typeof fetch === 'function' && typeof dbDumpData === 'string') {
		// Browser environment
		const response = await fetch(dbDumpData);
		dbDumpBlob = await response.blob();
	} else {
		// Node.js environment (Vitest, etc.)
		dbDumpBlob = dbDumpData instanceof Blob ? dbDumpData : new Blob([dbDumpData], { type: 'application/x-gzip' });
	}

	return new PGlite(dbUrl, {
		// debug: 1,
		username: 'showme',
		database: 'showme',
		loadDataDir: dbDumpBlob,
		relaxedDurability: true,
		extensions: {
			electric: electricSync(),
		},
	});
}

// Try to open existing DB and test schema, else initialise schema from scratch.
// The tradeoff is slower performance on, first load but then better performance
// every time after.
const getDb = async (): Promise<PGlite> => {
	if (dbPromise) {
		return dbPromise; // Return the existing promise if already in progress
	}

	dbPromise = (async () => {
		try {
			// Here we use IndexedDB with relaxedDurability to improve performance
			// https://pglite.dev/docs/filesystems#indexeddb-fs
			// https://pglite.dev/benchmarks
			// Unfortunately the OPFS filesystem does not work well with Safari yet,
			// and also adds the complication of needing a service worker init.
			const db = new PGlite(DB_URL, {
				username: 'showme',
				database: 'showme',
				relaxedDurability: true,
				extensions: {
					electric: electricSync(),
				},
				// debug: 2  // show postgres logs for easier debugging
			});

			const tableCheck = await db.query(`
				SELECT 1 FROM information_schema.tables
				WHERE table_name = 'task_events';
			`);

			if (tableCheck.rows.length !== 1) {
				const success = await cleanupIndexedDb('showme');
				if (!success) {
					console.warn('Failed to clear IndexedDB, attempting init anyway');
				}
				throw new Error('Database schema is not initialised yet. Re-creating.');
			}

			return db;
		} catch (e) {
			// return loadDbFromDump();
			return initDb();
		}
	})();

	return dbPromise;
};

async function cleanupIndexedDb(dbName: string): Promise<boolean> {
	return new Promise((resolve) => {
		const DBDeleteRequest = indexedDB.deleteDatabase(dbName);
		DBDeleteRequest.onerror = () => {
			console.error('The IndexedDB database could not be cleared!');
			resolve(false);
		};
		DBDeleteRequest.onsuccess = () => {
			console.log('Deleted existing database without valid schema.');
			resolve(true);
		};
	});
}

const initDb = async (): Promise<PGlite> => {
	// By default PGLite uses postgres user and database
	// We need to bootstrap by creating showme user and database
	// Then reconnect to the new db as the user
	console.warn('Database not initialized, creating schema...');

	const boostrapDb = new PGlite(DB_URL);
	await boostrapDb.query(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT * FROM pg_user where usename = 'showme'
			) THEN
				CREATE USER showme WITH PASSWORD 'showme';
				-- Required permission for copying from CSV
				GRANT pg_read_server_files TO showme;
			END IF;
		END $$;
	`);
	// Check if database exists (cannot use a DO block here)
	const res = await boostrapDb.query(`
		SELECT 1 FROM pg_database WHERE datname = 'showme';
	`);
	if (res.rows.length === 0) {
		await boostrapDb.query(`CREATE DATABASE showme OWNER showme;`);
	}

	const finalDb = new PGlite(DB_URL, {
		username: 'showme',
		database: 'showme',
		relaxedDurability: true,
		extensions: {
			electric: electricSync(),
		},
		// debug: 2,
	});

	// await finalDb.exec(`
	// 	${dbSchema}
	// `);

	return finalDb;
};
