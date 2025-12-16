import { Transaction, PGliteInterface } from '@electric-sql/pglite';
import { ChangeMessage, ShapeStreamOptions, ShapeStreamInterface, Row } from '@electric-sql/client';

type Lsn = bigint;
type MapColumnsMap = Record<string, string>;
type MapColumnsFn = (message: ChangeMessage<any>) => Record<string, any>;
type MapColumns = MapColumnsMap | MapColumnsFn;
type SubscriptionKey = string;
type InitialInsertMethod = 'insert' | 'csv' | 'json' | 'useCopy';
interface ShapeToTableOptions {
    shape: ShapeStreamOptions;
    table: string;
    schema?: string;
    mapColumns?: MapColumns;
    primaryKey: string[];
    onMustRefetch?: (tx: Transaction) => Promise<void>;
}
interface SyncShapesToTablesOptions {
    key: string | null;
    shapes: Record<string, ShapeToTableOptions>;
    useCopy?: boolean;
    initialInsertMethod?: InitialInsertMethod;
    onInitialSync?: () => void;
}
interface SyncShapesToTablesResult {
    unsubscribe: () => void;
    readonly isUpToDate: boolean;
    streams: Record<string, ShapeStreamInterface<Row<unknown>>>;
}
interface SyncShapeToTableOptions {
    shape: ShapeStreamOptions;
    table: string;
    schema?: string;
    mapColumns?: MapColumns;
    primaryKey: string[];
    shapeKey: string | null;
    useCopy?: boolean;
    initialInsertMethod?: InitialInsertMethod;
    onInitialSync?: () => void;
    onMustRefetch?: (tx: Transaction) => Promise<void>;
}
interface SyncShapeToTableResult {
    unsubscribe: () => void;
    readonly isUpToDate: boolean;
    stream: ShapeStreamInterface<Row<unknown>>;
}
interface ElectricSyncOptions {
    debug?: boolean;
    metadataSchema?: string;
}
type InsertChangeMessage = ChangeMessage<any> & {
    headers: {
        operation: 'insert';
    };
};

declare function createPlugin(pg: PGliteInterface, options?: ElectricSyncOptions): Promise<{
    namespaceObj: {
        initMetadataTables: () => Promise<void>;
        syncShapesToTables: ({ key, shapes, useCopy, initialInsertMethod, onInitialSync, }: SyncShapesToTablesOptions) => Promise<SyncShapesToTablesResult>;
        syncShapeToTable: (options: SyncShapeToTableOptions) => Promise<SyncShapeToTableResult>;
        deleteSubscription: (key: string) => Promise<void>;
    };
    close: () => Promise<void>;
}>;
type SyncNamespaceObj = Awaited<ReturnType<typeof createPlugin>>['namespaceObj'];
type PGliteWithSync = PGliteInterface & {
    sync: SyncNamespaceObj;
};
declare function electricSync(options?: ElectricSyncOptions): {
    name: string;
    setup: (pg: PGliteInterface) => Promise<{
        namespaceObj: {
            initMetadataTables: () => Promise<void>;
            syncShapesToTables: ({ key, shapes, useCopy, initialInsertMethod, onInitialSync, }: SyncShapesToTablesOptions) => Promise<SyncShapesToTablesResult>;
            syncShapeToTable: (options: SyncShapeToTableOptions) => Promise<SyncShapeToTableResult>;
            deleteSubscription: (key: string) => Promise<void>;
        };
        close: () => Promise<void>;
    }>;
};

export { type ElectricSyncOptions, type InitialInsertMethod, type InsertChangeMessage, type Lsn, type MapColumns, type MapColumnsFn, type MapColumnsMap, type PGliteWithSync, type ShapeToTableOptions, type SubscriptionKey, type SyncNamespaceObj, type SyncShapeToTableOptions, type SyncShapeToTableResult, type SyncShapesToTablesOptions, type SyncShapesToTablesResult, electricSync };
