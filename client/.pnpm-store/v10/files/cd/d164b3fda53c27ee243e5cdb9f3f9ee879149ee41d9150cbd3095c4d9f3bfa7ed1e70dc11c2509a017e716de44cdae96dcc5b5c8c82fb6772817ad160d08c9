"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  BackoffDefaults: () => BackoffDefaults,
  FetchError: () => FetchError,
  Shape: () => Shape,
  ShapeStream: () => ShapeStream,
  isChangeMessage: () => isChangeMessage,
  isControlMessage: () => isControlMessage,
  resolveValue: () => resolveValue
});
module.exports = __toCommonJS(src_exports);

// src/error.ts
var FetchError = class _FetchError extends Error {
  constructor(status, text, json, headers, url, message) {
    super(
      message || `HTTP Error ${status} at ${url}: ${text != null ? text : JSON.stringify(json)}`
    );
    this.url = url;
    this.name = `FetchError`;
    this.status = status;
    this.text = text;
    this.json = json;
    this.headers = headers;
  }
  static fromResponse(response, url) {
    return __async(this, null, function* () {
      const status = response.status;
      const headers = Object.fromEntries([...response.headers.entries()]);
      let text = void 0;
      let json = void 0;
      const contentType = response.headers.get(`content-type`);
      if (contentType && contentType.includes(`application/json`)) {
        json = yield response.json();
      } else {
        text = yield response.text();
      }
      return new _FetchError(status, text, json, headers, url);
    });
  }
};
var FetchBackoffAbortError = class extends Error {
  constructor() {
    super(`Fetch with backoff aborted`);
    this.name = `FetchBackoffAbortError`;
  }
};
var MissingShapeUrlError = class extends Error {
  constructor() {
    super(`Invalid shape options: missing required url parameter`);
    this.name = `MissingShapeUrlError`;
  }
};
var InvalidSignalError = class extends Error {
  constructor() {
    super(`Invalid signal option. It must be an instance of AbortSignal.`);
    this.name = `InvalidSignalError`;
  }
};
var MissingShapeHandleError = class extends Error {
  constructor() {
    super(
      `shapeHandle is required if this isn't an initial fetch (i.e. offset > -1)`
    );
    this.name = `MissingShapeHandleError`;
  }
};
var ReservedParamError = class extends Error {
  constructor(reservedParams) {
    super(
      `Cannot use reserved Electric parameter names in custom params: ${reservedParams.join(`, `)}`
    );
    this.name = `ReservedParamError`;
  }
};
var ParserNullValueError = class extends Error {
  constructor(columnName) {
    super(`Column "${columnName != null ? columnName : `unknown`}" does not allow NULL values`);
    this.name = `ParserNullValueError`;
  }
};
var MissingHeadersError = class extends Error {
  constructor(url, missingHeaders) {
    let msg = `The response for the shape request to ${url} didn't include the following required headers:
`;
    missingHeaders.forEach((h) => {
      msg += `- ${h}
`;
    });
    msg += `
This is often due to a proxy not setting CORS correctly so that all Electric headers can be read by the client.`;
    msg += `
For more information visit the troubleshooting guide: /docs/guides/troubleshooting/missing-headers`;
    super(msg);
  }
};

// src/parser.ts
var parseNumber = (value) => Number(value);
var parseBool = (value) => value === `true` || value === `t`;
var parseBigInt = (value) => BigInt(value);
var parseJson = (value) => JSON.parse(value);
var identityParser = (v) => v;
var defaultParser = {
  int2: parseNumber,
  int4: parseNumber,
  int8: parseBigInt,
  bool: parseBool,
  float4: parseNumber,
  float8: parseNumber,
  json: parseJson,
  jsonb: parseJson
};
function pgArrayParser(value, parser) {
  let i = 0;
  let char = null;
  let str = ``;
  let quoted = false;
  let last = 0;
  let p = void 0;
  function loop(x) {
    const xs = [];
    for (; i < x.length; i++) {
      char = x[i];
      if (quoted) {
        if (char === `\\`) {
          str += x[++i];
        } else if (char === `"`) {
          xs.push(parser ? parser(str) : str);
          str = ``;
          quoted = x[i + 1] === `"`;
          last = i + 2;
        } else {
          str += char;
        }
      } else if (char === `"`) {
        quoted = true;
      } else if (char === `{`) {
        last = ++i;
        xs.push(loop(x));
      } else if (char === `}`) {
        quoted = false;
        last < i && xs.push(parser ? parser(x.slice(last, i)) : x.slice(last, i));
        last = i + 1;
        break;
      } else if (char === `,` && p !== `}` && p !== `"`) {
        xs.push(parser ? parser(x.slice(last, i)) : x.slice(last, i));
        last = i + 1;
      }
      p = char;
    }
    last < i && xs.push(parser ? parser(x.slice(last, i + 1)) : x.slice(last, i + 1));
    return xs;
  }
  return loop(value)[0];
}
var MessageParser = class {
  constructor(parser) {
    this.parser = __spreadValues(__spreadValues({}, defaultParser), parser);
  }
  parse(messages, schema) {
    return JSON.parse(messages, (key, value) => {
      if ((key === `value` || key === `old_value`) && typeof value === `object` && value !== null) {
        const row = value;
        Object.keys(row).forEach((key2) => {
          row[key2] = this.parseRow(key2, row[key2], schema);
        });
      }
      return value;
    });
  }
  // Parses the message values using the provided parser based on the schema information
  parseRow(key, value, schema) {
    var _b;
    const columnInfo = schema[key];
    if (!columnInfo) {
      return value;
    }
    const _a = columnInfo, { type: typ, dims: dimensions } = _a, additionalInfo = __objRest(_a, ["type", "dims"]);
    const typeParser = (_b = this.parser[typ]) != null ? _b : identityParser;
    const parser = makeNullableParser(typeParser, columnInfo, key);
    if (dimensions && dimensions > 0) {
      const nullablePgArrayParser = makeNullableParser(
        (value2, _) => pgArrayParser(value2, parser),
        columnInfo,
        key
      );
      return nullablePgArrayParser(value);
    }
    return parser(value, additionalInfo);
  }
};
function makeNullableParser(parser, columnInfo, columnName) {
  var _a;
  const isNullable = !((_a = columnInfo.not_null) != null ? _a : false);
  return (value) => {
    if (isPgNull(value)) {
      if (!isNullable) {
        throw new ParserNullValueError(columnName != null ? columnName : `unknown`);
      }
      return null;
    }
    return parser(value, columnInfo);
  };
}
function isPgNull(value) {
  return value === null || value === `NULL`;
}

// src/helpers.ts
function isChangeMessage(message) {
  return `key` in message;
}
function isControlMessage(message) {
  return !isChangeMessage(message);
}
function isUpToDateMessage(message) {
  return isControlMessage(message) && message.headers.control === `up-to-date`;
}

// src/constants.ts
var LIVE_CACHE_BUSTER_HEADER = `electric-cursor`;
var SHAPE_HANDLE_HEADER = `electric-handle`;
var CHUNK_LAST_OFFSET_HEADER = `electric-offset`;
var SHAPE_SCHEMA_HEADER = `electric-schema`;
var CHUNK_UP_TO_DATE_HEADER = `electric-up-to-date`;
var COLUMNS_QUERY_PARAM = `columns`;
var LIVE_CACHE_BUSTER_QUERY_PARAM = `cursor`;
var SHAPE_HANDLE_QUERY_PARAM = `handle`;
var LIVE_QUERY_PARAM = `live`;
var OFFSET_QUERY_PARAM = `offset`;
var TABLE_QUERY_PARAM = `table`;
var WHERE_QUERY_PARAM = `where`;
var REPLICA_PARAM = `replica`;
var WHERE_PARAMS_PARAM = `params`;
var FORCE_DISCONNECT_AND_REFRESH = `force-disconnect-and-refresh`;

// src/fetch.ts
var HTTP_RETRY_STATUS_CODES = [429];
var BackoffDefaults = {
  initialDelay: 100,
  maxDelay: 1e4,
  multiplier: 1.3
};
function createFetchWithBackoff(fetchClient, backoffOptions = BackoffDefaults) {
  const {
    initialDelay,
    maxDelay,
    multiplier,
    debug = false,
    onFailedAttempt
  } = backoffOptions;
  return (...args) => __async(this, null, function* () {
    var _a;
    const url = args[0];
    const options = args[1];
    let delay = initialDelay;
    let attempt = 0;
    while (true) {
      try {
        const result = yield fetchClient(...args);
        if (result.ok) return result;
        else throw yield FetchError.fromResponse(result, url.toString());
      } catch (e) {
        onFailedAttempt == null ? void 0 : onFailedAttempt();
        if ((_a = options == null ? void 0 : options.signal) == null ? void 0 : _a.aborted) {
          throw new FetchBackoffAbortError();
        } else if (e instanceof FetchError && !HTTP_RETRY_STATUS_CODES.includes(e.status) && e.status >= 400 && e.status < 500) {
          throw e;
        } else {
          yield new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * multiplier, maxDelay);
          if (debug) {
            attempt++;
            console.log(`Retry attempt #${attempt} after ${delay}ms`);
          }
        }
      }
    }
  });
}
var ChunkPrefetchDefaults = {
  maxChunksToPrefetch: 2
};
function createFetchWithChunkBuffer(fetchClient, prefetchOptions = ChunkPrefetchDefaults) {
  const { maxChunksToPrefetch } = prefetchOptions;
  let prefetchQueue;
  const prefetchClient = (...args) => __async(this, null, function* () {
    const url = args[0].toString();
    const prefetchedRequest = prefetchQueue == null ? void 0 : prefetchQueue.consume(...args);
    if (prefetchedRequest) {
      return prefetchedRequest;
    }
    prefetchQueue == null ? void 0 : prefetchQueue.abort();
    const response = yield fetchClient(...args);
    const nextUrl = getNextChunkUrl(url, response);
    if (nextUrl) {
      prefetchQueue = new PrefetchQueue({
        fetchClient,
        maxPrefetchedRequests: maxChunksToPrefetch,
        url: nextUrl,
        requestInit: args[1]
      });
    }
    return response;
  });
  return prefetchClient;
}
var requiredElectricResponseHeaders = [
  `electric-offset`,
  `electric-handle`
];
var requiredLiveResponseHeaders = [`electric-cursor`];
var requiredNonLiveResponseHeaders = [`electric-schema`];
function createFetchWithResponseHeadersCheck(fetchClient) {
  return (...args) => __async(this, null, function* () {
    const response = yield fetchClient(...args);
    if (response.ok) {
      const headers = response.headers;
      const missingHeaders = [];
      const addMissingHeaders = (requiredHeaders) => missingHeaders.push(...requiredHeaders.filter((h) => !headers.has(h)));
      addMissingHeaders(requiredElectricResponseHeaders);
      const input = args[0];
      const urlString = input.toString();
      const url = new URL(urlString);
      if (url.searchParams.get(LIVE_QUERY_PARAM) === `true`) {
        addMissingHeaders(requiredLiveResponseHeaders);
      }
      if (!url.searchParams.has(LIVE_QUERY_PARAM) || url.searchParams.get(LIVE_QUERY_PARAM) === `false`) {
        addMissingHeaders(requiredNonLiveResponseHeaders);
      }
      if (missingHeaders.length > 0) {
        throw new MissingHeadersError(urlString, missingHeaders);
      }
    }
    return response;
  });
}
var _fetchClient, _maxPrefetchedRequests, _prefetchQueue, _queueHeadUrl, _queueTailUrl, _PrefetchQueue_instances, prefetch_fn;
var PrefetchQueue = class {
  constructor(options) {
    __privateAdd(this, _PrefetchQueue_instances);
    __privateAdd(this, _fetchClient);
    __privateAdd(this, _maxPrefetchedRequests);
    __privateAdd(this, _prefetchQueue, /* @__PURE__ */ new Map());
    __privateAdd(this, _queueHeadUrl);
    __privateAdd(this, _queueTailUrl);
    var _a;
    __privateSet(this, _fetchClient, (_a = options.fetchClient) != null ? _a : (...args) => fetch(...args));
    __privateSet(this, _maxPrefetchedRequests, options.maxPrefetchedRequests);
    __privateSet(this, _queueHeadUrl, options.url.toString());
    __privateSet(this, _queueTailUrl, __privateGet(this, _queueHeadUrl));
    __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, options.url, options.requestInit);
  }
  abort() {
    __privateGet(this, _prefetchQueue).forEach(([_, aborter]) => aborter.abort());
  }
  consume(...args) {
    var _a;
    const url = args[0].toString();
    const request = (_a = __privateGet(this, _prefetchQueue).get(url)) == null ? void 0 : _a[0];
    if (!request || url !== __privateGet(this, _queueHeadUrl)) return;
    __privateGet(this, _prefetchQueue).delete(url);
    request.then((response) => {
      const nextUrl = getNextChunkUrl(url, response);
      __privateSet(this, _queueHeadUrl, nextUrl);
      if (__privateGet(this, _queueTailUrl) && !__privateGet(this, _prefetchQueue).has(__privateGet(this, _queueTailUrl))) {
        __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, __privateGet(this, _queueTailUrl), args[1]);
      }
    }).catch(() => {
    });
    return request;
  }
};
_fetchClient = new WeakMap();
_maxPrefetchedRequests = new WeakMap();
_prefetchQueue = new WeakMap();
_queueHeadUrl = new WeakMap();
_queueTailUrl = new WeakMap();
_PrefetchQueue_instances = new WeakSet();
prefetch_fn = function(...args) {
  var _a, _b;
  const url = args[0].toString();
  if (__privateGet(this, _prefetchQueue).size >= __privateGet(this, _maxPrefetchedRequests)) return;
  const aborter = new AbortController();
  try {
    const { signal, cleanup } = chainAborter(aborter, (_a = args[1]) == null ? void 0 : _a.signal);
    const request = __privateGet(this, _fetchClient).call(this, url, __spreadProps(__spreadValues({}, (_b = args[1]) != null ? _b : {}), { signal }));
    __privateGet(this, _prefetchQueue).set(url, [request, aborter]);
    request.then((response) => {
      if (!response.ok || aborter.signal.aborted) return;
      const nextUrl = getNextChunkUrl(url, response);
      if (!nextUrl || nextUrl === url) {
        __privateSet(this, _queueTailUrl, void 0);
        return;
      }
      __privateSet(this, _queueTailUrl, nextUrl);
      return __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, nextUrl, args[1]);
    }).catch(() => {
    }).finally(cleanup);
  } catch (_) {
  }
};
function getNextChunkUrl(url, res) {
  const shapeHandle = res.headers.get(SHAPE_HANDLE_HEADER);
  const lastOffset = res.headers.get(CHUNK_LAST_OFFSET_HEADER);
  const isUpToDate = res.headers.has(CHUNK_UP_TO_DATE_HEADER);
  if (!shapeHandle || !lastOffset || isUpToDate) return;
  const nextUrl = new URL(url);
  if (nextUrl.searchParams.has(LIVE_QUERY_PARAM)) return;
  nextUrl.searchParams.set(SHAPE_HANDLE_QUERY_PARAM, shapeHandle);
  nextUrl.searchParams.set(OFFSET_QUERY_PARAM, lastOffset);
  nextUrl.searchParams.sort();
  return nextUrl.toString();
}
function chainAborter(aborter, sourceSignal) {
  let cleanup = noop;
  if (!sourceSignal) {
  } else if (sourceSignal.aborted) {
    aborter.abort();
  } else {
    const abortParent = () => aborter.abort();
    sourceSignal.addEventListener(`abort`, abortParent, {
      once: true,
      signal: aborter.signal
    });
    cleanup = () => sourceSignal.removeEventListener(`abort`, abortParent);
  }
  return {
    signal: aborter.signal,
    cleanup
  };
}
function noop() {
}

// src/client.ts
var RESERVED_PARAMS = /* @__PURE__ */ new Set([
  LIVE_CACHE_BUSTER_QUERY_PARAM,
  SHAPE_HANDLE_QUERY_PARAM,
  LIVE_QUERY_PARAM,
  OFFSET_QUERY_PARAM
]);
function resolveValue(value) {
  return __async(this, null, function* () {
    if (typeof value === `function`) {
      return value();
    }
    return value;
  });
}
function toInternalParams(params) {
  return __async(this, null, function* () {
    const entries = Object.entries(params);
    const resolvedEntries = yield Promise.all(
      entries.map((_0) => __async(this, [_0], function* ([key, value]) {
        if (value === void 0) return [key, void 0];
        const resolvedValue = yield resolveValue(value);
        return [
          key,
          Array.isArray(resolvedValue) ? resolvedValue.join(`,`) : resolvedValue
        ];
      }))
    );
    return Object.fromEntries(
      resolvedEntries.filter(([_, value]) => value !== void 0)
    );
  });
}
function resolveHeaders(headers) {
  return __async(this, null, function* () {
    if (!headers) return {};
    const entries = Object.entries(headers);
    const resolvedEntries = yield Promise.all(
      entries.map((_0) => __async(this, [_0], function* ([key, value]) {
        return [key, yield resolveValue(value)];
      }))
    );
    return Object.fromEntries(resolvedEntries);
  });
}
var _error, _fetchClient2, _messageParser, _subscribers, _started, _lastOffset, _liveCacheBuster, _lastSyncedAt, _isUpToDate, _connected, _shapeHandle, _schema, _onError, _requestAbortController, _isRefreshing, _tickPromise, _tickPromiseResolver, _tickPromiseRejecter, _ShapeStream_instances, start_fn, nextTick_fn, publish_fn, sendErrorToSubscribers_fn, reset_fn;
var ShapeStream = class {
  constructor(options) {
    __privateAdd(this, _ShapeStream_instances);
    __privateAdd(this, _error, null);
    __privateAdd(this, _fetchClient2);
    __privateAdd(this, _messageParser);
    __privateAdd(this, _subscribers, /* @__PURE__ */ new Map());
    __privateAdd(this, _started, false);
    __privateAdd(this, _lastOffset);
    __privateAdd(this, _liveCacheBuster);
    // Seconds since our Electric Epoch 😎
    __privateAdd(this, _lastSyncedAt);
    // unix time
    __privateAdd(this, _isUpToDate, false);
    __privateAdd(this, _connected, false);
    __privateAdd(this, _shapeHandle);
    __privateAdd(this, _schema);
    __privateAdd(this, _onError);
    __privateAdd(this, _requestAbortController);
    __privateAdd(this, _isRefreshing, false);
    __privateAdd(this, _tickPromise);
    __privateAdd(this, _tickPromiseResolver);
    __privateAdd(this, _tickPromiseRejecter);
    var _a, _b, _c;
    this.options = __spreadValues({ subscribe: true }, options);
    validateOptions(this.options);
    __privateSet(this, _lastOffset, (_a = this.options.offset) != null ? _a : `-1`);
    __privateSet(this, _liveCacheBuster, ``);
    __privateSet(this, _shapeHandle, this.options.handle);
    __privateSet(this, _messageParser, new MessageParser(options.parser));
    __privateSet(this, _onError, this.options.onError);
    const baseFetchClient = (_b = options.fetchClient) != null ? _b : (...args) => fetch(...args);
    const fetchWithBackoffClient = createFetchWithBackoff(baseFetchClient, __spreadProps(__spreadValues({}, (_c = options.backoffOptions) != null ? _c : BackoffDefaults), {
      onFailedAttempt: () => {
        var _a2, _b2;
        __privateSet(this, _connected, false);
        (_b2 = (_a2 = options.backoffOptions) == null ? void 0 : _a2.onFailedAttempt) == null ? void 0 : _b2.call(_a2);
      }
    }));
    __privateSet(this, _fetchClient2, createFetchWithResponseHeadersCheck(
      createFetchWithChunkBuffer(fetchWithBackoffClient)
    ));
  }
  get shapeHandle() {
    return __privateGet(this, _shapeHandle);
  }
  get error() {
    return __privateGet(this, _error);
  }
  get isUpToDate() {
    return __privateGet(this, _isUpToDate);
  }
  get lastOffset() {
    return __privateGet(this, _lastOffset);
  }
  subscribe(callback, onError = () => {
  }) {
    const subscriptionId = Math.random();
    __privateGet(this, _subscribers).set(subscriptionId, [callback, onError]);
    if (!__privateGet(this, _started)) __privateMethod(this, _ShapeStream_instances, start_fn).call(this);
    return () => {
      __privateGet(this, _subscribers).delete(subscriptionId);
    };
  }
  unsubscribeAll() {
    __privateGet(this, _subscribers).clear();
  }
  /** Unix time at which we last synced. Undefined when `isLoading` is true. */
  lastSyncedAt() {
    return __privateGet(this, _lastSyncedAt);
  }
  /** Time elapsed since last sync (in ms). Infinity if we did not yet sync. */
  lastSynced() {
    if (__privateGet(this, _lastSyncedAt) === void 0) return Infinity;
    return Date.now() - __privateGet(this, _lastSyncedAt);
  }
  /** Indicates if we are connected to the Electric sync service. */
  isConnected() {
    return __privateGet(this, _connected);
  }
  /** True during initial fetch. False afterwise.  */
  isLoading() {
    return !__privateGet(this, _isUpToDate);
  }
  hasStarted() {
    return __privateGet(this, _started);
  }
  /**
   * Refreshes the shape stream.
   * This preemptively aborts any ongoing long poll and reconnects without
   * long polling, ensuring that the stream receives an up to date message with the
   * latest LSN from Postgres at that point in time.
   */
  forceDisconnectAndRefresh() {
    return __async(this, null, function* () {
      var _a, _b;
      __privateSet(this, _isRefreshing, true);
      if (__privateGet(this, _isUpToDate) && !((_a = __privateGet(this, _requestAbortController)) == null ? void 0 : _a.signal.aborted)) {
        (_b = __privateGet(this, _requestAbortController)) == null ? void 0 : _b.abort(FORCE_DISCONNECT_AND_REFRESH);
      }
      yield __privateMethod(this, _ShapeStream_instances, nextTick_fn).call(this);
      __privateSet(this, _isRefreshing, false);
    });
  }
};
_error = new WeakMap();
_fetchClient2 = new WeakMap();
_messageParser = new WeakMap();
_subscribers = new WeakMap();
_started = new WeakMap();
_lastOffset = new WeakMap();
_liveCacheBuster = new WeakMap();
_lastSyncedAt = new WeakMap();
_isUpToDate = new WeakMap();
_connected = new WeakMap();
_shapeHandle = new WeakMap();
_schema = new WeakMap();
_onError = new WeakMap();
_requestAbortController = new WeakMap();
_isRefreshing = new WeakMap();
_tickPromise = new WeakMap();
_tickPromiseResolver = new WeakMap();
_tickPromiseRejecter = new WeakMap();
_ShapeStream_instances = new WeakSet();
start_fn = function() {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e;
    if (__privateGet(this, _started)) throw new Error(`Cannot start stream twice`);
    __privateSet(this, _started, true);
    try {
      while (!((_a = this.options.signal) == null ? void 0 : _a.aborted) && !__privateGet(this, _isUpToDate) || this.options.subscribe) {
        const { url, signal } = this.options;
        const [requestHeaders, params] = yield Promise.all([
          resolveHeaders(this.options.headers),
          this.options.params ? toInternalParams(convertWhereParamsToObj(this.options.params)) : void 0
        ]);
        if (params) {
          validateParams(params);
        }
        const fetchUrl = new URL(url);
        if (params) {
          if (params.table)
            setQueryParam(fetchUrl, TABLE_QUERY_PARAM, params.table);
          if (params.where)
            setQueryParam(fetchUrl, WHERE_QUERY_PARAM, params.where);
          if (params.columns)
            setQueryParam(fetchUrl, COLUMNS_QUERY_PARAM, params.columns);
          if (params.replica)
            setQueryParam(fetchUrl, REPLICA_PARAM, params.replica);
          if (params.params)
            setQueryParam(fetchUrl, WHERE_PARAMS_PARAM, params.params);
          const customParams = __spreadValues({}, params);
          delete customParams.table;
          delete customParams.where;
          delete customParams.columns;
          delete customParams.replica;
          delete customParams.params;
          for (const [key, value] of Object.entries(customParams)) {
            setQueryParam(fetchUrl, key, value);
          }
        }
        fetchUrl.searchParams.set(OFFSET_QUERY_PARAM, __privateGet(this, _lastOffset));
        if (__privateGet(this, _isUpToDate)) {
          if (!__privateGet(this, _isRefreshing)) {
            fetchUrl.searchParams.set(LIVE_QUERY_PARAM, `true`);
          }
          fetchUrl.searchParams.set(
            LIVE_CACHE_BUSTER_QUERY_PARAM,
            __privateGet(this, _liveCacheBuster)
          );
        }
        if (__privateGet(this, _shapeHandle)) {
          fetchUrl.searchParams.set(
            SHAPE_HANDLE_QUERY_PARAM,
            __privateGet(this, _shapeHandle)
          );
        }
        fetchUrl.searchParams.sort();
        __privateSet(this, _requestAbortController, new AbortController());
        let abortListener;
        if (signal) {
          abortListener = () => {
            var _a2;
            (_a2 = __privateGet(this, _requestAbortController)) == null ? void 0 : _a2.abort(signal.reason);
          };
          signal.addEventListener(`abort`, abortListener, { once: true });
          if (signal.aborted) {
            (_b = __privateGet(this, _requestAbortController)) == null ? void 0 : _b.abort(signal.reason);
          }
        }
        let response;
        try {
          response = yield __privateGet(this, _fetchClient2).call(this, fetchUrl.toString(), {
            signal: __privateGet(this, _requestAbortController).signal,
            headers: requestHeaders
          });
          __privateSet(this, _connected, true);
        } catch (e) {
          if ((e instanceof FetchError || e instanceof FetchBackoffAbortError) && __privateGet(this, _requestAbortController).signal.aborted && __privateGet(this, _requestAbortController).signal.reason === FORCE_DISCONNECT_AND_REFRESH) {
            continue;
          }
          if (e instanceof FetchBackoffAbortError) break;
          if (!(e instanceof FetchError)) throw e;
          if (e.status == 409) {
            const newShapeHandle = e.headers[SHAPE_HANDLE_HEADER];
            __privateMethod(this, _ShapeStream_instances, reset_fn).call(this, newShapeHandle);
            yield __privateMethod(this, _ShapeStream_instances, publish_fn).call(this, e.json);
            continue;
          } else if (e.status >= 400 && e.status < 500) {
            __privateMethod(this, _ShapeStream_instances, sendErrorToSubscribers_fn).call(this, e);
            throw e;
          }
        } finally {
          if (abortListener && signal) {
            signal.removeEventListener(`abort`, abortListener);
          }
          __privateSet(this, _requestAbortController, void 0);
        }
        const { headers, status } = response;
        const shapeHandle = headers.get(SHAPE_HANDLE_HEADER);
        if (shapeHandle) {
          __privateSet(this, _shapeHandle, shapeHandle);
        }
        const lastOffset = headers.get(CHUNK_LAST_OFFSET_HEADER);
        if (lastOffset) {
          __privateSet(this, _lastOffset, lastOffset);
        }
        const liveCacheBuster = headers.get(LIVE_CACHE_BUSTER_HEADER);
        if (liveCacheBuster) {
          __privateSet(this, _liveCacheBuster, liveCacheBuster);
        }
        const getSchema = () => {
          const schemaHeader = headers.get(SHAPE_SCHEMA_HEADER);
          return schemaHeader ? JSON.parse(schemaHeader) : {};
        };
        __privateSet(this, _schema, (_c = __privateGet(this, _schema)) != null ? _c : getSchema());
        const messages = status === 204 ? `[]` : yield response.text();
        if (status === 204) {
          __privateSet(this, _lastSyncedAt, Date.now());
        }
        const batch = __privateGet(this, _messageParser).parse(messages, __privateGet(this, _schema));
        if (batch.length > 0) {
          const lastMessage = batch[batch.length - 1];
          if (isUpToDateMessage(lastMessage)) {
            __privateSet(this, _lastSyncedAt, Date.now());
            __privateSet(this, _isUpToDate, true);
          }
          yield __privateMethod(this, _ShapeStream_instances, publish_fn).call(this, batch);
        }
        (_d = __privateGet(this, _tickPromiseResolver)) == null ? void 0 : _d.call(this);
      }
    } catch (err) {
      __privateSet(this, _error, err);
      if (__privateGet(this, _onError)) {
        const retryOpts = yield __privateGet(this, _onError).call(this, err);
        if (typeof retryOpts === `object`) {
          __privateMethod(this, _ShapeStream_instances, reset_fn).call(this);
          if (`params` in retryOpts) {
            this.options.params = retryOpts.params;
          }
          if (`headers` in retryOpts) {
            this.options.headers = retryOpts.headers;
          }
          __privateSet(this, _started, false);
          __privateMethod(this, _ShapeStream_instances, start_fn).call(this);
        }
        return;
      }
      throw err;
    } finally {
      __privateSet(this, _connected, false);
      (_e = __privateGet(this, _tickPromiseRejecter)) == null ? void 0 : _e.call(this);
    }
  });
};
nextTick_fn = function() {
  return __async(this, null, function* () {
    if (__privateGet(this, _tickPromise)) {
      return __privateGet(this, _tickPromise);
    }
    __privateSet(this, _tickPromise, new Promise((resolve, reject) => {
      __privateSet(this, _tickPromiseResolver, resolve);
      __privateSet(this, _tickPromiseRejecter, reject);
    }));
    __privateGet(this, _tickPromise).finally(() => {
      __privateSet(this, _tickPromise, void 0);
      __privateSet(this, _tickPromiseResolver, void 0);
      __privateSet(this, _tickPromiseRejecter, void 0);
    });
    return __privateGet(this, _tickPromise);
  });
};
publish_fn = function(messages) {
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
};
sendErrorToSubscribers_fn = function(error) {
  __privateGet(this, _subscribers).forEach(([_, errorFn]) => {
    errorFn == null ? void 0 : errorFn(error);
  });
};
/**
 * Resets the state of the stream, optionally with a provided
 * shape handle
 */
reset_fn = function(handle) {
  __privateSet(this, _lastOffset, `-1`);
  __privateSet(this, _liveCacheBuster, ``);
  __privateSet(this, _shapeHandle, handle);
  __privateSet(this, _isUpToDate, false);
  __privateSet(this, _connected, false);
  __privateSet(this, _schema, void 0);
};
ShapeStream.Replica = {
  FULL: `full`,
  DEFAULT: `default`
};
function validateParams(params) {
  if (!params) return;
  const reservedParams = Object.keys(params).filter(
    (key) => RESERVED_PARAMS.has(key)
  );
  if (reservedParams.length > 0) {
    throw new ReservedParamError(reservedParams);
  }
}
function validateOptions(options) {
  if (!options.url) {
    throw new MissingShapeUrlError();
  }
  if (options.signal && !(options.signal instanceof AbortSignal)) {
    throw new InvalidSignalError();
  }
  if (options.offset !== void 0 && options.offset !== `-1` && !options.handle) {
    throw new MissingShapeHandleError();
  }
  validateParams(options.params);
  return;
}
function setQueryParam(url, key, value) {
  if (value === void 0 || value == null) {
    return;
  } else if (typeof value === `string`) {
    url.searchParams.set(key, value);
  } else if (typeof value === `object`) {
    for (const [k, v] of Object.entries(value)) {
      url.searchParams.set(`${key}[${k}]`, v);
    }
  } else {
    url.searchParams.set(key, value.toString());
  }
}
function convertWhereParamsToObj(allPgParams) {
  if (Array.isArray(allPgParams.params)) {
    return __spreadProps(__spreadValues({}, allPgParams), {
      params: Object.fromEntries(allPgParams.params.map((v, i) => [i + 1, v]))
    });
  }
  return allPgParams;
}

// src/shape.ts
var _data, _subscribers2, _status, _error2, _Shape_instances, process_fn, updateShapeStatus_fn, handleError_fn, notify_fn;
var Shape = class {
  constructor(stream) {
    __privateAdd(this, _Shape_instances);
    __privateAdd(this, _data, /* @__PURE__ */ new Map());
    __privateAdd(this, _subscribers2, /* @__PURE__ */ new Map());
    __privateAdd(this, _status, `syncing`);
    __privateAdd(this, _error2, false);
    this.stream = stream;
    this.stream.subscribe(
      __privateMethod(this, _Shape_instances, process_fn).bind(this),
      __privateMethod(this, _Shape_instances, handleError_fn).bind(this)
    );
  }
  get isUpToDate() {
    return __privateGet(this, _status) === `up-to-date`;
  }
  get lastOffset() {
    return this.stream.lastOffset;
  }
  get handle() {
    return this.stream.shapeHandle;
  }
  get rows() {
    return this.value.then((v) => Array.from(v.values()));
  }
  get currentRows() {
    return Array.from(this.currentValue.values());
  }
  get value() {
    return new Promise((resolve, reject) => {
      if (this.stream.isUpToDate) {
        resolve(this.currentValue);
      } else {
        const unsubscribe = this.subscribe(({ value }) => {
          unsubscribe();
          if (__privateGet(this, _error2)) reject(__privateGet(this, _error2));
          resolve(value);
        });
      }
    });
  }
  get currentValue() {
    return __privateGet(this, _data);
  }
  get error() {
    return __privateGet(this, _error2);
  }
  /** Unix time at which we last synced. Undefined when `isLoading` is true. */
  lastSyncedAt() {
    return this.stream.lastSyncedAt();
  }
  /** Time elapsed since last sync (in ms). Infinity if we did not yet sync. */
  lastSynced() {
    return this.stream.lastSynced();
  }
  /** True during initial fetch. False afterwise.  */
  isLoading() {
    return this.stream.isLoading();
  }
  /** Indicates if we are connected to the Electric sync service. */
  isConnected() {
    return this.stream.isConnected();
  }
  subscribe(callback) {
    const subscriptionId = Math.random();
    __privateGet(this, _subscribers2).set(subscriptionId, callback);
    return () => {
      __privateGet(this, _subscribers2).delete(subscriptionId);
    };
  }
  unsubscribeAll() {
    __privateGet(this, _subscribers2).clear();
  }
  get numSubscribers() {
    return __privateGet(this, _subscribers2).size;
  }
};
_data = new WeakMap();
_subscribers2 = new WeakMap();
_status = new WeakMap();
_error2 = new WeakMap();
_Shape_instances = new WeakSet();
process_fn = function(messages) {
  let shouldNotify = false;
  messages.forEach((message) => {
    if (isChangeMessage(message)) {
      shouldNotify = __privateMethod(this, _Shape_instances, updateShapeStatus_fn).call(this, `syncing`);
      switch (message.headers.operation) {
        case `insert`:
          __privateGet(this, _data).set(message.key, message.value);
          break;
        case `update`:
          __privateGet(this, _data).set(message.key, __spreadValues(__spreadValues({}, __privateGet(this, _data).get(message.key)), message.value));
          break;
        case `delete`:
          __privateGet(this, _data).delete(message.key);
          break;
      }
    }
    if (isControlMessage(message)) {
      switch (message.headers.control) {
        case `up-to-date`:
          shouldNotify = __privateMethod(this, _Shape_instances, updateShapeStatus_fn).call(this, `up-to-date`);
          break;
        case `must-refetch`:
          __privateGet(this, _data).clear();
          __privateSet(this, _error2, false);
          shouldNotify = __privateMethod(this, _Shape_instances, updateShapeStatus_fn).call(this, `syncing`);
          break;
      }
    }
  });
  if (shouldNotify) __privateMethod(this, _Shape_instances, notify_fn).call(this);
};
updateShapeStatus_fn = function(status) {
  const stateChanged = __privateGet(this, _status) !== status;
  __privateSet(this, _status, status);
  return stateChanged && status === `up-to-date`;
};
handleError_fn = function(e) {
  if (e instanceof FetchError) {
    __privateSet(this, _error2, e);
    __privateMethod(this, _Shape_instances, notify_fn).call(this);
  }
};
notify_fn = function() {
  __privateGet(this, _subscribers2).forEach((callback) => {
    callback({ value: this.currentValue, rows: this.currentRows });
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BackoffDefaults,
  FetchError,
  Shape,
  ShapeStream,
  isChangeMessage,
  isControlMessage,
  resolveValue
});
//# sourceMappingURL=index.cjs.map