/**
 * Default types for SQL but can be extended with additional types when using a custom parser.
 * @typeParam Extensions - Additional value types.
 */
type Value<Extensions = never> = string | number | boolean | bigint | null | Extensions | Value<Extensions>[] | {
    [key: string]: Value<Extensions>;
};
type Row<Extensions = never> = Record<string, Value<Extensions>>;
type GetExtensions<T extends Row<unknown>> = T extends Row<infer Extensions> ? Extensions : never;
type Offset = `-1` | `${number}_${number}`;
interface Header {
    [key: Exclude<string, `operation` | `control`>]: Value;
}
type Operation = `insert` | `update` | `delete`;
type ControlMessage = {
    headers: Header & {
        control: `up-to-date` | `must-refetch`;
    };
};
type ChangeMessage<T extends Row<unknown> = Row> = {
    key: string;
    value: T;
    old_value?: Partial<T>;
    headers: Header & {
        operation: Operation;
    };
};
type Message<T extends Row<unknown> = Row> = ControlMessage | ChangeMessage<T>;
/**
 * Common properties for all columns.
 * `dims` is the number of dimensions of the column. Only provided if the column is an array.
 * `not_null` is true if the column has a `NOT NULL` constraint and is omitted otherwise.
 */
type CommonColumnProps = {
    dims?: number;
    not_null?: boolean;
};
type RegularColumn = {
    type: string;
} & CommonColumnProps;
type VarcharColumn = {
    type: `varchar`;
    max_length?: number;
} & CommonColumnProps;
type BpcharColumn = {
    type: `bpchar`;
    length?: number;
} & CommonColumnProps;
type TimeColumn = {
    type: `time` | `timetz` | `timestamp` | `timestamptz`;
    precision?: number;
} & CommonColumnProps;
type IntervalColumn = {
    type: `interval`;
    fields?: `YEAR` | `MONTH` | `DAY` | `HOUR` | `MINUTE` | `YEAR TO MONTH` | `DAY TO HOUR` | `DAY TO MINUTE` | `DAY TO SECOND` | `HOUR TO MINUTE` | `HOUR TO SECOND` | `MINUTE TO SECOND`;
} & CommonColumnProps;
type IntervalColumnWithPrecision = {
    type: `interval`;
    precision?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    fields?: `SECOND`;
} & CommonColumnProps;
type BitColumn = {
    type: `bit`;
    length: number;
} & CommonColumnProps;
type NumericColumn = {
    type: `numeric`;
    precision?: number;
    scale?: number;
} & CommonColumnProps;
type ColumnInfo = RegularColumn | VarcharColumn | BpcharColumn | TimeColumn | IntervalColumn | IntervalColumnWithPrecision | BitColumn | NumericColumn;
type Schema = {
    [key: string]: ColumnInfo;
};
type TypedMessages<T extends Row<unknown> = Row> = {
    messages: Array<Message<T>>;
    schema: ColumnInfo;
};
type MaybePromise<T> = T | Promise<T>;

type NullToken = null | `NULL`;
type Token = Exclude<string, NullToken>;
type ParseFunction<Extensions = never> = (value: Token, additionalInfo?: Omit<ColumnInfo, `type` | `dims`>) => Value<Extensions>;
/**
 * @typeParam Extensions - Additional types that can be parsed by this parser beyond the standard SQL types.
 *                         Defaults to no additional types.
 */
type Parser<Extensions = never> = {
    [key: string]: ParseFunction<Extensions>;
};

declare class FetchError extends Error {
    url: string;
    status: number;
    text?: string;
    json?: object;
    headers: Record<string, string>;
    constructor(status: number, text: string | undefined, json: object | undefined, headers: Record<string, string>, url: string, message?: string);
    static fromResponse(response: Response, url: string): Promise<FetchError>;
}

interface BackoffOptions {
    /**
     * Initial delay before retrying in milliseconds
     */
    initialDelay: number;
    /**
     * Maximum retry delay in milliseconds
     */
    maxDelay: number;
    multiplier: number;
    onFailedAttempt?: () => void;
    debug?: boolean;
}
declare const BackoffDefaults: {
    initialDelay: number;
    maxDelay: number;
    multiplier: number;
};

declare const LIVE_CACHE_BUSTER_QUERY_PARAM = "cursor";
declare const SHAPE_HANDLE_QUERY_PARAM = "handle";
declare const LIVE_QUERY_PARAM = "live";
declare const OFFSET_QUERY_PARAM = "offset";

type Replica = `full` | `default`;
/**
 * PostgreSQL-specific shape parameters that can be provided externally
 */
interface PostgresParams {
    /** The root table for the shape. Not required if you set the table in your proxy. */
    table?: string;
    /**
     * The columns to include in the shape.
     * Must include primary keys, and can only include valid columns.
     */
    columns?: string[];
    /** The where clauses for the shape */
    where?: string;
    /**
     * Positional where clause paramater values. These will be passed to the server
     * and will substitute `$i` parameters in the where clause.
     *
     * It can be an array (note that positional arguments start at 1, the array will be mapped
     * accordingly), or an object with keys matching the used positional parameters in the where clause.
     *
     * If where clause is `id = $1 or id = $2`, params must have keys `"1"` and `"2"`, or be an array with length 2.
     */
    params?: Record<`${number}`, string> | string[];
    /**
     * If `replica` is `default` (the default) then Electric will only send the
     * changed columns in an update.
     *
     * If it's `full` Electric will send the entire row with both changed and
     * unchanged values. `old_value` will also be present on update messages,
     * containing the previous value for changed columns.
     *
     * Setting `replica` to `full` will result in higher bandwidth
     * usage and so is not generally recommended.
     */
    replica?: Replica;
}
type SerializableParamValue = string | string[] | Record<string, string>;
type ParamValue = SerializableParamValue | (() => SerializableParamValue | Promise<SerializableParamValue>);
/**
 * External params type - what users provide.
 * Excludes reserved parameters to prevent dynamic variations that could cause stream shape changes.
 */
type ExternalParamsRecord = {
    [K in string as K extends ReservedParamKeys ? never : K]: ParamValue | undefined;
} & Partial<PostgresParams>;
type ReservedParamKeys = typeof LIVE_CACHE_BUSTER_QUERY_PARAM | typeof SHAPE_HANDLE_QUERY_PARAM | typeof LIVE_QUERY_PARAM | typeof OFFSET_QUERY_PARAM;
/**
 * External headers type - what users provide.
 * Allows string or function values for any header.
 */
type ExternalHeadersRecord = {
    [key: string]: string | (() => string | Promise<string>);
};
/**
 * Helper function to resolve a function or value to its final value
 */
declare function resolveValue<T>(value: T | (() => T | Promise<T>)): Promise<T>;
type RetryOpts = {
    params?: ExternalParamsRecord;
    headers?: ExternalHeadersRecord;
};
type ShapeStreamErrorHandler = (error: Error) => void | RetryOpts | Promise<void | RetryOpts>;
/**
 * Options for constructing a ShapeStream.
 */
interface ShapeStreamOptions<T = never> {
    /**
     * The full URL to where the Shape is served. This can either be the Electric server
     * directly or a proxy. E.g. for a local Electric instance, you might set `http://localhost:3000/v1/shape`
     */
    url: string;
    /**
     * The "offset" on the shape log. This is typically not set as the ShapeStream
     * will handle this automatically. A common scenario where you might pass an offset
     * is if you're maintaining a local cache of the log. If you've gone offline
     * and are re-starting a ShapeStream to catch-up to the latest state of the Shape,
     * you'd pass in the last offset and shapeHandle you'd seen from the Electric server
     * so it knows at what point in the shape to catch you up from.
     */
    offset?: Offset;
    /**
     * Similar to `offset`, this isn't typically used unless you're maintaining
     * a cache of the shape log.
     */
    handle?: string;
    /**
     * HTTP headers to attach to requests made by the client.
     * Values can be strings or functions (sync or async) that return strings.
     * Function values are resolved in parallel when needed, making this useful
     * for authentication tokens or other dynamic headers.
     */
    headers?: ExternalHeadersRecord;
    /**
     * Additional request parameters to attach to the URL.
     * Values can be strings, string arrays, or functions (sync or async) that return these types.
     * Function values are resolved in parallel when needed, making this useful
     * for user-specific parameters or dynamic filters.
     *
     * These will be merged with Electric's standard parameters.
     * Note: You cannot use Electric's reserved parameter names
     * (offset, handle, live, cursor).
     *
     * PostgreSQL-specific options like table, where, columns, and replica
     * should be specified here.
     */
    params?: ExternalParamsRecord;
    /**
     * Automatically fetch updates to the Shape. If you just want to sync the current
     * shape and stop, pass false.
     */
    subscribe?: boolean;
    signal?: AbortSignal;
    fetchClient?: typeof fetch;
    backoffOptions?: BackoffOptions;
    parser?: Parser<T>;
    /**
     * A function for handling shapestream errors.
     * This is optional, when it is not provided any shapestream errors will be thrown.
     * If the function returns an object containing parameters and/or headers
     * the shapestream will apply those changes and try syncing again.
     * If the function returns void the shapestream is stopped.
     */
    onError?: ShapeStreamErrorHandler;
}
interface ShapeStreamInterface<T extends Row<unknown> = Row> {
    subscribe(callback: (messages: Message<T>[]) => MaybePromise<void>, onError?: (error: FetchError | Error) => void): () => void;
    unsubscribeAll(): void;
    isLoading(): boolean;
    lastSyncedAt(): number | undefined;
    lastSynced(): number;
    isConnected(): boolean;
    hasStarted(): boolean;
    isUpToDate: boolean;
    lastOffset: Offset;
    shapeHandle?: string;
    error?: unknown;
    forceDisconnectAndRefresh(): Promise<void>;
}
/**
 * Reads updates to a shape from Electric using HTTP requests and long polling. Notifies subscribers
 * when new messages come in. Doesn't maintain any history of the
 * log but does keep track of the offset position and is the best way
 * to consume the HTTP `GET /v1/shape` api.
 *
 * @constructor
 * @param {ShapeStreamOptions} options - configure the shape stream
 * @example
 * Register a callback function to subscribe to the messages.
 * ```
 * const stream = new ShapeStream(options)
 * stream.subscribe(messages => {
 *   // messages is 1 or more row updates
 * })
 * ```
 *
 * To abort the stream, abort the `signal`
 * passed in via the `ShapeStreamOptions`.
 * ```
 * const aborter = new AbortController()
 * const issueStream = new ShapeStream({
 *   url: `${BASE_URL}/${table}`
 *   subscribe: true,
 *   signal: aborter.signal,
 * })
 * // Later...
 * aborter.abort()
 * ```
 */
declare class ShapeStream<T extends Row<unknown> = Row> implements ShapeStreamInterface<T> {
    #private;
    static readonly Replica: {
        FULL: Replica;
        DEFAULT: Replica;
    };
    readonly options: ShapeStreamOptions<GetExtensions<T>>;
    constructor(options: ShapeStreamOptions<GetExtensions<T>>);
    get shapeHandle(): string | undefined;
    get error(): unknown;
    get isUpToDate(): boolean;
    get lastOffset(): Offset;
    subscribe(callback: (messages: Message<T>[]) => MaybePromise<void>, onError?: (error: Error) => void): () => void;
    unsubscribeAll(): void;
    /** Unix time at which we last synced. Undefined when `isLoading` is true. */
    lastSyncedAt(): number | undefined;
    /** Time elapsed since last sync (in ms). Infinity if we did not yet sync. */
    lastSynced(): number;
    /** Indicates if we are connected to the Electric sync service. */
    isConnected(): boolean;
    /** True during initial fetch. False afterwise.  */
    isLoading(): boolean;
    hasStarted(): boolean;
    /**
     * Refreshes the shape stream.
     * This preemptively aborts any ongoing long poll and reconnects without
     * long polling, ensuring that the stream receives an up to date message with the
     * latest LSN from Postgres at that point in time.
     */
    forceDisconnectAndRefresh(): Promise<void>;
}

type ShapeData<T extends Row<unknown> = Row> = Map<string, T>;
type ShapeChangedCallback<T extends Row<unknown> = Row> = (data: {
    value: ShapeData<T>;
    rows: T[];
}) => void;
/**
 * A Shape is an object that subscribes to a shape log,
 * keeps a materialised shape `.rows` in memory and
 * notifies subscribers when the value has changed.
 *
 * It can be used without a framework and as a primitive
 * to simplify developing framework hooks.
 *
 * @constructor
 * @param {ShapeStream<T extends Row>} - the underlying shape stream
 * @example
 * ```
 * const shapeStream = new ShapeStream<{ foo: number }>({
 *   url: `http://localhost:3000/v1/shape`,
 *   params: {
 *     table: `foo`
 *   }
 * })
 * const shape = new Shape(shapeStream)
 * ```
 *
 * `rows` returns a promise that resolves the Shape data once the Shape has been
 * fully loaded (and when resuming from being offline):
 *
 *     const rows = await shape.rows
 *
 * `currentRows` returns the current data synchronously:
 *
 *     const rows = shape.currentRows
 *
 *  Subscribe to updates. Called whenever the shape updates in Postgres.
 *
 *     shape.subscribe(({ rows }) => {
 *       console.log(rows)
 *     })
 */
declare class Shape<T extends Row<unknown> = Row> {
    #private;
    readonly stream: ShapeStreamInterface<T>;
    constructor(stream: ShapeStreamInterface<T>);
    get isUpToDate(): boolean;
    get lastOffset(): Offset;
    get handle(): string | undefined;
    get rows(): Promise<T[]>;
    get currentRows(): T[];
    get value(): Promise<ShapeData<T>>;
    get currentValue(): ShapeData<T>;
    get error(): false | FetchError;
    /** Unix time at which we last synced. Undefined when `isLoading` is true. */
    lastSyncedAt(): number | undefined;
    /** Time elapsed since last sync (in ms). Infinity if we did not yet sync. */
    lastSynced(): number;
    /** True during initial fetch. False afterwise.  */
    isLoading(): boolean;
    /** Indicates if we are connected to the Electric sync service. */
    isConnected(): boolean;
    subscribe(callback: ShapeChangedCallback<T>): () => void;
    unsubscribeAll(): void;
    get numSubscribers(): number;
}

/**
 * Type guard for checking {@link Message} is {@link ChangeMessage}.
 *
 * See [TS docs](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
 * for information on how to use type guards.
 *
 * @param message - the message to check
 * @returns true if the message is a {@link ChangeMessage}
 *
 * @example
 * ```ts
 * if (isChangeMessage(message)) {
 *   const msgChng: ChangeMessage = message // Ok
 *   const msgCtrl: ControlMessage = message // Err, type mismatch
 * }
 * ```
 */
declare function isChangeMessage<T extends Row<unknown> = Row>(message: Message<T>): message is ChangeMessage<T>;
/**
 * Type guard for checking {@link Message} is {@link ControlMessage}.
 *
 * See [TS docs](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
 * for information on how to use type guards.
 *
 * @param message - the message to check
 * @returns true if the message is a {@link ControlMessage}
 *
 *  * @example
 * ```ts
 * if (isControlMessage(message)) {
 *   const msgChng: ChangeMessage = message // Err, type mismatch
 *   const msgCtrl: ControlMessage = message // Ok
 * }
 * ```
 */
declare function isControlMessage<T extends Row<unknown> = Row>(message: Message<T>): message is ControlMessage;

export { BackoffDefaults, type BackoffOptions, type BitColumn, type BpcharColumn, type ChangeMessage, type ColumnInfo, type CommonColumnProps, type ControlMessage, type ExternalHeadersRecord, type ExternalParamsRecord, FetchError, type GetExtensions, type IntervalColumn, type IntervalColumnWithPrecision, type MaybePromise, type Message, type NumericColumn, type Offset, type Operation, type PostgresParams, type RegularColumn, type Row, type Schema, Shape, type ShapeChangedCallback, type ShapeData, ShapeStream, type ShapeStreamInterface, type ShapeStreamOptions, type TimeColumn, type TypedMessages, type Value, type VarcharColumn, isChangeMessage, isControlMessage, resolveValue };
