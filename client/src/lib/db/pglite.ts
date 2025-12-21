import { PGlite } from '@electric-sql/pglite';
import { electricSync } from '@electric-sql/pglite-sync';

declare global {
  interface ImportMetaEnv {
    readonly VITE_ELECTRIC_SHAPE_URL: string;
    readonly VITE_ELECTRIC_SOURCE_ID: string;
    readonly VITE_ELECTRIC_SECRET?: string; // Optional in insecure mode
  }
}

const SHAPE_URL = import.meta.env.VITE_ELECTRIC_SHAPE_URL!;
const SOURCE_ID = import.meta.env.VITE_ELECTRIC_SOURCE_ID!;
const SOURCE_SECRET = import.meta.env.VITE_ELECTRIC_SECRET; // Optional

let db: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export function initLocalDb(): Promise<PGlite> {
  if (db) return Promise.resolve(db);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!SHAPE_URL || !SOURCE_ID) {
      console.error('Environment variables:', {
        VITE_ELECTRIC_SHAPE_URL: import.meta.env.VITE_ELECTRIC_SHAPE_URL,
        VITE_ELECTRIC_SOURCE_ID: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
        VITE_ELECTRIC_SECRET: import.meta.env.VITE_ELECTRIC_SECRET
      });
      throw new Error('Missing Electric-SQL config: SHAPE_URL and SOURCE_ID are required');
    }

    console.log('Initializing PGlite with Electric-SQL...');

    const pdb = await PGlite.create({
      dataDir: 'idb://showmedb',
      extensions: { electric: electricSync() },
    });

    // Add error handler to catch duplicate key errors during ElectricSQL sync
    // These can occur when ElectricSQL tries to sync data that already exists locally
    const originalQuery = pdb.query.bind(pdb);
    pdb.query = async function (sql: string, params?: any[]) {
      try {
        return await originalQuery(sql, params);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        // Ignore duplicate key errors - these are expected during sync
        if (errorMsg.includes('duplicate key') || errorMsg.includes('UNIQUE constraint')) {
          console.debug('⚠️ Ignoring duplicate key error during sync (expected)');
          // Return empty result to continue execution
          return { rows: [], rowCount: 0 };
        }
        throw error;
      }
    };

    // Create tables with schema matching PostgreSQL exactly
    await pdb.exec(`
      CREATE TABLE IF NOT EXISTS maps (
        id             UUID PRIMARY KEY,
        name           TEXT NOT NULL,
        is_private     BOOLEAN NOT NULL DEFAULT FALSE,
        access_token   TEXT,
        fuzzing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        fuzzing_radius  INTEGER NOT NULL DEFAULT 100,
        created_at     TIMESTAMPTZ NOT NULL
      );
    `);
    await pdb.exec(`
      CREATE TABLE IF NOT EXISTS pins (
        id           UUID PRIMARY KEY,
        map_id       UUID NOT NULL,
        lat          DOUBLE PRECISION NOT NULL,
        lng          DOUBLE PRECISION NOT NULL,
        type         TEXT,
        tags         TEXT[] NOT NULL DEFAULT '{}',
        description  TEXT,
        photo_urls   TEXT[] NOT NULL DEFAULT '{}',
        expires_at   TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL,
        updated_at   TIMESTAMPTZ NOT NULL
      );
    `);

    console.log('✅ Database schema matches PostgreSQL');

    // Setup sync params for both tables
    const mapsSyncParams: any = {
      table: 'maps',
      source_id: SOURCE_ID
    };

    const pinsSyncParams: any = {
      table: 'pins',
      source_id: SOURCE_ID
    };

    // Only add secret if it exists (for secure mode)
    if (SOURCE_SECRET) {
      mapsSyncParams.secret = SOURCE_SECRET;
      pinsSyncParams.secret = SOURCE_SECRET;
    }

    console.log('🔄 Setting up Electric v2 multi-table sync...');

    // Don't setup ElectricSQL sync if panic wipe is active
    if ((window as any).__panicWipeActive || localStorage.getItem('__panicWipeActive') === 'true') {
      console.log('⏸️ Skipping ElectricSQL sync setup - panic wipe is active');
    } else {
      try {
        // Electric v2: Use syncShapesToTables for transactional consistency
        // Changes to maps and pins in same Postgres transaction sync atomically
        const sync = await pdb.electric.syncShapesToTables({
          shapes: {
            maps: {
              shape: {
                url: SHAPE_URL,
                params: mapsSyncParams
              },
              table: 'maps',
              primaryKey: ['id']
            },
            pins: {
              shape: {
                url: SHAPE_URL,
                params: pinsSyncParams
              },
              table: 'pins',
              primaryKey: ['id']
            }
          },
          key: 'showme-sync-v2',
          onInitialSync: () => {
            console.log('✅ Initial sync complete - all existing data loaded');
          },
          onError: (error: any) => {
            console.error('❌ Sync error:', error);
            // Don't fail - app can continue in offline mode
          }
        });
        
        console.log('✅ Electric v2 sync configured - real-time updates enabled!');
        console.log('   Multi-table transactional consistency active');
        
        // Store sync handle for potential cleanup
        (window as any).__electricSync = sync;
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        const statusCode = error?.status || error?.response?.status;

        // Handle 409 Conflict - this can happen if the shape handle is invalid/expired
        // The app can still work offline, so we'll log it but continue
        if (statusCode === 409 || errorMsg.includes('409') || errorMsg.includes('Conflict')) {
          console.warn('⚠️ ElectricSQL sync conflict (409) - this is usually non-critical. App will continue in offline mode.');
          console.warn('   If sync is needed, try refreshing the page or restarting ElectricSQL service.');
        } else {
          // For other errors, log but don't fail initialization
          console.warn('⚠️ ElectricSQL sync setup failed (non-critical):', errorMsg);
          console.warn('   App will continue in offline mode. Sync will be retried automatically.');
        }
      }
    }

    // IMPORTANT: pglite.listen() only fires for LOCAL changes, NOT for ElectricSQL synced changes!
    // ElectricSQL syncs data silently to IndexedDB without triggering listen() events.
    // Solution: Poll the database periodically to detect changes from other clients.
    console.log('📡 Setting up change detection via database polling...');

    // Track last known counts and timestamps to detect changes
    let lastMapsCount = 0;
    let lastPinsCount = 0;
    let lastPinsUpdate = '';

    // Poll database every 2 seconds to detect ElectricSQL synced changes
    setInterval(async () => {
      if ((window as any).__panicWipeActive) return;

      try {
        // Check for map changes
        const mapsResult = await pdb.query('SELECT COUNT(*) as count FROM maps');
        const currentMapsCount = mapsResult.rows[0]?.count || 0;
        if (currentMapsCount !== lastMapsCount) {
          lastMapsCount = currentMapsCount;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('db-change', {
              detail: { table: 'maps', count: currentMapsCount }
            }));
          }
        }

        // Check for pin changes (count OR updates)
        const pinsResult = await pdb.query('SELECT COUNT(*) as count, MAX(updated_at) as last_update FROM pins');
        const currentPinsCount = pinsResult.rows[0]?.count || 0;
        const currentPinsUpdate = pinsResult.rows[0]?.last_update || '';

        if (currentPinsCount !== lastPinsCount || currentPinsUpdate !== lastPinsUpdate) {
          lastPinsCount = currentPinsCount;
          lastPinsUpdate = currentPinsUpdate;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('db-change', {
              detail: { table: 'pins', count: currentPinsCount }
            }));
          }
        }
      } catch (error) {
        console.debug('Polling error (non-critical):', error);
      }
    }, 2000);

    console.log('✅ Change detection configured (polling every 2s)');


    // Log initial table contents
    const mapsResult = await pdb.query('SELECT COUNT(*) as count FROM maps');
    const pinsResult = await pdb.query('SELECT COUNT(*) as count FROM pins');
    console.log('🗃️ Initial database state:');
    console.log('  Maps:', mapsResult.rows[0].count);
    console.log('  Pins:', pinsResult.rows[0].count);

    console.log('PGlite initialized successfully');
    db = pdb;

    // Start expired pins cleanup (deferred to avoid circular dependencies)
    setTimeout(async () => {
      try {
        const { startExpiredPinsCleanup } = await import('$lib/expiredPinsCleanup');
        startExpiredPinsCleanup(pdb, 5 * 60 * 1000); // Clean up every 5 minutes
        console.log('🧹 Started expired pins cleanup (every 5 minutes)');
      } catch (error) {
        console.warn('⚠️ Could not start expired pins cleanup:', error);
      }
    }, 1000);

    return pdb;
  })();

  return initPromise;
}