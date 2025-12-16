var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __reflectGet = Reflect.get;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __superGet = (cls, obj, key) => __reflectGet(__getProtoOf(cls), key, obj);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/match.ts
import {
  isChangeMessage
} from "@electric-sql/client";
function matchStream(stream, operations, matchFn, timeout = 6e4) {
  return new Promise((resolve, reject) => {
    const unsubscribe = stream.subscribe(
      (messages) => {
        const message = messages.filter(
          (msg) => isChangeMessage(msg)
        ).find((message2) => {
          const operation = message2.headers.operation;
          return operations.includes(operation) && matchFn(message2);
        });
        if (message) {
          return finish(message);
        }
      }
    );
    const timeoutId = setTimeout(() => {
      const msg = `matchStream timed out after ${timeout}ms`;
      console.error(msg);
      reject(msg);
    }, timeout);
    function finish(message) {
      clearTimeout(timeoutId);
      unsubscribe();
      return resolve(message);
    }
  });
}
function matchBy(column, value) {
  return (message) => message.value[column] === value;
}

// src/bigint-utils.ts
function bigIntMax(...args) {
  return BigInt(args.reduce((m, e) => e > m ? e : m));
}
function bigIntMin(...args) {
  return BigInt(args.reduce((m, e) => e < m ? e : m));
}
function bigIntCompare(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
}

// src/multi-shape-stream.ts
import {
  ShapeStream,
  isChangeMessage as isChangeMessage2,
  isControlMessage
} from "@electric-sql/client";
var _shapes, _started, _checkForUpdatesTimeout, _lastDataLsns, _lastUpToDateLsns, _subscribers, _MultiShapeStream_instances, start_fn, scheduleCheckForUpdates_fn, checkForUpdates_fn, onError_fn, shapeEntries_fn;
var MultiShapeStream = class {
  constructor(options) {
    __privateAdd(this, _MultiShapeStream_instances);
    __privateAdd(this, _shapes);
    __privateAdd(this, _started, false);
    __privateAdd(this, _checkForUpdatesTimeout);
    // We keep track of the last lsn of data and up-to-date messages for each shape
    // so that we can skip checkForUpdates if the lsn of the up-to-date message is
    // greater than the last lsn of data.
    __privateAdd(this, _lastDataLsns);
    __privateAdd(this, _lastUpToDateLsns);
    __privateAdd(this, _subscribers, /* @__PURE__ */ new Map());
    const {
      start = true,
      // By default we start the multi-shape stream
      checkForUpdatesAfterMs = 100,
      // Force a check for updates after 100ms
      shapes
    } = options;
    this.checkForUpdatesAfterMs = checkForUpdatesAfterMs;
    __privateSet(this, _shapes, Object.fromEntries(
      Object.entries(shapes).map(([key, shape]) => [
        key,
        shape instanceof ShapeStream ? shape : new ShapeStream(__spreadProps(__spreadValues({}, shape), {
          start: false
        }))
      ])
    ));
    __privateSet(this, _lastDataLsns, Object.fromEntries(
      Object.entries(shapes).map(([key]) => [key, BigInt(-1)])
    ));
    __privateSet(this, _lastUpToDateLsns, Object.fromEntries(
      Object.entries(shapes).map(([key]) => [key, BigInt(-1)])
    ));
    if (start) __privateMethod(this, _MultiShapeStream_instances, start_fn).call(this);
  }
  _publish(messages) {
    return __async(this, null, function* () {
      yield Promise.all(
        Array.from(__privateGet(this, _subscribers).values()).map((_0) => __async(this, [_0], function* ([callback, __]) {
          try {
            yield callback(messages);
          } catch (err) {
            queueMicrotask(() => {
              throw err;
            });
          }
        }))
      );
    });
  }
  /**
   * The ShapeStreams that are being subscribed to.
   */
  get shapes() {
    return __privateGet(this, _shapes);
  }
  subscribe(callback, onError) {
    const subscriptionId = Math.random();
    __privateGet(this, _subscribers).set(subscriptionId, [callback, onError]);
    if (!__privateGet(this, _started)) __privateMethod(this, _MultiShapeStream_instances, start_fn).call(this);
    return () => {
      __privateGet(this, _subscribers).delete(subscriptionId);
    };
  }
  unsubscribeAll() {
    __privateGet(this, _subscribers).clear();
  }
  /** Unix time at which we last synced. Undefined when `isLoading` is true. */
  lastSyncedAt() {
    return Math.min(
      ...__privateMethod(this, _MultiShapeStream_instances, shapeEntries_fn).call(this).map(
        ([_, shape]) => {
          var _a;
          return (_a = shape.lastSyncedAt()) != null ? _a : Infinity;
        }
      )
    );
  }
  /** Time elapsed since last sync (in ms). Infinity if we did not yet sync. */
  lastSynced() {
    const lastSyncedAt = this.lastSyncedAt();
    if (lastSyncedAt === void 0) return Infinity;
    return Date.now() - lastSyncedAt;
  }
  /** Indicates if we are connected to the Electric sync service. */
  isConnected() {
    return __privateMethod(this, _MultiShapeStream_instances, shapeEntries_fn).call(this).every(([_, shape]) => shape.isConnected());
  }
  /** True during initial fetch. False afterwise. */
  isLoading() {
    return __privateMethod(this, _MultiShapeStream_instances, shapeEntries_fn).call(this).some(([_, shape]) => shape.isLoading());
  }
  get isUpToDate() {
    return __privateMethod(this, _MultiShapeStream_instances, shapeEntries_fn).call(this).every(([_, shape]) => shape.isUpToDate);
  }
};
_shapes = new WeakMap();
_started = new WeakMap();
_checkForUpdatesTimeout = new WeakMap();
_lastDataLsns = new WeakMap();
_lastUpToDateLsns = new WeakMap();
_subscribers = new WeakMap();
_MultiShapeStream_instances = new WeakSet();
start_fn = function() {
  if (__privateGet(this, _started)) throw new Error(`Cannot start multi-shape stream twice`);
  for (const [key, shape] of __privateMethod(this, _MultiShapeStream_instances, shapeEntries_fn).call(this)) {
    if (shape.hasStarted()) {
      throw new Error(`Shape ${key} already started`);
    }
    shape.subscribe(
      (messages) => __async(this, null, function* () {
        const upToDateLsns = messages.filter(isControlMessage).map(
          ({ headers }) => typeof headers.global_last_seen_lsn === `string` ? BigInt(headers.global_last_seen_lsn) : BigInt(0)
        );
        if (upToDateLsns.length > 0) {
          const maxUpToDateLsn = bigIntMax(...upToDateLsns);
          const lastMaxUpToDateLsn = __privateGet(this, _lastUpToDateLsns)[key];
          if (maxUpToDateLsn > lastMaxUpToDateLsn) {
            __privateGet(this, _lastUpToDateLsns)[key] = maxUpToDateLsn;
          }
        }
        const dataLsns = messages.filter(isChangeMessage2).map(
          ({ headers }) => typeof headers.lsn === `string` ? BigInt(headers.lsn) : BigInt(0)
        );
        if (dataLsns.length > 0) {
          const maxDataLsn = bigIntMax(...dataLsns);
          const lastMaxDataLsn = __privateGet(this, _lastDataLsns)[key];
          if (maxDataLsn > lastMaxDataLsn) {
            __privateGet(this, _lastDataLsns)[key] = maxDataLsn;
          }
          __privateMethod(this, _MultiShapeStream_instances, scheduleCheckForUpdates_fn).call(this);
        }
        const multiShapeMessages = messages.map(
          (message) => __spreadProps(__spreadValues({}, message), {
            shape: key
          })
        );
        yield this._publish(multiShapeMessages);
      }),
      (error) => __privateMethod(this, _MultiShapeStream_instances, onError_fn).call(this, error)
    );
  }
  __privateSet(this, _started, true);
};
scheduleCheckForUpdates_fn = function() {
  var _a;
  (_a = __privateGet(this, _checkForUpdatesTimeout)) != null ? _a : __privateSet(this, _checkForUpdatesTimeout, setTimeout(() => {
    __privateMethod(this, _MultiShapeStream_instances, checkForUpdates_fn).call(this);
    __privateSet(this, _checkForUpdatesTimeout, void 0);
  }, this.checkForUpdatesAfterMs));
};
checkForUpdates_fn = function() {
  return __async(this, null, function* () {
    const maxDataLsn = bigIntMax(...Object.values(__privateGet(this, _lastDataLsns)));
    const refreshPromises = __privateMethod(this, _MultiShapeStream_instances, shapeEntries_fn).call(this).filter(([key]) => {
      const lastUpToDateLsn = __privateGet(this, _lastUpToDateLsns)[key];
      return lastUpToDateLsn < maxDataLsn;
    }).map(([_, shape]) => {
      return shape.forceDisconnectAndRefresh();
    });
    yield Promise.all(refreshPromises);
  });
};
onError_fn = function(error) {
  __privateGet(this, _subscribers).forEach(([_, errorFn]) => {
    errorFn == null ? void 0 : errorFn(error);
  });
};
/**
 * Returns an array of the shape entries.
 * Ensures that the shape entries are typed, as `Object.entries`
 * will not type the entries correctly.
 */
shapeEntries_fn = function() {
  return Object.entries(__privateGet(this, _shapes));
};
var _changeMessages, _completeLsns, _TransactionalMultiShapeStream_instances, getLowestCompleteLsn_fn, accumulate_fn;
var _TransactionalMultiShapeStream = class _TransactionalMultiShapeStream extends MultiShapeStream {
  constructor(options) {
    super(options);
    __privateAdd(this, _TransactionalMultiShapeStream_instances);
    __privateAdd(this, _changeMessages, /* @__PURE__ */ new Map());
    __privateAdd(this, _completeLsns);
    __privateSet(this, _completeLsns, Object.fromEntries(
      Object.entries(options.shapes).map(([key]) => [key, BigInt(-1)])
    ));
  }
  _publish(messages) {
    return __async(this, null, function* () {
      __privateMethod(this, _TransactionalMultiShapeStream_instances, accumulate_fn).call(this, messages);
      const lowestCompleteLsn = __privateMethod(this, _TransactionalMultiShapeStream_instances, getLowestCompleteLsn_fn).call(this);
      const lsnsToPublish = [...__privateGet(this, _changeMessages).keys()].filter(
        (lsn) => lsn <= lowestCompleteLsn
      );
      const messagesToPublish = lsnsToPublish.sort((a, b) => bigIntCompare(a, b)).map(
        (lsn) => {
          var _a;
          return (_a = __privateGet(this, _changeMessages).get(lsn)) == null ? void 0 : _a.sort((a, b) => {
            const { headers: aHeaders } = a;
            const { headers: bHeaders } = b;
            if (typeof aHeaders.op_position !== `number` || typeof bHeaders.op_position !== `number`) {
              return 0;
            }
            return aHeaders.op_position - bHeaders.op_position;
          });
        }
      ).filter((messages2) => messages2 !== void 0).flat();
      lsnsToPublish.forEach((lsn) => {
        __privateGet(this, _changeMessages).delete(lsn);
      });
      if (messagesToPublish.length > 0) {
        yield __superGet(_TransactionalMultiShapeStream.prototype, this, "_publish").call(this, messagesToPublish);
      }
    });
  }
};
_changeMessages = new WeakMap();
_completeLsns = new WeakMap();
_TransactionalMultiShapeStream_instances = new WeakSet();
getLowestCompleteLsn_fn = function() {
  return bigIntMin(...Object.values(__privateGet(this, _completeLsns)));
};
accumulate_fn = function(messages) {
  const isUpToDate = this.isUpToDate;
  messages.forEach((message) => {
    var _a;
    const { shape, headers } = message;
    if (isChangeMessage2(message)) {
      const lsn = typeof headers.lsn === `string` ? BigInt(headers.lsn) : BigInt(0);
      if (!__privateGet(this, _changeMessages).has(lsn)) {
        __privateGet(this, _changeMessages).set(lsn, []);
      }
      (_a = __privateGet(this, _changeMessages).get(lsn)) == null ? void 0 : _a.push(message);
      if (isUpToDate && // All shapes must be up to date
      typeof headers.last === `boolean` && headers.last === true) {
        __privateGet(this, _completeLsns)[shape] = bigIntMax(__privateGet(this, _completeLsns)[shape], lsn);
      }
    } else if (isControlMessage(message)) {
      if (headers.control === `up-to-date`) {
        if (typeof headers.global_last_seen_lsn !== `string`) {
          throw new Error(`global_last_seen_lsn is not a number`);
        }
        __privateGet(this, _completeLsns)[shape] = bigIntMax(
          __privateGet(this, _completeLsns)[shape],
          BigInt(headers.global_last_seen_lsn)
        );
      }
    }
  });
};
var TransactionalMultiShapeStream = _TransactionalMultiShapeStream;
export {
  MultiShapeStream,
  TransactionalMultiShapeStream,
  matchBy,
  matchStream
};
//# sourceMappingURL=index.mjs.map