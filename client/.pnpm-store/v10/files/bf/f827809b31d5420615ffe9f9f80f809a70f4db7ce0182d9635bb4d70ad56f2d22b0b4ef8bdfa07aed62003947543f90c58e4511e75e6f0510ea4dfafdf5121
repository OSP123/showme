import { Row, ShapeStreamInterface, Operation, ChangeMessage, Value, GetExtensions, ShapeStream, MaybePromise, FetchError, ShapeStreamOptions, ControlMessage } from '@electric-sql/client';

declare function matchStream<T extends Row<unknown>>(stream: ShapeStreamInterface<T>, operations: Array<Operation>, matchFn: (message: ChangeMessage<T>) => boolean, timeout?: number): Promise<ChangeMessage<T>>;
declare function matchBy<T extends Row<unknown>>(column: string, value: Value<GetExtensions<T>>): (message: ChangeMessage<T>) => boolean;

interface MultiShapeStreamOptions<TShapeRows extends {
    [K: string]: Row<unknown>;
} = {
    [K: string]: Row<unknown>;
}> {
    shapes: {
        [K in keyof TShapeRows]: ShapeStreamOptions<TShapeRows[K]> | ShapeStream<TShapeRows[K]>;
    };
    start?: boolean;
    checkForUpdatesAfterMs?: number;
}
interface MultiShapeChangeMessage<T extends Row<unknown>, ShapeNames extends string> extends ChangeMessage<T> {
    shape: ShapeNames;
}
interface MultiShapeControlMessage<ShapeNames extends string> extends ControlMessage {
    shape: ShapeNames;
}
type MultiShapeMessage<T extends Row<unknown>, ShapeNames extends string> = MultiShapeChangeMessage<T, ShapeNames> | MultiShapeControlMessage<ShapeNames>;
type MultiShapeMessages<TShapeRows extends {
    [K: string]: Row<unknown>;
}> = {
    [K in keyof TShapeRows & string]: MultiShapeMessage<TShapeRows[K], K>;
}[keyof TShapeRows & string];
interface MultiShapeStreamInterface<TShapeRows extends {
    [K: string]: Row<unknown>;
}> {
    shapes: {
        [K in keyof TShapeRows]: ShapeStream<TShapeRows[K]>;
    };
    checkForUpdatesAfterMs?: number;
    subscribe(callback: (messages: MultiShapeMessages<TShapeRows>[]) => MaybePromise<void>, onError?: (error: FetchError | Error) => void): () => void;
    unsubscribeAll(): void;
    lastSyncedAt(): number | undefined;
    lastSynced(): number;
    isConnected(): boolean;
    isLoading(): boolean;
    isUpToDate: boolean;
}
/**
 * A multi-shape stream is a stream that can subscribe to multiple shapes.
 * It ensures that all shapes will receive at least an `up-to-date` message from
 * Electric within the `checkForUpdatesAfterMs` interval.
 *
 * @constructor
 * @param {MultiShapeStreamOptions} options - configure the multi-shape stream
 * @example
 * ```ts
 * const multiShapeStream = new MultiShapeStream({
 *   shapes: {
 *     shape1: {
 *       url: 'http://localhost:3000/v1/shape1',
 *     },
 *     shape2: {
 *       url: 'http://localhost:3000/v1/shape2',
 *     },
 *   },
 * })
 *
 * multiShapeStream.subscribe((msgs) => {
 *   console.log(msgs)
 * })
 *
 * // or with ShapeStream instances
 * const multiShapeStream = new MultiShapeStream({
 *   shapes: {
 *     shape1: new ShapeStream({ url: 'http://localhost:3000/v1/shape1' }),
 *     shape2: new ShapeStream({ url: 'http://localhost:3000/v1/shape2' }),
 *   },
 * })
 * ```
 */
declare class MultiShapeStream<TShapeRows extends {
    [K: string]: Row<unknown>;
}> implements MultiShapeStreamInterface<TShapeRows> {
    #private;
    checkForUpdatesAfterMs?: number;
    constructor(options: MultiShapeStreamOptions<TShapeRows>);
    protected _publish(messages: MultiShapeMessages<TShapeRows>[]): Promise<void>;
    /**
     * The ShapeStreams that are being subscribed to.
     */
    get shapes(): { [K in keyof TShapeRows]: ShapeStream<TShapeRows[K]>; };
    subscribe(callback: (messages: MultiShapeMessages<TShapeRows>[]) => MaybePromise<void>, onError?: (error: FetchError | Error) => void): () => void;
    unsubscribeAll(): void;
    /** Unix time at which we last synced. Undefined when `isLoading` is true. */
    lastSyncedAt(): number | undefined;
    /** Time elapsed since last sync (in ms). Infinity if we did not yet sync. */
    lastSynced(): number;
    /** Indicates if we are connected to the Electric sync service. */
    isConnected(): boolean;
    /** True during initial fetch. False afterwise. */
    isLoading(): boolean;
    get isUpToDate(): boolean;
}
/**
 * A transactional multi-shape stream is a multi-shape stream that emits the
 * messages in transactional batches, ensuring that all shapes will receive
 * at least an `up-to-date` message from Electric within the `checkForUpdatesAfterMs`
 * interval.
 * It uses the `lsn` metadata to infer transaction boundaries, and the `op_position`
 * metadata to sort the messages within a transaction.
 *
 * @constructor
 * @param {MultiShapeStreamOptions} options - configure the multi-shape stream
 * @example
 * ```ts
 * const transactionalMultiShapeStream = new TransactionalMultiShapeStream({
 *   shapes: {
 *     shape1: {
 *       url: 'http://localhost:3000/v1/shape1',
 *     },
 *     shape2: {
 *       url: 'http://localhost:3000/v1/shape2',
 *     },
 *   },
 * })
 *
 * transactionalMultiShapeStream.subscribe((msgs) => {
 *   console.log(msgs)
 * })
 *
 * // or with ShapeStream instances
 * const transactionalMultiShapeStream = new TransactionalMultiShapeStream({
 *   shapes: {
 *     shape1: new ShapeStream({ url: 'http://localhost:3000/v1/shape1' }),
 *     shape2: new ShapeStream({ url: 'http://localhost:3000/v1/shape2' }),
 *   },
 * })
 * ```
 */
declare class TransactionalMultiShapeStream<TShapeRows extends {
    [K: string]: Row<unknown>;
}> extends MultiShapeStream<TShapeRows> {
    #private;
    constructor(options: MultiShapeStreamOptions<TShapeRows>);
    protected _publish(messages: MultiShapeMessages<TShapeRows>[]): Promise<void>;
}

export { type MultiShapeMessages, MultiShapeStream, type MultiShapeStreamInterface, TransactionalMultiShapeStream, matchBy, matchStream };
