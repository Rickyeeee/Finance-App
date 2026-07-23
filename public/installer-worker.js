import { Writable } from "node:stream";
import { EventEmitter } from "node:events";

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
var init_utils = __esm({
  "node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(createNotImplementedError, "createNotImplementedError");
    __name(notImplemented, "notImplemented");
    __name(notImplementedClass, "notImplementedClass");
  }
});

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin, _performanceNow, nodeTiming, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceResourceTiming, PerformanceObserverEntryList, Performance, PerformanceObserver, performance;
var init_performance = __esm({
  "node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
    nodeTiming = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry = class {
      static {
        __name(this, "PerformanceEntry");
      }
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name, options) {
        this.name = name;
        this.startTime = options?.startTime || _performanceNow();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
      static {
        __name(this, "PerformanceMark");
      }
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    };
    PerformanceMeasure = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceMeasure");
      }
      entryType = "measure";
    };
    PerformanceResourceTiming = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceResourceTiming");
      }
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    PerformanceObserverEntryList = class {
      static {
        __name(this, "PerformanceObserverEntryList");
      }
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    Performance = class {
      static {
        __name(this, "Performance");
      }
      __unenv__ = true;
      timeOrigin = _timeOrigin;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw createNotImplementedError("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin) {
          return _performanceNow();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name, type) {
        return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
      }
      mark(name, options) {
        const entry = new PerformanceMark(name, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure(measureName, {
          startTime: start,
          detail: {
            start,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw createNotImplementedError("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    PerformanceObserver = class {
      static {
        __name(this, "PerformanceObserver");
      }
      __unenv__ = true;
      static supportedEntryTypes = [];
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw createNotImplementedError("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw createNotImplementedError("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();
  }
});

// node_modules/unenv/dist/runtime/node/perf_hooks.mjs
var init_perf_hooks = __esm({
  "node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
var init_performance2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    if (!("__unenv__" in performance)) {
      const proto = Performance.prototype;
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key !== "constructor" && !(key in performance)) {
          const desc = Object.getOwnPropertyDescriptor(proto, key);
          if (desc) {
            Object.defineProperty(performance, key, desc);
          }
        }
      }
    }
    globalThis.performance = performance;
    globalThis.Performance = Performance;
    globalThis.PerformanceEntry = PerformanceEntry;
    globalThis.PerformanceMark = PerformanceMark;
    globalThis.PerformanceMeasure = PerformanceMeasure;
    globalThis.PerformanceObserver = PerformanceObserver;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming;
  }
});

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default;
var init_noop = __esm({
  "node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default = Object.assign(() => {
    }, { __unenv__: true });
  }
});

// node_modules/unenv/dist/runtime/node/console.mjs
var _console, _ignoreErrors, _stderr, _stdout, log, info, trace, debug, table, error, warn, createTask, clear, count, countReset, dir, dirxml, group, groupEnd, groupCollapsed, profile, profileEnd, time, timeEnd, timeLog, timeStamp, Console, _times, _stdoutErrorHandler, _stderrErrorHandler;
var init_console = __esm({
  "node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console = globalThis.console;
    _ignoreErrors = true;
    _stderr = new Writable();
    _stdout = new Writable();
    log = _console?.log ?? noop_default;
    info = _console?.info ?? log;
    trace = _console?.trace ?? info;
    debug = _console?.debug ?? log;
    table = _console?.table ?? log;
    error = _console?.error ?? log;
    warn = _console?.warn ?? error;
    createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
    clear = _console?.clear ?? noop_default;
    count = _console?.count ?? noop_default;
    countReset = _console?.countReset ?? noop_default;
    dir = _console?.dir ?? noop_default;
    dirxml = _console?.dirxml ?? noop_default;
    group = _console?.group ?? noop_default;
    groupEnd = _console?.groupEnd ?? noop_default;
    groupCollapsed = _console?.groupCollapsed ?? noop_default;
    profile = _console?.profile ?? noop_default;
    profileEnd = _console?.profileEnd ?? noop_default;
    time = _console?.time ?? noop_default;
    timeEnd = _console?.timeEnd ?? noop_default;
    timeLog = _console?.timeLog ?? noop_default;
    timeStamp = _console?.timeStamp ?? noop_default;
    Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
    _times = /* @__PURE__ */ new Map();
    _stdoutErrorHandler = noop_default;
    _stderrErrorHandler = noop_default;
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole, assert, clear2, context, count2, countReset2, createTask2, debug2, dir2, dirxml2, error2, group2, groupCollapsed2, groupEnd2, info2, log2, profile2, profileEnd2, table2, time2, timeEnd2, timeLog2, timeStamp2, trace2, warn2, console_default;
var init_console2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole = globalThis["console"];
    ({
      assert,
      clear: clear2,
      context: (
        // @ts-expect-error undocumented public API
        context
      ),
      count: count2,
      countReset: countReset2,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask2
      ),
      debug: debug2,
      dir: dir2,
      dirxml: dirxml2,
      error: error2,
      group: group2,
      groupCollapsed: groupCollapsed2,
      groupEnd: groupEnd2,
      info: info2,
      log: log2,
      profile: profile2,
      profileEnd: profileEnd2,
      table: table2,
      time: time2,
      timeEnd: timeEnd2,
      timeLog: timeLog2,
      timeStamp: timeStamp2,
      trace: trace2,
      warn: warn2
    } = workerdConsole);
    Object.assign(workerdConsole, {
      Console,
      _ignoreErrors,
      _stderr,
      _stderrErrorHandler,
      _stdout,
      _stdoutErrorHandler,
      _times
    });
    console_default = workerdConsole;
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default;
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime;
var init_hrtime = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
      return BigInt(Date.now() * 1e6);
    }, "bigint") });
  }
});

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream;
var init_read_stream = __esm({
  "node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream = class {
      static {
        __name(this, "ReadStream");
      }
      fd;
      isRaw = false;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
    };
  }
});

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream;
var init_write_stream = __esm({
  "node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream = class {
      static {
        __name(this, "WriteStream");
      }
      fd;
      columns = 80;
      rows = 24;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      clearLine(dir3, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x, y, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env2) {
        return 1;
      }
      hasColors(count3, env2) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      write(str, encoding, cb) {
        if (str instanceof Uint8Array) {
          str = new TextDecoder().decode(str);
        }
        try {
          console.log(str);
        } catch {
        }
        cb && typeof cb === "function" && cb();
        return false;
      }
    };
  }
});

// node_modules/unenv/dist/runtime/node/tty.mjs
var init_tty = __esm({
  "node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION;
var init_node_version = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    NODE_VERSION = "22.14.0";
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process;
var init_process = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    init_node_version();
    Process = class _Process extends EventEmitter {
      static {
        __name(this, "Process");
      }
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      // --- event emitter ---
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args) {
        return super.emit(...args);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      // --- stdio (lazy initializers) ---
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream(2);
      }
      // --- cwd ---
      #cwd = "/";
      chdir(cwd2) {
        this.#cwd = cwd2;
      }
      cwd() {
        return this.#cwd;
      }
      // --- dummy props and getters ---
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return `v${NODE_VERSION}`;
      }
      get versions() {
        return { node: NODE_VERSION };
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      // --- noop methods ---
      ref() {
      }
      unref() {
      }
      // --- unimplemented methods ---
      umask() {
        throw createNotImplementedError("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw createNotImplementedError("process.getActiveResourcesInfo");
      }
      exit() {
        throw createNotImplementedError("process.exit");
      }
      reallyExit() {
        throw createNotImplementedError("process.reallyExit");
      }
      kill() {
        throw createNotImplementedError("process.kill");
      }
      abort() {
        throw createNotImplementedError("process.abort");
      }
      dlopen() {
        throw createNotImplementedError("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw createNotImplementedError("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw createNotImplementedError("process.loadEnvFile");
      }
      disconnect() {
        throw createNotImplementedError("process.disconnect");
      }
      cpuUsage() {
        throw createNotImplementedError("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw createNotImplementedError("process.initgroups");
      }
      openStdin() {
        throw createNotImplementedError("process.openStdin");
      }
      assert() {
        throw createNotImplementedError("process.assert");
      }
      binding() {
        throw createNotImplementedError("process.binding");
      }
      // --- attached interfaces ---
      permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
      // --- undefined props ---
      mainModule = void 0;
      domain = void 0;
      // optional
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      // internals
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess, getBuiltinModule, workerdProcess, unenvProcess, exit, features, platform, _channel, _debugEnd, _debugProcess, _disconnect, _events, _eventsCount, _exiting, _fatalException, _getActiveHandles, _getActiveRequests, _handleQueue, _kill, _linkedBinding, _maxListeners, _pendingMessage, _preload_modules, _rawDebug, _send, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, abort, addListener, allowedNodeEnvironmentFlags, arch, argv, argv0, assert2, availableMemory, binding, channel, chdir, config, connected, constrainedMemory, cpuUsage, cwd, debugPort, disconnect, dlopen, domain, emit, emitWarning, env, eventNames, execArgv, execPath, exitCode, finalization, getActiveResourcesInfo, getegid, geteuid, getgid, getgroups, getMaxListeners, getuid, hasUncaughtExceptionCaptureCallback, hrtime3, initgroups, kill, listenerCount, listeners, loadEnvFile, mainModule, memoryUsage, moduleLoadList, nextTick, off, on, once, openStdin, permission, pid, ppid, prependListener, prependOnceListener, rawListeners, reallyExit, ref, release, removeAllListeners, removeListener, report, resourceUsage, send, setegid, seteuid, setgid, setgroups, setMaxListeners, setSourceMapsEnabled, setuid, setUncaughtExceptionCaptureCallback, sourceMapsEnabled, stderr, stdin, stdout, throwDeprecation, title, traceDeprecation, umask, unref, uptime, version, versions, _process, process_default;
var init_process2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess = globalThis["process"];
    getBuiltinModule = globalProcess.getBuiltinModule;
    workerdProcess = getBuiltinModule("node:process");
    unenvProcess = new Process({
      env: globalProcess.env,
      hrtime,
      // `nextTick` is available from workerd process v1
      nextTick: workerdProcess.nextTick
    });
    ({ exit, features, platform } = workerdProcess);
    ({
      _channel,
      _debugEnd,
      _debugProcess,
      _disconnect,
      _events,
      _eventsCount,
      _exiting,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _handleQueue,
      _kill,
      _linkedBinding,
      _maxListeners,
      _pendingMessage,
      _preload_modules,
      _rawDebug,
      _send,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      arch,
      argv,
      argv0,
      assert: assert2,
      availableMemory,
      binding,
      channel,
      chdir,
      config,
      connected,
      constrainedMemory,
      cpuUsage,
      cwd,
      debugPort,
      disconnect,
      dlopen,
      domain,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exitCode,
      finalization,
      getActiveResourcesInfo,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getMaxListeners,
      getuid,
      hasUncaughtExceptionCaptureCallback,
      hrtime: hrtime3,
      initgroups,
      kill,
      listenerCount,
      listeners,
      loadEnvFile,
      mainModule,
      memoryUsage,
      moduleLoadList,
      nextTick,
      off,
      on,
      once,
      openStdin,
      permission,
      pid,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      reallyExit,
      ref,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      send,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setMaxListeners,
      setSourceMapsEnabled,
      setuid,
      setUncaughtExceptionCaptureCallback,
      sourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      throwDeprecation,
      title,
      traceDeprecation,
      umask,
      unref,
      uptime,
      version,
      versions
    } = unenvProcess);
    _process = {
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exit,
      finalization,
      features,
      getBuiltinModule,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      nextTick,
      on,
      off,
      once,
      pid,
      platform,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      // @ts-expect-error old API
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    };
    process_default = _process;
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default;
  }
});

// src/db/queries.ts
var queries_exports = {};
__export(queries_exports, {
  createAsset: () => createAsset,
  createCategory: () => createCategory,
  createInvestmentTrade: () => createInvestmentTrade,
  createReconciliationItem: () => createReconciliationItem,
  createRecurring: () => createRecurring,
  createTransaction: () => createTransaction,
  createTransfer: () => createTransfer,
  deleteAsset: () => deleteAsset,
  deleteCategory: () => deleteCategory,
  deleteInvestment: () => deleteInvestment,
  deleteInvestmentTrade: () => deleteInvestmentTrade,
  deleteRecurring: () => deleteRecurring,
  deleteTransaction: () => deleteTransaction,
  deleteTransferPair: () => deleteTransferPair,
  findDuplicateTransaction: () => findDuplicateTransaction,
  generateId: () => generateId,
  getAssetById: () => getAssetById,
  getAssetHistory: () => getAssetHistory,
  getAssets: () => getAssets,
  getCategories: () => getCategories,
  getDailySummary: () => getDailySummary,
  getInvestmentTrades: () => getInvestmentTrades,
  getInvestments: () => getInvestments,
  getMonthlySummary: () => getMonthlySummary,
  getReconciliations: () => getReconciliations,
  getRecurring: () => getRecurring,
  getTransactions: () => getTransactions,
  processRecurring: () => processRecurring,
  recordAssetSnapshot: () => recordAssetSnapshot,
  updateAsset: () => updateAsset,
  updateAssetFull: () => updateAssetFull,
  updateCategory: () => updateCategory,
  updateInvestment: () => updateInvestment,
  updateReconciliationItem: () => updateReconciliationItem,
  updateRecurring: () => updateRecurring,
  updateTransaction: () => updateTransaction,
  upsertDailySummary: () => upsertDailySummary,
  upsertInvestment: () => upsertInvestment
});
function generateId(prefix = "tx") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
async function getTransactions(db, opts) {
  const conditions = [];
  const params = [];
  if (opts.date) {
    conditions.push("date = ?");
    params.push(opts.date);
  }
  if (opts.month) {
    conditions.push("strftime('%Y-%m', date) = ?");
    params.push(opts.month);
  }
  if (opts.date_from) {
    conditions.push("date >= ?");
    params.push(opts.date_from);
  }
  if (opts.date_to) {
    conditions.push("date <= ?");
    params.push(opts.date_to);
  }
  if (opts.category) {
    conditions.push("category = ?");
    params.push(opts.category);
  }
  if (opts.status) {
    conditions.push("status = ?");
    params.push(opts.status);
  }
  if (opts.type) {
    conditions.push("type = ?");
    params.push(opts.type);
  }
  if (opts.account_id) {
    conditions.push("account_id = ?");
    params.push(opts.account_id);
  } else if (opts.card) {
    conditions.push("card = ?");
    params.push(opts.card);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const { results } = await db.prepare(`SELECT * FROM transactions ${where} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
  const countRow = await db.prepare(`SELECT COUNT(*) as total FROM transactions ${where}`).bind(...params).first();
  return { data: results, total: countRow?.total ?? 0 };
}
async function adjustAssetBalance(db, accountName, delta) {
  if (!accountName) return;
  await db.prepare("UPDATE assets SET balance = balance + ?, updated_at = date('now') WHERE name = ?").bind(delta, accountName).run();
}
async function calcAssetDelta(db, accountName, amount, type) {
  const asset = await db.prepare("SELECT type FROM assets WHERE name = ?").bind(accountName).first();
  if (!asset) return 0;
  const isIncome = type === "\u6536\u5165";
  return isIncome ? amount : -amount;
}
async function createTransaction(db, data) {
  const id = generateId("tx");
  await db.prepare("INSERT INTO transactions (id, name, amount, date, category, card, account_id, type, status, source, note, transfer_id, recurring_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, data.name, data.amount, data.date, data.category, data.card, data.account_id ?? null, data.type ?? "\u652F\u51FA", data.status, data.source, data.note ?? null, data.transfer_id ?? null, data.recurring_id ?? null).run();
  if (data.source !== "\u9918\u984D\u8ABF\u6574" && data.card) {
    const delta = await calcAssetDelta(db, data.card, data.amount, data.type ?? "\u652F\u51FA");
    await adjustAssetBalance(db, data.card, delta);
  }
  return id;
}
async function createTransfer(db, data) {
  const transferId = generateId("xfr");
  await createTransaction(db, {
    name: data.outName ?? `\u8F49\u5E33 \u2192 ${data.to_account}`,
    amount: data.amount,
    date: data.date,
    category: "\u8F49\u5E33",
    card: data.from_account,
    type: "\u652F\u51FA",
    status: "\u5DF2\u5C0D\u5E33",
    source: "\u624B\u52D5\u8F38\u5165",
    note: data.note ?? null,
    transfer_id: transferId
  });
  await createTransaction(db, {
    name: data.inName ?? `\u8F49\u5E33 \u2190 ${data.from_account}`,
    amount: data.amount,
    date: data.date,
    category: "\u8F49\u5E33",
    card: data.to_account,
    type: "\u6536\u5165",
    status: "\u5DF2\u5C0D\u5E33",
    source: "\u624B\u52D5\u8F38\u5165",
    note: data.note ?? null,
    transfer_id: transferId
  });
  if (data.fee && data.fee > 0) {
    await createTransaction(db, {
      name: `\u624B\u7E8C\u8CBB\uFF08\u8F49\u5E33\u81F3 ${data.to_account}\uFF09`,
      amount: data.fee,
      date: data.date,
      category: "\u624B\u7E8C\u8CBB",
      card: data.from_account,
      type: "\u652F\u51FA",
      status: "\u5DF2\u5C0D\u5E33",
      source: "\u624B\u52D5\u8F38\u5165",
      note: null,
      transfer_id: transferId
    });
  }
  return transferId;
}
async function deleteTransferPair(db, transferId) {
  const { results } = await db.prepare("SELECT card, amount, type FROM transactions WHERE transfer_id = ?").bind(transferId).all();
  await db.prepare("DELETE FROM transactions WHERE transfer_id = ?").bind(transferId).run();
  for (const txn of results) {
    if (txn.card) {
      const delta = await calcAssetDelta(db, txn.card, txn.amount, txn.type);
      await adjustAssetBalance(db, txn.card, -delta);
    }
  }
}
async function updateTransaction(db, id, data) {
  const old = await db.prepare("SELECT card, amount, type, source FROM transactions WHERE id = ?").bind(id).first();
  const fields = Object.keys(data).filter((k) => data[k] !== void 0);
  if (!fields.length) return false;
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f]);
  const result = await db.prepare(`UPDATE transactions SET ${sets} WHERE id = ?`).bind(...values, id).run();
  const financialFields = /* @__PURE__ */ new Set(["card", "amount", "type"]);
  const hasFinancialChange = fields.some((f) => financialFields.has(f));
  if (result.meta.changes > 0 && old && hasFinancialChange) {
    const newCard = (data.card !== void 0 ? data.card : old.card) || "";
    const newAmount = data.amount !== void 0 ? data.amount : old.amount;
    const newType = data.type !== void 0 ? data.type : old.type;
    if (old.card) {
      const oldDelta = await calcAssetDelta(db, old.card, old.amount, old.type);
      await adjustAssetBalance(db, old.card, -oldDelta);
    }
    if (newCard) {
      const newDelta = await calcAssetDelta(db, newCard, newAmount, newType);
      await adjustAssetBalance(db, newCard, newDelta);
    }
  }
  return result.meta.changes > 0;
}
async function deleteTransaction(db, id) {
  const txn = await db.prepare("SELECT card, amount, type, source FROM transactions WHERE id = ?").bind(id).first();
  const result = await db.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
  if (result.meta.changes > 0 && txn && txn.card) {
    const delta = await calcAssetDelta(db, txn.card, txn.amount, txn.type);
    await adjustAssetBalance(db, txn.card, -delta);
  }
  return result.meta.changes > 0;
}
async function findDuplicateTransaction(db, name, amount, date) {
  return db.prepare("SELECT id FROM transactions WHERE name = ? AND amount = ? AND date = ? AND source = 'Gmail\u81EA\u52D5'").bind(name, amount, date).first();
}
async function getInvestments(db) {
  const { results } = await db.prepare("SELECT * FROM investments ORDER BY name").all();
  return results;
}
async function deleteInvestment(db, id) {
  const result = await db.prepare("DELETE FROM investments WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}
async function updateInvestment(db, id, data) {
  const fields = ["shares", "avg_cost", "market_value", "profit_loss", "return_rate", "updated_at"].filter((f) => data[f] !== void 0);
  if (!fields.length) return false;
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f]);
  const result = await db.prepare(`UPDATE investments SET ${sets} WHERE id = ?`).bind(...values, id).run();
  return result.meta.changes > 0;
}
async function upsertInvestment(db, data) {
  const id = data.id ?? generateId("inv");
  await db.prepare(`
    INSERT INTO investments (id, name, symbol, shares, avg_cost, market_value, profit_loss, return_rate, realized_pnl, current_price, previous_close, updated_at, account)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      shares=excluded.shares, avg_cost=excluded.avg_cost, market_value=excluded.market_value,
      profit_loss=excluded.profit_loss, return_rate=excluded.return_rate,
      realized_pnl=excluded.realized_pnl,
      current_price=excluded.current_price, previous_close=excluded.previous_close,
      updated_at=excluded.updated_at
  `).bind(id, data.name, data.symbol, data.shares, data.avg_cost, data.market_value, data.profit_loss, data.return_rate, data.realized_pnl ?? 0, data.current_price ?? 0, data.previous_close ?? 0, data.updated_at, data.account).run();
  return id;
}
async function getInvestmentTrades(db, symbol, account) {
  let where = "";
  const params = [];
  if (symbol && account !== void 0) {
    where = "WHERE symbol = ? AND account = ?";
    params.push(symbol, account);
  } else if (symbol) {
    where = "WHERE symbol = ?";
    params.push(symbol);
  }
  const { results } = await db.prepare(`SELECT * FROM investment_trades ${where} ORDER BY date DESC, created_at DESC`).bind(...params).all();
  return results;
}
async function createInvestmentTrade(db, data) {
  const id = generateId("trd");
  await db.prepare(`
    INSERT INTO investment_trades (id, symbol, name, type, shares, price, amount, date, account, to_account, realized_pnl, transfer_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.symbol, data.name, data.type, data.shares, data.price, data.amount, data.date, data.account ?? "", data.to_account ?? null, data.realized_pnl ?? 0, data.transfer_id ?? null, data.note ?? null).run();
  return id;
}
async function deleteInvestmentTrade(db, id) {
  const result = await db.prepare("DELETE FROM investment_trades WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}
async function getAssets(db) {
  const { results } = await db.prepare("SELECT * FROM assets ORDER BY type, name").all();
  return results;
}
async function createAsset(db, data) {
  const id = generateId("acc");
  await db.prepare("INSERT INTO assets (id, name, type, bank, balance, include_in_total, billing_day, payment_day, credit_limit, payment_method, payment_account, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))").bind(id, data.name, data.type, data.bank, data.balance, data.include_in_total ?? 1, data.billing_day ?? null, data.payment_day ?? null, data.credit_limit ?? 0, data.payment_method ?? "manual", data.payment_account ?? null).run();
  return id;
}
async function updateAsset(db, id, balance) {
  const result = await db.prepare("UPDATE assets SET balance = ?, updated_at = date('now') WHERE id = ?").bind(balance, id).run();
  return result.meta.changes > 0;
}
async function updateAssetFull(db, id, data) {
  const fields = [];
  const values = [];
  if (data.name !== void 0) {
    fields.push("name");
    values.push(data.name);
  }
  if (data.type !== void 0) {
    fields.push("type");
    values.push(data.type);
  }
  if (data.balance !== void 0) {
    fields.push("balance");
    values.push(data.balance);
  }
  if (data.include_in_total !== void 0) {
    fields.push("include_in_total");
    values.push(data.include_in_total);
  }
  if ("billing_day" in data) {
    fields.push("billing_day");
    values.push(data.billing_day ?? null);
  }
  if ("payment_day" in data) {
    fields.push("payment_day");
    values.push(data.payment_day ?? null);
  }
  if ("credit_limit" in data) {
    fields.push("credit_limit");
    values.push(data.credit_limit ?? null);
  }
  if ("payment_method" in data) {
    fields.push("payment_method");
    values.push(data.payment_method ?? "manual");
  }
  if ("payment_account" in data) {
    fields.push("payment_account");
    values.push(data.payment_account ?? null);
  }
  if (!fields.length) return null;
  const sets = [...fields.map((f) => `${f} = ?`), "updated_at = date('now')"].join(", ");
  await db.prepare(`UPDATE assets SET ${sets} WHERE id = ?`).bind(...values, id).run();
  return db.prepare("SELECT * FROM assets WHERE id = ?").bind(id).first();
}
async function getAssetById(db, id) {
  return db.prepare("SELECT * FROM assets WHERE id = ?").bind(id).first();
}
async function deleteAsset(db, id) {
  const result = await db.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}
async function getDailySummary(db, date) {
  return db.prepare("SELECT * FROM daily_summaries WHERE date = ?").bind(date).first();
}
async function upsertDailySummary(db, date, data) {
  const id = generateId("sum");
  await db.prepare(`
    INSERT INTO daily_summaries (id, date, total_amount, transaction_count, summary_text)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_amount=excluded.total_amount, transaction_count=excluded.transaction_count, summary_text=excluded.summary_text
  `).bind(id, date, data.total_amount, data.transaction_count, data.summary_text).run();
}
async function getMonthlySummary(db, month) {
  const rows = await db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
      AND type = '\u652F\u51FA'
      AND transfer_id IS NULL
    GROUP BY category
    ORDER BY total DESC
  `).bind(month).all();
  const totals = await db.prepare(`
    SELECT SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
      AND type = '\u652F\u51FA'
      AND transfer_id IS NULL
  `).bind(month).first();
  const incomeTotals = await db.prepare(`
    SELECT SUM(amount) as total
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
      AND type = '\u6536\u5165'
      AND transfer_id IS NULL
  `).bind(month).first();
  return {
    byCategory: rows.results,
    total: totals?.total ?? 0,
    count: totals?.count ?? 0,
    income: incomeTotals?.total ?? 0
  };
}
async function getReconciliations(db, billMonth) {
  const where = billMonth ? "WHERE bill_month = ?" : "";
  const params = billMonth ? [billMonth] : [];
  const { results } = await db.prepare(`SELECT * FROM reconciliation ${where} ORDER BY date DESC`).bind(...params).all();
  return results;
}
async function createReconciliationItem(db, data) {
  const id = generateId("rec");
  await db.prepare(`
    INSERT INTO reconciliation (id, name, bill_amount, record_amount, date, category, status, bill_month, transaction_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.name, data.bill_amount, data.record_amount ?? null, data.date, data.category ?? "\u5176\u4ED6", data.status, data.bill_month, data.transaction_id ?? null, data.note ?? null).run();
  return id;
}
async function updateReconciliationItem(db, id, data) {
  const fields = ["status", "note", "transaction_id", "record_amount"].filter((f) => data[f] !== void 0);
  if (!fields.length) return false;
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f]);
  const result = await db.prepare(`UPDATE reconciliation SET ${sets} WHERE id = ?`).bind(...values, id).run();
  return result.meta.changes > 0;
}
async function getAssetHistory(db, months = 12) {
  const { results } = await db.prepare(`
    SELECT * FROM asset_history
    WHERE snapshot_date IN (
      SELECT MAX(snapshot_date) FROM asset_history
      WHERE snapshot_date >= date('now', '-' || ? || ' months')
      GROUP BY substr(snapshot_date, 1, 7)
    )
    ORDER BY snapshot_date ASC
  `).bind(months).all();
  return results;
}
async function recordAssetSnapshot(db, data) {
  const id = generateId("snap");
  await db.prepare(`
    INSERT OR REPLACE INTO asset_history (id, snapshot_date, total_assets, total_investments, total_cash, monthly_expense)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, data.snapshot_date, data.total_assets, data.total_investments, data.total_cash, data.monthly_expense).run();
}
async function getCategories(db) {
  const { results } = await db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, name ASC").all();
  return results;
}
async function createCategory(db, name, type = "\u652F\u51FA", sort_order, icon) {
  const id = generateId("cat");
  const order = sort_order ?? 0;
  await db.prepare("INSERT INTO categories (id, name, type, sort_order, icon) VALUES (?, ?, ?, ?, ?)").bind(id, name, type, order, icon ?? null).run();
  return id;
}
async function updateCategory(db, id, data) {
  let oldName = null;
  if (data.name !== void 0) {
    const row = await db.prepare("SELECT name FROM categories WHERE id = ?").bind(id).first();
    oldName = row?.name ?? null;
  }
  const fields = [];
  const values = [];
  if (data.name !== void 0) {
    fields.push("name");
    values.push(data.name);
  }
  if (data.sort_order !== void 0) {
    fields.push("sort_order");
    values.push(data.sort_order);
  }
  if ("icon" in data) {
    fields.push("icon");
    values.push(data.icon ?? null);
  }
  if (!fields.length) return false;
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const result = await db.prepare(`UPDATE categories SET ${sets} WHERE id = ?`).bind(...values, id).run();
  if (result.meta.changes > 0 && data.name !== void 0 && oldName && oldName !== data.name) {
    await db.prepare("UPDATE transactions SET category = ? WHERE category = ?").bind(data.name, oldName).run();
    await db.prepare("UPDATE recurring_transactions SET category = ? WHERE category = ?").bind(data.name, oldName).run();
  }
  return result.meta.changes > 0;
}
async function deleteCategory(db, id) {
  const result = await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}
async function getRecurring(db) {
  const { results } = await db.prepare("SELECT * FROM recurring_transactions ORDER BY next_date ASC, name ASC").all();
  return results;
}
async function createRecurring(db, data) {
  const id = generateId("rcr");
  const startDate = data.start_date ?? data.next_date;
  await db.prepare(`
    INSERT INTO recurring_transactions (id, name, amount, type, category, card, note, frequency, day_of_month, next_date, start_date, end_date, fee, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.name, data.amount, data.type ?? "\u652F\u51FA", data.category, data.card ?? "", data.note ?? null, data.frequency ?? "monthly", data.day_of_month ?? 1, data.next_date, startDate, data.end_date ?? null, data.fee ?? 0, data.is_active ?? 1).run();
  return id;
}
async function updateRecurring(db, id, data) {
  const allowed = ["name", "amount", "type", "category", "card", "note", "frequency", "day_of_month", "next_date", "start_date", "end_date", "fee", "is_active", "last_generated"];
  const fields = allowed.filter((f) => data[f] !== void 0);
  if (!fields.length) return false;
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f]);
  await db.prepare(`UPDATE recurring_transactions SET ${sets} WHERE id = ?`).bind(...values, id).run();
  return true;
}
async function deleteRecurring(db, id) {
  const result = await db.prepare("DELETE FROM recurring_transactions WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}
async function processRecurring(db) {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const { results } = await db.prepare("SELECT * FROM recurring_transactions WHERE is_active = 1 AND next_date <= ? AND (end_date IS NULL OR end_date >= ?)").bind(today, today).all();
  let count3 = 0;
  for (const item of results) {
    const fee = item.fee ?? 0;
    await createTransaction(db, {
      name: item.name,
      amount: item.amount + fee,
      date: item.next_date,
      category: item.category,
      card: item.card ?? "",
      type: item.type,
      status: "\u5F85\u78BA\u8A8D",
      source: "\u5B9A\u671F",
      note: fee > 0 ? `\u542B\u624B\u7E8C\u8CBB NT${fee.toLocaleString()}` : item.note,
      transfer_id: null,
      recurring_id: item.id
    });
    const next = calcNextDate(item.next_date, item.frequency, item.day_of_month);
    await updateRecurring(db, item.id, { next_date: next, last_generated: today });
    count3++;
  }
  return count3;
}
function calcNextDate(dateStr, frequency, dayOfMonth = 1) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (frequency === "weekly") {
    const dt = new Date(y, m - 1, d + 7);
    return dt.toISOString().slice(0, 10);
  }
  if (frequency === "yearly") {
    const maxD2 = new Date(y + 1, m, 0).getDate();
    return `${y + 1}-${String(m).padStart(2, "0")}-${String(Math.min(d, maxD2)).padStart(2, "0")}`;
  }
  let ny = y, nm = m + 1;
  if (nm > 12) {
    nm = 1;
    ny++;
  }
  const maxD = new Date(ny, nm, 0).getDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(dayOfMonth, maxD)).padStart(2, "0")}`;
}
var init_queries = __esm({
  "src/db/queries.ts"() {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(generateId, "generateId");
    __name(getTransactions, "getTransactions");
    __name(adjustAssetBalance, "adjustAssetBalance");
    __name(calcAssetDelta, "calcAssetDelta");
    __name(createTransaction, "createTransaction");
    __name(createTransfer, "createTransfer");
    __name(deleteTransferPair, "deleteTransferPair");
    __name(updateTransaction, "updateTransaction");
    __name(deleteTransaction, "deleteTransaction");
    __name(findDuplicateTransaction, "findDuplicateTransaction");
    __name(getInvestments, "getInvestments");
    __name(deleteInvestment, "deleteInvestment");
    __name(updateInvestment, "updateInvestment");
    __name(upsertInvestment, "upsertInvestment");
    __name(getInvestmentTrades, "getInvestmentTrades");
    __name(createInvestmentTrade, "createInvestmentTrade");
    __name(deleteInvestmentTrade, "deleteInvestmentTrade");
    __name(getAssets, "getAssets");
    __name(createAsset, "createAsset");
    __name(updateAsset, "updateAsset");
    __name(updateAssetFull, "updateAssetFull");
    __name(getAssetById, "getAssetById");
    __name(deleteAsset, "deleteAsset");
    __name(getDailySummary, "getDailySummary");
    __name(upsertDailySummary, "upsertDailySummary");
    __name(getMonthlySummary, "getMonthlySummary");
    __name(getReconciliations, "getReconciliations");
    __name(createReconciliationItem, "createReconciliationItem");
    __name(updateReconciliationItem, "updateReconciliationItem");
    __name(getAssetHistory, "getAssetHistory");
    __name(recordAssetSnapshot, "recordAssetSnapshot");
    __name(getCategories, "getCategories");
    __name(createCategory, "createCategory");
    __name(updateCategory, "updateCategory");
    __name(deleteCategory, "deleteCategory");
    __name(getRecurring, "getRecurring");
    __name(createRecurring, "createRecurring");
    __name(updateRecurring, "updateRecurring");
    __name(deleteRecurring, "deleteRecurring");
    __name(processRecurring, "processRecurring");
    __name(calcNextDate, "calcNextDate");
  }
});

// src/installer-entry.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/hono.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/hono-base.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/compose.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context2.error = err;
            res = await onError(err, context2);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError)) {
        context2.res = res;
      }
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/context.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/request.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/http-exception.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/request/constants.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app10) {
    const subApp = this.basePath(path);
    app10.routes.map((r) => {
      let handler;
      if (app10.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app10.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/reg-exp-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/reg-exp-router/matcher.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context2, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context2.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context2, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/reg-exp-router/prepared-router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/smart-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/smart-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/trie-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/trie-router/node.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        if (opts.credentials) {
          return (origin) => origin || null;
        }
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*" || opts.credentials) {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*" || opts.credentials) {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/routes/transactions.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_queries();
var app = new Hono2();
app.get("/", async (c) => {
  const q = c.req.query();
  const result = await getTransactions(c.env.DB, {
    limit: q.limit ? parseInt(q.limit) : 50,
    offset: q.offset ? parseInt(q.offset) : 0,
    date: q.date,
    month: q.month,
    date_from: q.date_from,
    date_to: q.date_to,
    category: q.category,
    status: q.status,
    type: q.type,
    card: q.card,
    account_id: q.account_id
  });
  return c.json({ ok: true, ...result });
});
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(id).first();
  if (!row) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u8A18\u9304" }, 404);
  return c.json({ ok: true, data: row });
});
app.post("/", async (c) => {
  const body = await c.req.json();
  if (!body.amount || !body.date) {
    return c.json({ ok: false, error: "\u7F3A\u5C11\u5FC5\u586B\u6B04\u4F4D\uFF1Aamount, date" }, 400);
  }
  let accountId = body.account_id ?? null;
  if (!accountId && body.card) {
    const found = await c.env.DB.prepare("SELECT id FROM assets WHERE name = ?").bind(body.card).first();
    accountId = found?.id ?? null;
  }
  const id = await createTransaction(c.env.DB, {
    name: body.name ?? "",
    amount: body.amount,
    date: body.date,
    category: body.category ?? "\u5176\u4ED6",
    card: body.card ?? "",
    account_id: accountId,
    type: body.type ?? "\u652F\u51FA",
    status: "\u5F85\u78BA\u8A8D",
    source: "\u624B\u52D5\u8F38\u5165",
    note: body.note ?? null,
    transfer_id: null
  });
  return c.json({ ok: true, id }, 201);
});
app.post("/transfer", async (c) => {
  const body = await c.req.json();
  if (!body.from_account || !body.to_account || !body.amount || !body.date) {
    return c.json({ ok: false, error: "\u7F3A\u5C11\u5FC5\u586B\u6B04\u4F4D" }, 400);
  }
  if (body.from_account === body.to_account) {
    return c.json({ ok: false, error: "\u4F86\u6E90\u8207\u76EE\u6A19\u5E33\u6236\u4E0D\u80FD\u76F8\u540C" }, 400);
  }
  const transfer_id = await createTransfer(c.env.DB, {
    from_account: body.from_account,
    to_account: body.to_account,
    amount: body.amount,
    date: body.date,
    note: body.note,
    fee: body.fee
  });
  return c.json({ ok: true, transfer_id }, 201);
});
app.patch("/transfer/:transferId", async (c) => {
  const transferId = c.req.param("transferId");
  const body = await c.req.json();
  const { results } = await c.env.DB.prepare("SELECT id, type, card, name FROM transactions WHERE transfer_id = ?").bind(transferId).all();
  if (results.length < 2) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u8F49\u5E33\u8A18\u9304" }, 404);
  const outgoing = results.find((t) => t.type === "\u652F\u51FA");
  const incoming = results.find((t) => t.type === "\u6536\u5165");
  if (!outgoing || !incoming) return c.json({ ok: false, error: "\u8F49\u5E33\u8A18\u9304\u4E0D\u5B8C\u6574" }, 404);
  const fromAccount = body.from_account ?? outgoing.card;
  const toAccount = body.to_account ?? incoming.card;
  const base = {};
  if (body.amount !== void 0) base.amount = body.amount;
  if (body.date !== void 0) base.date = body.date;
  if ("note" in body) base.note = body.note;
  const outName = outgoing.name?.startsWith("\u8F49\u5E33") ? `\u8F49\u5E33 \u2192 ${toAccount}` : outgoing.name;
  const inName = incoming.name?.startsWith("\u8F49\u5E33") ? `\u8F49\u5E33 \u2190 ${fromAccount}` : incoming.name;
  await updateTransaction(c.env.DB, outgoing.id, { ...base, card: fromAccount, name: outName });
  await updateTransaction(c.env.DB, incoming.id, { ...base, card: toAccount, name: inName });
  return c.json({ ok: true });
});
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const ok = await updateTransaction(c.env.DB, id, body);
  if (!ok) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u8A18\u9304" }, 404);
  return c.json({ ok: true });
});
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const txn = await c.env.DB.prepare("SELECT transfer_id FROM transactions WHERE id = ?").bind(id).first();
  if (txn?.transfer_id) {
    const linkedTrade = await c.env.DB.prepare("SELECT * FROM investment_trades WHERE transfer_id = ?").bind(txn.transfer_id).first();
    if (linkedTrade) {
      const allForPair = await getInvestmentTrades(c.env.DB, linkedTrade.symbol, linkedTrade.account);
      const allInv = await getInvestments(c.env.DB);
      await deleteInvestmentTrade(c.env.DB, linkedTrade.id);
      await deleteTransferPair(c.env.DB, txn.transfer_id);
      const remaining = allForPair.filter((t) => t.id !== linkedTrade.id);
      const inv = allInv.find((i) => i.symbol === linkedTrade.symbol && i.account === linkedTrade.account);
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      if (remaining.length === 0) {
        if (inv) await deleteInvestment(c.env.DB, inv.id);
        return c.json({ ok: true });
      }
      const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date));
      let shares = 0, avgCost = 0, realizedPnl = 0;
      for (const t of sorted) {
        if (t.type === "\u8CB7\u5165") {
          const newShares = shares + t.shares;
          avgCost = newShares > 0 ? (shares * avgCost + t.shares * t.price) / newShares : t.price;
          shares = newShares;
        } else {
          realizedPnl += (t.price - avgCost) * t.shares;
          shares = Math.max(0, shares - t.shares);
        }
      }
      if (shares === 0) {
        if (inv) await deleteInvestment(c.env.DB, inv.id);
        return c.json({ ok: true });
      }
      const currentPerShare = inv ? inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : avgCost) : avgCost;
      const newMarketValue = Math.round(shares * currentPerShare);
      const newTotalCost = Math.round(shares * avgCost);
      const newProfitLoss = newMarketValue - newTotalCost;
      const newReturnRate = newTotalCost > 0 ? Math.round(newProfitLoss / newTotalCost * 1e4) / 100 : 0;
      await upsertInvestment(c.env.DB, {
        ...inv ?? { id: void 0, name: linkedTrade.name, symbol: linkedTrade.symbol, account: linkedTrade.account, current_price: avgCost, previous_close: 0 },
        shares,
        avg_cost: Math.round(avgCost * 100) / 100,
        market_value: newMarketValue,
        profit_loss: newProfitLoss,
        return_rate: newReturnRate,
        realized_pnl: Math.round(realizedPnl),
        updated_at: today
      });
      return c.json({ ok: true });
    }
    await deleteTransferPair(c.env.DB, txn.transfer_id);
    return c.json({ ok: true, deleted_transfer: true });
  }
  const ok = await deleteTransaction(c.env.DB, id);
  if (!ok) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u8A18\u9304" }, 404);
  return c.json({ ok: true });
});
var transactions_default = app;

// src/routes/investments.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_queries();

// src/services/csv-parser.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function parseNumber(str) {
  const cleaned = str.replace(/[,\s%]/g, "").replace(/[（(]/, "-").replace(/[）)]/, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}
__name(parseNumber, "parseNumber");
function parseHoldaryCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headerIdx = lines.findIndex(
    (l) => l.includes("\u80A1\u7968") || l.includes("\u4EE3\u865F") || l.includes("symbol") || l.includes("Symbol")
  );
  if (headerIdx < 0) return [];
  const headers = lines[headerIdx].split(",").map((h) => h.trim().replace(/"/g, "").toLowerCase());
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;
    const get = /* @__PURE__ */ __name((keys) => {
      for (const k of keys) {
        const idx = headers.findIndex((h) => h.includes(k));
        if (idx >= 0 && cols[idx]) return cols[idx].trim().replace(/"/g, "");
      }
      return "";
    }, "get");
    const symbol = get(["\u4EE3\u865F", "symbol", "code", "\u80A1\u7968\u4EE3"]);
    const name = get(["\u540D\u7A31", "name", "\u80A1\u7968\u540D"]);
    if (!symbol && !name) continue;
    rows.push({
      symbol: symbol || "",
      name: name || symbol,
      shares: parseNumber(get(["\u80A1\u6578", "shares", "\u6301\u80A1", "\u6578\u91CF"])),
      avg_cost: parseNumber(get(["\u6210\u672C", "cost", "\u5747\u50F9", "\u5E73\u5747"])),
      market_price: parseNumber(get(["\u73FE\u50F9", "price", "\u5E02\u50F9", "\u6536\u76E4"])),
      market_value: parseNumber(get(["\u5E02\u503C", "value", "\u7E3D\u503C"])),
      profit_loss: parseNumber(get(["\u640D\u76CA", "profit", "gain", "\u76C8\u8667"])),
      return_rate: parseNumber(get(["\u5831\u916C", "return", "rate", "\u5831\u916C\u7387", "%"]))
    });
  }
  return rows;
}
__name(parseHoldaryCSV, "parseHoldaryCSV");
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
__name(parseCSVLine, "parseCSVLine");
function parseSinopacBillText(text) {
  const items = [];
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const lines = text.split(/\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const dateRe = /^\d{2}\/\d{2}$/;
  const cardRe = /^\d{4}$/;
  const amountRe = /^[－—–‐\-]?[\d,]+[－—–‐\-]?$/;
  const tokens = lines.flatMap((l) => l.split(" ")).filter(Boolean);
  let i = 0;
  while (i < tokens.length) {
    if (!dateRe.test(tokens[i])) {
      i++;
      continue;
    }
    const txnDate = tokens[i];
    if (i + 1 >= tokens.length || !dateRe.test(tokens[i + 1])) {
      i++;
      continue;
    }
    if (i + 2 >= tokens.length || !cardRe.test(tokens[i + 2])) {
      i++;
      continue;
    }
    const cardLast4 = tokens[i + 2];
    let j = i + 3;
    const nameParts = [];
    while (j < tokens.length && !amountRe.test(tokens[j])) {
      nameParts.push(tokens[j]);
      j++;
    }
    if (j >= tokens.length || !nameParts.length) {
      i++;
      continue;
    }
    const normalizedRaw = tokens[j].replace(/[－—–‐]/g, "-");
    const isTrailingMinus = /[\d,]-$/.test(normalizedRaw);
    let amount = parseInt(normalizedRaw.replace(/,/g, "").replace(/-$/, ""), 10) * (isTrailingMinus ? -1 : 1);
    let nextIdx = j + 1;
    if (nextIdx < tokens.length && /^[－—–‐\-]$/.test(tokens[nextIdx])) {
      amount = -Math.abs(amount);
      nextIdx++;
    }
    const name = nameParts.join(" ").slice(0, 60);
    const [mm, dd] = txnDate.split("/");
    const date = `${currentYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const hasDateInName = nameParts.some((p) => dateRe.test(p));
    if (name && !isNaN(amount) && amount !== 0 && !hasDateInName) {
      items.push({ name, amount, date, card: cardLast4 });
    }
    i = nextIdx;
  }
  const merged = [];
  for (const item of items) {
    if (merged.length > 0 && item.date === merged[merged.length - 1].date && (item.name.includes("\u570B\u5916\u4EA4\u6613\u670D\u52D9\u8CBB") || item.name.includes("\u570B\u5916\u4EA4\u6613\u624B\u7E8C\u8CBB"))) {
      merged[merged.length - 1].amount += item.amount;
    } else {
      merged.push(item);
    }
  }
  return merged;
}
__name(parseSinopacBillText, "parseSinopacBillText");

// src/routes/investments.ts
var app2 = new Hono2();
app2.get("/", async (c) => {
  const investments = await getInvestments(c.env.DB);
  const totalValue = investments.reduce((s, i) => s + i.market_value, 0);
  const totalCost = investments.reduce((s, i) => s + i.avg_cost * i.shares, 0);
  const totalProfitLoss = investments.reduce((s, i) => s + i.profit_loss, 0);
  const overallReturn = totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0;
  const totalDailyPnl = investments.reduce((s, i) => {
    if (!i.previous_close || !i.current_price) return s;
    return s + (i.current_price - i.previous_close) * i.shares;
  }, 0);
  const totalRealizedPnl = investments.reduce((s, i) => s + (i.realized_pnl ?? 0), 0);
  return c.json({
    ok: true,
    data: investments,
    summary: {
      total_value: totalValue,
      total_cost: totalCost,
      total_profit_loss: totalProfitLoss,
      total_realized_pnl: Math.round(totalRealizedPnl),
      overall_return: Math.round(overallReturn * 100) / 100,
      total_daily_pnl: Math.round(totalDailyPnl)
    }
  });
});
app2.get("/lookup/:symbol", async (c) => {
  const symbol = c.req.param("symbol").toUpperCase();
  for (const ex of ["tse", "otc"]) {
    try {
      const res = await fetch(
        `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${ex}_${symbol.toLowerCase()}.tw&json=1&delay=0`,
        { headers: { "Referer": "https://mis.twse.com.tw/", "User-Agent": "Mozilla/5.0" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const stock = data?.msgArray?.[0];
      if (stock?.n?.trim()) {
        return c.json({ ok: true, symbol, name: stock.n.trim(), exchange: ex });
      }
    } catch {
      continue;
    }
  }
  for (const suffix of [".TW", ".TWO"]) {
    try {
      const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}`, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) continue;
      return c.json({ ok: true, symbol, name: meta.shortName ?? meta.longName ?? symbol });
    } catch {
      continue;
    }
  }
  return c.json({ ok: false, error: `\u627E\u4E0D\u5230\u80A1\u7968\u4EE3\u865F ${symbol}` }, 404);
});
app2.post("/refresh-all", async (c) => {
  const investments = await getInvestments(c.env.DB);
  if (!investments.length) return c.json({ ok: true, updated: 0, total: 0 });
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const priceResults = await Promise.all(
    investments.map(async (inv) => {
      for (const suffix of [".TW", ".TWO"]) {
        try {
          const res = await fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${inv.symbol}${suffix}?interval=1d&range=1d`,
            { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
          );
          if (!res.ok) continue;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta?.regularMarketPrice) continue;
          const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? inv.previous_close;
          return { inv, price: meta.regularMarketPrice, previousClose: prevClose, ok: true };
        } catch {
          continue;
        }
      }
      return { inv, ok: false };
    })
  );
  let updated = 0;
  for (const r of priceResults) {
    if (!r.ok) continue;
    const { inv, price, previousClose } = r;
    const newMarketValue = Math.round(inv.shares * price);
    const newProfitLoss = newMarketValue - Math.round(inv.shares * inv.avg_cost);
    const newReturnRate = inv.avg_cost > 0 ? Math.round((price - inv.avg_cost) / inv.avg_cost * 1e4) / 100 : 0;
    await upsertInvestment(c.env.DB, {
      ...inv,
      market_value: newMarketValue,
      profit_loss: newProfitLoss,
      return_rate: newReturnRate,
      current_price: price,
      previous_close: previousClose,
      updated_at: today
    });
    updated++;
  }
  const updatedInvestments = await getInvestments(c.env.DB);
  const totalValue = updatedInvestments.reduce((s, i) => s + i.market_value, 0);
  const totalCost = updatedInvestments.reduce((s, i) => s + i.avg_cost * i.shares, 0);
  const totalProfitLoss = updatedInvestments.reduce((s, i) => s + i.profit_loss, 0);
  const overallReturn = totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0;
  const totalDailyPnl = updatedInvestments.reduce((s, i) => {
    if (!i.previous_close || !i.current_price) return s;
    return s + (i.current_price - i.previous_close) * i.shares;
  }, 0);
  const totalRealizedPnl = updatedInvestments.reduce((s, i) => s + (i.realized_pnl ?? 0), 0);
  return c.json({
    ok: true,
    updated,
    total: investments.length,
    data: updatedInvestments,
    summary: {
      total_value: totalValue,
      total_cost: totalCost,
      total_profit_loss: totalProfitLoss,
      total_realized_pnl: Math.round(totalRealizedPnl),
      overall_return: Math.round(overallReturn * 100) / 100,
      total_daily_pnl: Math.round(totalDailyPnl)
    }
  });
});
app2.get("/price/:symbol", async (c) => {
  const symbol = c.req.param("symbol").toUpperCase();
  const suffixes = [".TW", ".TWO"];
  for (const suffix of suffixes) {
    try {
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}?interval=1d&range=1d`,
        { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;
      return c.json({
        ok: true,
        symbol,
        price: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        marketState: meta.marketState,
        name: meta.shortName ?? symbol
      });
    } catch {
      continue;
    }
  }
  return c.json({ ok: false, error: `\u627E\u4E0D\u5230\u80A1\u7968 ${symbol}\uFF0C\u8ACB\u78BA\u8A8D\u4EE3\u865F\u6B63\u78BA` }, 404);
});
app2.post("/price/:symbol/refresh", async (c) => {
  const symbol = c.req.param("symbol").toUpperCase();
  const investments = await getInvestments(c.env.DB);
  const inv = investments.find((i) => i.symbol === symbol);
  if (!inv) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u6301\u80A1" }, 404);
  const suffixes = [".TW", ".TWO"];
  for (const suffix of suffixes) {
    try {
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}?interval=1d&range=1d`,
        { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;
      const price = meta.regularMarketPrice;
      const previousClose = meta.previousClose;
      const newMarketValue = Math.round(inv.shares * price);
      const newProfitLoss = newMarketValue - Math.round(inv.shares * inv.avg_cost);
      const newReturnRate = inv.avg_cost > 0 ? Math.round((price - inv.avg_cost) / inv.avg_cost * 1e4) / 100 : 0;
      await upsertInvestment(c.env.DB, {
        ...inv,
        market_value: newMarketValue,
        profit_loss: newProfitLoss,
        return_rate: newReturnRate,
        current_price: price,
        previous_close: previousClose,
        updated_at: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
      });
      return c.json({ ok: true, price, previousClose, marketState: meta.marketState, market_value: newMarketValue });
    } catch {
      continue;
    }
  }
  return c.json({ ok: false, error: "\u80A1\u50F9\u66F4\u65B0\u5931\u6557" }, 500);
});
app2.get("/history", async (c) => {
  const range = c.req.query("range") ?? "month";
  const taipeiNow = new Date(Date.now() + 8 * 60 * 60 * 1e3);
  const today = taipeiNow.toISOString().slice(0, 10);
  if (range === "week") {
    const start2 = new Date(taipeiNow);
    start2.setUTCDate(start2.getUTCDate() - 6);
    const startDate2 = start2.toISOString().slice(0, 10);
    const { results: results2 } = await c.env.DB.prepare(`
      SELECT snapshot_date, total_investments FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date ASC
    `).bind(startDate2, today).all();
    return c.json({ ok: true, data: results2, start: startDate2, end: today });
  }
  if (range === "month") {
    const start2 = new Date(taipeiNow);
    start2.setUTCDate(start2.getUTCDate() - 29);
    const startDate2 = start2.toISOString().slice(0, 10);
    const { results: results2 } = await c.env.DB.prepare(`
      SELECT snapshot_date, total_investments FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date ASC
    `).bind(startDate2, today).all();
    return c.json({ ok: true, data: results2, start: startDate2, end: today });
  }
  const start = new Date(taipeiNow);
  start.setUTCDate(start.getUTCDate() - 364);
  const startDate = start.toISOString().slice(0, 10);
  const { results } = await c.env.DB.prepare(`
    SELECT snapshot_date, total_investments
    FROM asset_history
    WHERE snapshot_date IN (
      SELECT MAX(snapshot_date) FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      GROUP BY substr(snapshot_date, 1, 7)
    )
    ORDER BY snapshot_date ASC
  `).bind(startDate, today).all();
  return c.json({ ok: true, data: results, start: startDate, end: today });
});
app2.get("/history", async (c) => {
  const range = c.req.query("range") ?? "month";
  const taipeiNow = new Date(Date.now() + 8 * 60 * 60 * 1e3);
  const today = taipeiNow.toISOString().slice(0, 10);
  if (range === "week") {
    const start2 = new Date(taipeiNow);
    start2.setUTCDate(start2.getUTCDate() - 6);
    const startDate2 = start2.toISOString().slice(0, 10);
    const { results: results2 } = await c.env.DB.prepare(`
      SELECT snapshot_date, total_investments FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date ASC
    `).bind(startDate2, today).all();
    return c.json({ ok: true, data: results2, start: startDate2, end: today });
  }
  if (range === "month") {
    const start2 = new Date(taipeiNow);
    start2.setUTCDate(start2.getUTCDate() - 29);
    const startDate2 = start2.toISOString().slice(0, 10);
    const { results: results2 } = await c.env.DB.prepare(`
      SELECT snapshot_date, total_investments FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date ASC
    `).bind(startDate2, today).all();
    return c.json({ ok: true, data: results2, start: startDate2, end: today });
  }
  const start = new Date(taipeiNow);
  start.setUTCDate(start.getUTCDate() - 364);
  const startDate = start.toISOString().slice(0, 10);
  const { results } = await c.env.DB.prepare(`
    SELECT snapshot_date, total_investments
    FROM asset_history
    WHERE snapshot_date IN (
      SELECT MAX(snapshot_date) FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      GROUP BY substr(snapshot_date, 1, 7)
    )
    ORDER BY snapshot_date ASC
  `).bind(startDate, today).all();
  return c.json({ ok: true, data: results, start: startDate, end: today });
});
app2.get("/history", async (c) => {
  const range = c.req.query("range") ?? "month";
  const taipeiNow = new Date(Date.now() + 8 * 60 * 60 * 1e3);
  const today = taipeiNow.toISOString().slice(0, 10);
  if (range === "week") {
    const start2 = new Date(taipeiNow);
    start2.setUTCDate(start2.getUTCDate() - 6);
    const startDate2 = start2.toISOString().slice(0, 10);
    const { results: results2 } = await c.env.DB.prepare(`
      SELECT snapshot_date, total_investments FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date ASC
    `).bind(startDate2, today).all();
    return c.json({ ok: true, data: results2, start: startDate2, end: today });
  }
  if (range === "month") {
    const start2 = new Date(taipeiNow);
    start2.setUTCDate(start2.getUTCDate() - 29);
    const startDate2 = start2.toISOString().slice(0, 10);
    const { results: results2 } = await c.env.DB.prepare(`
      SELECT snapshot_date, total_investments FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date ASC
    `).bind(startDate2, today).all();
    return c.json({ ok: true, data: results2, start: startDate2, end: today });
  }
  const start = new Date(taipeiNow);
  start.setUTCDate(start.getUTCDate() - 364);
  const startDate = start.toISOString().slice(0, 10);
  const { results } = await c.env.DB.prepare(`
    SELECT snapshot_date, total_investments
    FROM asset_history
    WHERE snapshot_date IN (
      SELECT MAX(snapshot_date) FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      GROUP BY substr(snapshot_date, 1, 7)
    )
    ORDER BY snapshot_date ASC
  `).bind(startDate, today).all();
  return c.json({ ok: true, data: results, start: startDate, end: today });
});
app2.get("/trades", async (c) => {
  const symbol = c.req.query("symbol");
  const trades = await getInvestmentTrades(c.env.DB, symbol);
  return c.json({ ok: true, data: trades });
});
app2.get("/pnl", async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM investment_trades WHERE type = '\u8CE3\u51FA' ORDER BY date DESC, created_at DESC`).all();
  const total = results.reduce((s, t) => s + (t.realized_pnl ?? 0), 0);
  return c.json({ ok: true, data: results, total_realized_pnl: total });
});
app2.get("/pnl", async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM investment_trades WHERE type = '\u8CE3\u51FA' ORDER BY date DESC, created_at DESC`).all();
  const total = results.reduce((s, t) => s + (t.realized_pnl ?? 0), 0);
  return c.json({ ok: true, data: results, total_realized_pnl: total });
});
app2.post("/trades", async (c) => {
  const body = await c.req.json();
  if (!body.symbol || !body.type || !body.shares || !body.price || !body.date) {
    return c.json({ ok: false, error: "\u7F3A\u5C11\u5FC5\u586B\u6B04\u4F4D" }, 400);
  }
  if (body.type !== "\u8CB7\u5165" && body.type !== "\u8CE3\u51FA") {
    return c.json({ ok: false, error: "type \u5FC5\u9808\u662F \u8CB7\u5165 \u6216 \u8CE3\u51FA" }, 400);
  }
  const amount = Math.round(body.shares * body.price);
  const fee = body.fee ?? 0;
  const investments = await getInvestments(c.env.DB);
  const account = body.account ?? "";
  const inv = investments.find((i) => i.symbol === body.symbol && i.account === account);
  const today = body.date;
  const tradeRealizedPnl = body.type === "\u8CE3\u51FA" && inv ? Math.round((body.price - inv.avg_cost) * body.shares) - fee : 0;
  let tradeTransferId = null;
  if (body.type === "\u8CE3\u51FA" && body.to_account && body.account) {
    const proceeds = amount - fee;
    tradeTransferId = await createTransfer(c.env.DB, {
      from_account: body.account,
      to_account: body.to_account,
      amount: proceeds,
      date: body.date,
      note: `\u8CE3\u51FA ${body.symbol} ${body.name} \xD7${body.shares}`,
      outName: `\u8CE3\u51FA ${body.symbol} ${body.name}`,
      inName: `\u8CE3\u51FA ${body.symbol} ${body.name}`
    });
  }
  const id = await createInvestmentTrade(c.env.DB, {
    symbol: body.symbol,
    name: body.name,
    type: body.type,
    shares: body.shares,
    price: body.price,
    amount,
    date: body.date,
    account: body.account ?? "",
    to_account: body.type === "\u8CE3\u51FA" ? body.to_account ?? null : null,
    realized_pnl: tradeRealizedPnl,
    transfer_id: tradeTransferId,
    note: body.note ?? null
  });
  if (inv) {
    let newShares;
    let newAvgCost;
    let newRealizedPnl = inv.realized_pnl ?? 0;
    if (body.type === "\u8CB7\u5165") {
      newShares = inv.shares + body.shares;
      newAvgCost = newShares > 0 ? (inv.shares * inv.avg_cost + body.shares * body.price) / newShares : body.price;
    } else {
      newShares = Math.max(0, inv.shares - body.shares);
      newAvgCost = inv.avg_cost;
      newRealizedPnl += tradeRealizedPnl;
    }
    const currentPerShare = inv.shares > 0 ? inv.current_price || inv.market_value / inv.shares : body.price;
    const newMarketValue = Math.round(newShares * currentPerShare);
    const newTotalCost = Math.round(newShares * newAvgCost);
    const newProfitLoss = newMarketValue - newTotalCost;
    const newReturnRate = newTotalCost > 0 ? Math.round(newProfitLoss / newTotalCost * 1e4) / 100 : 0;
    if (newShares === 0 && body.type === "\u8CE3\u51FA") {
      await deleteInvestment(c.env.DB, inv.id);
    } else {
      await upsertInvestment(c.env.DB, {
        ...inv,
        shares: newShares,
        avg_cost: Math.round(newAvgCost * 100) / 100,
        market_value: newMarketValue,
        profit_loss: newProfitLoss,
        return_rate: newReturnRate,
        realized_pnl: Math.round(newRealizedPnl),
        updated_at: today
      });
    }
  } else if (body.type === "\u8CB7\u5165") {
    await upsertInvestment(c.env.DB, {
      name: body.name,
      symbol: body.symbol,
      shares: body.shares,
      avg_cost: body.price,
      market_value: amount,
      profit_loss: 0,
      return_rate: 0,
      realized_pnl: 0,
      current_price: body.price,
      previous_close: 0,
      updated_at: today,
      account: body.account ?? ""
    });
  }
  return c.json({ ok: true, id });
});
app2.patch("/trades/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const trade = await c.env.DB.prepare("SELECT * FROM investment_trades WHERE id = ?").bind(id).first();
  if (!trade) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u8A18\u9304" }, 404);
  const newType = body.type ?? trade.type;
  const newShares = body.shares ?? trade.shares;
  const newPrice = body.price ?? trade.price;
  const newDate = body.date ?? trade.date;
  const newAccount = body.account ?? trade.account;
  const newNote = "note" in body ? body.note : trade.note;
  const newAmount = Math.round(newShares * newPrice);
  await c.env.DB.prepare(
    "UPDATE investment_trades SET type=?, shares=?, price=?, amount=?, date=?, account=?, note=? WHERE id=?"
  ).bind(newType, newShares, newPrice, newAmount, newDate, newAccount, newNote ?? null, id).run();
  const effectiveAccount = newAccount || trade.account;
  const allForPair = await getInvestmentTrades(c.env.DB, trade.symbol, effectiveAccount);
  const allInv = await getInvestments(c.env.DB);
  const inv = allInv.find((i) => i.symbol === trade.symbol && i.account === effectiveAccount);
  if (!inv) return c.json({ ok: true });
  const remaining = allForPair.map(
    (t) => t.id === id ? { ...t, type: newType, shares: newShares, price: newPrice, date: newDate } : t
  );
  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date));
  let shares = 0, avgCost = 0, realizedPnl = 0;
  for (const t of sorted) {
    if (t.type === "\u8CB7\u5165") {
      const ns = shares + t.shares;
      avgCost = ns > 0 ? (shares * avgCost + t.shares * t.price) / ns : t.price;
      shares = ns;
    } else {
      realizedPnl += (t.price - avgCost) * t.shares;
      shares = Math.max(0, shares - t.shares);
    }
  }
  const currentPerShare = inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : 0);
  const newMarketValue = Math.round(shares * currentPerShare);
  const newTotalCost = Math.round(shares * avgCost);
  const newProfitLoss = newMarketValue - newTotalCost;
  const newReturnRate = newTotalCost > 0 ? Math.round(newProfitLoss / newTotalCost * 1e4) / 100 : 0;
  await upsertInvestment(c.env.DB, {
    ...inv,
    shares,
    avg_cost: Math.round(avgCost * 100) / 100,
    market_value: newMarketValue,
    profit_loss: newProfitLoss,
    return_rate: newReturnRate,
    realized_pnl: Math.round(realizedPnl),
    updated_at: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
  });
  return c.json({ ok: true });
});
app2.patch("/trades/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const trade = await c.env.DB.prepare("SELECT * FROM investment_trades WHERE id = ?").bind(id).first();
  if (!trade) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u8A18\u9304" }, 404);
  const newType = body.type ?? trade.type;
  const newShares = body.shares ?? trade.shares;
  const newPrice = body.price ?? trade.price;
  const newDate = body.date ?? trade.date;
  const newAccount = body.account ?? trade.account;
  const newNote = "note" in body ? body.note : trade.note;
  const newAmount = Math.round(newShares * newPrice);
  await c.env.DB.prepare(
    "UPDATE investment_trades SET type=?, shares=?, price=?, amount=?, date=?, account=?, note=? WHERE id=?"
  ).bind(newType, newShares, newPrice, newAmount, newDate, newAccount, newNote ?? null, id).run();
  const effectiveAccount = newAccount || trade.account;
  const allForPair = await getInvestmentTrades(c.env.DB, trade.symbol, effectiveAccount);
  const allInv = await getInvestments(c.env.DB);
  const inv = allInv.find((i) => i.symbol === trade.symbol && i.account === effectiveAccount);
  if (!inv) return c.json({ ok: true });
  const remaining = allForPair.map(
    (t) => t.id === id ? { ...t, type: newType, shares: newShares, price: newPrice, date: newDate } : t
  );
  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date));
  let shares = 0, avgCost = 0, realizedPnl = 0;
  for (const t of sorted) {
    if (t.type === "\u8CB7\u5165") {
      const ns = shares + t.shares;
      avgCost = ns > 0 ? (shares * avgCost + t.shares * t.price) / ns : t.price;
      shares = ns;
    } else {
      realizedPnl += (t.price - avgCost) * t.shares;
      shares = Math.max(0, shares - t.shares);
    }
  }
  const currentPerShare = inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : 0);
  const newMarketValue = Math.round(shares * currentPerShare);
  const newTotalCost = Math.round(shares * avgCost);
  const newProfitLoss = newMarketValue - newTotalCost;
  const newReturnRate = newTotalCost > 0 ? Math.round(newProfitLoss / newTotalCost * 1e4) / 100 : 0;
  await upsertInvestment(c.env.DB, {
    ...inv,
    shares,
    avg_cost: Math.round(avgCost * 100) / 100,
    market_value: newMarketValue,
    profit_loss: newProfitLoss,
    return_rate: newReturnRate,
    realized_pnl: Math.round(realizedPnl),
    updated_at: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
  });
  return c.json({ ok: true });
});
app2.patch("/trades/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const trade = await c.env.DB.prepare("SELECT * FROM investment_trades WHERE id = ?").bind(id).first();
  if (!trade) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u8A18\u9304" }, 404);
  const newType = body.type ?? trade.type;
  const newShares = body.shares ?? trade.shares;
  const newPrice = body.price ?? trade.price;
  const newDate = body.date ?? trade.date;
  const newAccount = body.account ?? trade.account;
  const newNote = "note" in body ? body.note : trade.note;
  const newAmount = Math.round(newShares * newPrice);
  await c.env.DB.prepare(
    "UPDATE investment_trades SET type=?, shares=?, price=?, amount=?, date=?, account=?, note=? WHERE id=?"
  ).bind(newType, newShares, newPrice, newAmount, newDate, newAccount, newNote ?? null, id).run();
  const effectiveAccount = newAccount || trade.account;
  const allForPair = await getInvestmentTrades(c.env.DB, trade.symbol, effectiveAccount);
  const allInv = await getInvestments(c.env.DB);
  const inv = allInv.find((i) => i.symbol === trade.symbol && i.account === effectiveAccount);
  if (!inv) return c.json({ ok: true });
  const remaining = allForPair.map(
    (t) => t.id === id ? { ...t, type: newType, shares: newShares, price: newPrice, date: newDate } : t
  );
  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date));
  let shares = 0, avgCost = 0, realizedPnl = 0;
  for (const t of sorted) {
    if (t.type === "\u8CB7\u5165") {
      const ns = shares + t.shares;
      avgCost = ns > 0 ? (shares * avgCost + t.shares * t.price) / ns : t.price;
      shares = ns;
    } else {
      realizedPnl += (t.price - avgCost) * t.shares;
      shares = Math.max(0, shares - t.shares);
    }
  }
  const currentPerShare = inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : 0);
  const newMarketValue = Math.round(shares * currentPerShare);
  const newTotalCost = Math.round(shares * avgCost);
  const newProfitLoss = newMarketValue - newTotalCost;
  const newReturnRate = newTotalCost > 0 ? Math.round(newProfitLoss / newTotalCost * 1e4) / 100 : 0;
  await upsertInvestment(c.env.DB, {
    ...inv,
    shares,
    avg_cost: Math.round(avgCost * 100) / 100,
    market_value: newMarketValue,
    profit_loss: newProfitLoss,
    return_rate: newReturnRate,
    realized_pnl: Math.round(realizedPnl),
    updated_at: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
  });
  return c.json({ ok: true });
});
app2.delete("/trades/:id", async (c) => {
  const id = c.req.param("id");
  const trade = await c.env.DB.prepare("SELECT * FROM investment_trades WHERE id = ?").bind(id).first();
  if (!trade) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u8A18\u9304" }, 404);
  const allForPair = await getInvestmentTrades(c.env.DB, trade.symbol, trade.account);
  const allInv = await getInvestments(c.env.DB);
  await deleteInvestmentTrade(c.env.DB, id);
  if (trade.transfer_id) {
    await deleteTransferPair(c.env.DB, trade.transfer_id);
  }
  const remaining = allForPair.filter((t) => t.id !== id);
  const inv = allInv.find((i) => i.symbol === trade.symbol && i.account === trade.account);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (remaining.length === 0) {
    if (inv) await deleteInvestment(c.env.DB, inv.id);
    return c.json({ ok: true });
  }
  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date));
  let shares = 0;
  let avgCost = 0;
  let realizedPnl = 0;
  for (const t of sorted) {
    if (t.type === "\u8CB7\u5165") {
      const newShares = shares + t.shares;
      avgCost = newShares > 0 ? (shares * avgCost + t.shares * t.price) / newShares : t.price;
      shares = newShares;
    } else {
      realizedPnl += (t.price - avgCost) * t.shares;
      shares = Math.max(0, shares - t.shares);
    }
  }
  if (shares === 0) {
    if (inv) await deleteInvestment(c.env.DB, inv.id);
    return c.json({ ok: true });
  }
  const currentPerShare = inv ? inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : avgCost) : avgCost;
  const newMarketValue = Math.round(shares * currentPerShare);
  const newTotalCost = Math.round(shares * avgCost);
  const newProfitLoss = newMarketValue - newTotalCost;
  const newReturnRate = newTotalCost > 0 ? Math.round(newProfitLoss / newTotalCost * 1e4) / 100 : 0;
  await upsertInvestment(c.env.DB, {
    ...inv ?? {
      id: void 0,
      name: trade.name,
      symbol: trade.symbol,
      account: trade.account,
      current_price: avgCost,
      previous_close: 0
    },
    shares,
    avg_cost: Math.round(avgCost * 100) / 100,
    market_value: newMarketValue,
    profit_loss: newProfitLoss,
    return_rate: newReturnRate,
    realized_pnl: Math.round(realizedPnl),
    updated_at: today
  });
  return c.json({ ok: true });
});
app2.post("/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file) return c.json({ ok: false, error: "\u8ACB\u4E0A\u50B3 CSV \u6A94\u6848" }, 400);
  const text = await file.text();
  const rows = parseHoldaryCSV(text);
  if (!rows.length) return c.json({ ok: false, error: "\u7121\u6CD5\u89E3\u6790 CSV\uFF0C\u8ACB\u78BA\u8A8D\u683C\u5F0F\u6B63\u78BA" }, 400);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const updated = [];
  const existing = await getInvestments(c.env.DB);
  for (const row of rows) {
    const inv = existing.find((i) => i.symbol === row.symbol);
    const id = await upsertInvestment(c.env.DB, {
      id: inv?.id,
      name: row.name,
      symbol: row.symbol,
      shares: row.shares,
      avg_cost: row.avg_cost,
      market_value: row.market_value,
      profit_loss: row.profit_loss,
      return_rate: row.return_rate,
      realized_pnl: inv?.realized_pnl ?? 0,
      current_price: inv?.current_price ?? 0,
      previous_close: inv?.previous_close ?? 0,
      updated_at: today,
      account: inv?.account ?? ""
    });
    updated.push(id);
  }
  return c.json({ ok: true, updated: updated.length, rows });
});
app2.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const investments = await getInvestments(c.env.DB);
  const inv = investments.find((i) => i.id === id);
  if (!inv) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u6301\u80A1" }, 404);
  const shares = body.shares ?? inv.shares;
  const avgCost = body.avg_cost ?? inv.avg_cost;
  const currentPrice = body.current_price ?? inv.current_price;
  const previousClose = body.previous_close ?? inv.previous_close;
  const marketValue = currentPrice > 0 ? Math.round(shares * currentPrice) : body.market_value ?? Math.round(shares * (inv.shares > 0 ? inv.market_value / inv.shares : avgCost));
  const totalCost = Math.round(shares * avgCost);
  const profitLoss = marketValue - totalCost;
  const returnRate = totalCost > 0 ? profitLoss / totalCost * 100 : 0;
  await upsertInvestment(c.env.DB, {
    id,
    name: inv.name,
    symbol: inv.symbol,
    shares,
    avg_cost: Math.round(avgCost * 100) / 100,
    market_value: marketValue,
    profit_loss: Math.round(profitLoss),
    return_rate: Math.round(returnRate * 100) / 100,
    realized_pnl: inv.realized_pnl ?? 0,
    current_price: currentPrice,
    previous_close: previousClose,
    updated_at: today,
    account: inv.account
  });
  return c.json({ ok: true });
});
var investments_default = app2;

// src/routes/summary.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_queries();
var app3 = new Hono2();
app3.get("/daily", async (c) => {
  const date = c.req.query("date") ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const summary = await getDailySummary(c.env.DB, date);
  if (summary) {
    return c.json({ ok: true, data: summary });
  }
  const { data: txns } = await getTransactions(c.env.DB, { date, limit: 100 });
  const total = txns.reduce((s, t) => s + t.amount, 0);
  const lines = txns.map((t) => `\u2022 ${t.name} $${t.amount.toLocaleString()}\uFF08${t.category}\uFF09`);
  const summaryText = txns.length ? `\u{1F4CA} ${date} \u6D88\u8CBB\u6458\u8981
\u5171 ${txns.length} \u7B46\uFF0C\u7E3D\u91D1\u984D NT$${total.toLocaleString()}

${lines.join("\n")}

\u5DF2\u5BEB\u5165\u7CFB\u7D71 \u2705` : `\u{1F4CA} ${date} \u6D88\u8CBB\u6458\u8981
\u4ECA\u65E5\u7121\u6D88\u8CBB\u8A18\u9304`;
  return c.json({
    ok: true,
    data: {
      date,
      total_amount: total,
      transaction_count: txns.length,
      summary_text: summaryText
    }
  });
});
app3.get("/monthly", async (c) => {
  const now = /* @__PURE__ */ new Date();
  const month = c.req.query("month") ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const summary = await getMonthlySummary(c.env.DB, month);
  const [y, m] = month.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prevSummary = await getMonthlySummary(c.env.DB, prevMonth);
  return c.json({
    ok: true,
    month,
    data: summary,
    prev_month: prevMonth,
    prev_total: prevSummary.total,
    change: summary.total - prevSummary.total
  });
});
var summary_default = app3;

// src/routes/reconcile.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_queries();
var app4 = new Hono2();
app4.get("/", async (c) => {
  const billMonth = c.req.query("month");
  const items = await getReconciliations(c.env.DB, billMonth);
  const stats = {
    total: items.length,
    matched: items.filter((i) => i.status === "\u543B\u5408").length,
    amount_mismatch: items.filter((i) => i.status === "\u91D1\u984D\u4E0D\u7B26").length,
    no_record: items.filter((i) => i.status === "\u7121\u8A18\u9304").length,
    deferred: items.filter((i) => i.status === "\u5EF6\u5F8C\u5165\u5E33").length
  };
  return c.json({ ok: true, data: items, stats });
});
app4.post("/upload", async (c) => {
  const body = await c.req.json();
  if (!body.text || !body.bill_month) {
    return c.json({ ok: false, error: "\u7F3A\u5C11 text \u6216 bill_month" }, 400);
  }
  const billItems = parseSinopacBillText(body.text);
  if (!billItems.length) {
    return c.json({ ok: false, error: "\u7121\u6CD5\u5F9E\u5E33\u55AE\u6587\u5B57\u4E2D\u89E3\u6790\u51FA\u6D88\u8CBB\u8A18\u9304" }, 400);
  }
  await c.env.DB.prepare("DELETE FROM reconciliation WHERE bill_month = ?").bind(body.bill_month).run();
  const [y, m] = body.bill_month.split("-").map(Number);
  const startDate = new Date(y, m - 2, 10);
  const endDate = new Date(y, m - 1, 9);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);
  const { data: systemTxns } = await getTransactions(c.env.DB, { limit: 500 });
  const periodTxns = systemTxns.filter((t) => t.date >= startStr && t.date <= endStr && t.card.startsWith("\u6C38\u8C50") && t.type !== "\u6536\u5165");
  let matched = 0, mismatch = 0, noRecord = 0;
  let totalBillAmount = 0;
  for (const item of billItems) {
    totalBillAmount += item.amount;
    const exactMatch = periodTxns.find(
      (t) => t.date === item.date && t.amount === item.amount && t.status !== "\u5DF2\u5C0D\u5E33"
    );
    if (exactMatch) {
      await createReconciliationItem(c.env.DB, {
        name: item.name,
        bill_amount: item.amount,
        record_amount: exactMatch.amount,
        date: item.date,
        category: exactMatch.category,
        status: "\u543B\u5408",
        bill_month: body.bill_month,
        transaction_id: exactMatch.id,
        note: null
      });
      await updateTransaction(c.env.DB, exactMatch.id, { status: "\u5DF2\u5C0D\u5E33" });
      matched++;
    } else {
      const nameMatch = periodTxns.find(
        (t) => t.name.includes(item.name.slice(0, 4)) || item.name.includes(t.name.slice(0, 4))
      );
      if (nameMatch) {
        await createReconciliationItem(c.env.DB, {
          name: item.name,
          bill_amount: item.amount,
          record_amount: nameMatch.amount,
          date: item.date,
          category: nameMatch.category,
          status: "\u91D1\u984D\u4E0D\u7B26",
          bill_month: body.bill_month,
          transaction_id: nameMatch.id,
          note: `\u5E33\u55AE $${item.amount}\uFF0C\u7CFB\u7D71\u8A18\u9304 $${nameMatch.amount}`
        });
        mismatch++;
      } else {
        const newId = await createTransaction(c.env.DB, {
          name: item.name,
          amount: item.amount,
          date: item.date,
          category: "\u5176\u4ED6",
          card: "\u6C38\u8C50",
          type: "\u652F\u51FA",
          status: "\u5DF2\u5C0D\u5E33",
          source: "\u5E33\u55AE\u88DC\u8A18",
          note: `\u5F9E ${body.bill_month} \u5E33\u55AE\u81EA\u52D5\u88DC\u8A18`,
          transfer_id: null
        });
        await createReconciliationItem(c.env.DB, {
          name: item.name,
          bill_amount: item.amount,
          record_amount: null,
          date: item.date,
          category: "\u5176\u4ED6",
          status: "\u7121\u8A18\u9304",
          bill_month: body.bill_month,
          transaction_id: newId,
          note: "\u5DF2\u81EA\u52D5\u88DC\u8A18"
        });
        noRecord++;
      }
    }
  }
  return c.json({
    ok: true,
    bill_month: body.bill_month,
    total: billItems.length,
    matched,
    mismatch,
    no_record: noRecord,
    total_bill_amount: totalBillAmount
  });
});
app4.post("/:id/defer", async (c) => {
  const id = c.req.param("id");
  const { new_date } = await c.req.json();
  if (!new_date) return c.json({ ok: false, error: "\u7F3A\u5C11 new_date" }, 400);
  const item = await c.env.DB.prepare("SELECT * FROM reconciliation WHERE id = ?").bind(id).first();
  if (!item) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u5C0D\u5E33\u8A18\u9304" }, 404);
  if (item.transaction_id) {
    await updateTransaction(c.env.DB, item.transaction_id, { date: new_date, status: "\u5F85\u78BA\u8A8D" });
  }
  await updateReconciliationItem(c.env.DB, id, { status: "\u5EF6\u5F8C\u5165\u5E33", note: `\u5EF6\u5F8C\u81F3 ${new_date}` });
  return c.json({ ok: true });
});
app4.post("/payment", async (c) => {
  const { from_account, to_account, amount, date, bill_month } = await c.req.json();
  if (!from_account || !to_account || !amount || !date) {
    return c.json({ ok: false, error: "\u7F3A\u5C11\u5FC5\u586B\u6B04\u4F4D" }, 400);
  }
  const transfer_id = await createTransfer(c.env.DB, {
    from_account,
    to_account,
    amount,
    date,
    note: `${bill_month ?? ""} \u4FE1\u7528\u5361\u5E33\u55AE\u4ED8\u6B3E`,
    outName: "\u624B\u52D5\u7E73\u6B3E",
    inName: "\u624B\u52D5\u7E73\u6B3E"
  });
  return c.json({ ok: true, transfer_id });
});
app4.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const ok = await updateReconciliationItem(c.env.DB, id, body);
  if (!ok) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u8A18\u9304" }, 404);
  return c.json({ ok: true });
});
var reconcile_default = app4;

// src/routes/assets.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_queries();
var ACCOUNT_TYPES = ["\u9280\u884C", "\u8B49\u5238\u6236", "\u4FE1\u7528\u5361", "\u73FE\u91D1"];
var app5 = new Hono2();
app5.get("/", async (c) => {
  const [assets, investments] = await Promise.all([
    getAssets(c.env.DB),
    getInvestments(c.env.DB)
  ]);
  const now = /* @__PURE__ */ new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { total: monthlyExpense, income: monthlyIncome } = await getMonthlySummary(c.env.DB, month);
  const included = assets.filter((a) => a.include_in_total !== 0);
  const cashAccounts = included.filter((a) => a.type === "\u9280\u884C" || a.type === "\u73FE\u91D1" || a.type === "\u9280\u884C\u5B58\u6B3E");
  const creditAccounts = included.filter((a) => a.type === "\u4FE1\u7528\u5361");
  const brokerAccounts = included.filter((a) => a.type === "\u8B49\u5238\u6236" || a.type === "\u6295\u8CC7\u5E33\u6236");
  const totalCash = cashAccounts.reduce((s, a) => s + a.balance, 0);
  const creditBalance = creditAccounts.reduce((s, a) => s + a.balance, 0);
  const brokerNames = new Set(brokerAccounts.map((a) => a.name));
  const includedInvTotal = investments.filter((i) => brokerNames.size === 0 || brokerNames.has(i.account)).reduce((s, i) => s + i.market_value, 0);
  const totalInvestments = brokerAccounts.length > 0 ? includedInvTotal : 0;
  const investmentPnL = investments.filter((i) => brokerNames.size === 0 || brokerNames.has(i.account)).reduce((s, i) => s + i.profit_loss, 0);
  return c.json({
    ok: true,
    data: {
      total_net_worth: totalCash + totalInvestments + creditBalance,
      total_cash: totalCash,
      total_investments: totalInvestments,
      total_credit_used: Math.abs(creditBalance),
      investment_pnl: investmentPnL,
      monthly_expense: monthlyExpense,
      monthly_income: monthlyIncome,
      accounts: assets,
      investments
    }
  });
});
app5.post("/", async (c) => {
  const body = await c.req.json();
  if (!body.name || !body.type) {
    return c.json({ ok: false, error: "\u7F3A\u5C11 name \u6216 type" }, 400);
  }
  if (!ACCOUNT_TYPES.includes(body.type) && body.type !== "\u9280\u884C\u5B58\u6B3E" && body.type !== "\u6295\u8CC7\u5E33\u6236") {
    return c.json({ ok: false, error: `type \u5FC5\u9808\u662F\uFF1A${ACCOUNT_TYPES.join("\u3001")}` }, 400);
  }
  const id = await createAsset(c.env.DB, {
    name: body.name,
    type: body.type,
    bank: body.bank ?? "",
    balance: body.balance ?? 0,
    include_in_total: body.include_in_total ?? 1,
    billing_day: body.billing_day ?? null,
    payment_day: body.payment_day ?? null,
    credit_limit: body.credit_limit ?? null,
    payment_method: body.payment_method ?? "manual",
    payment_account: body.payment_account ?? null
  });
  return c.json({ ok: true, id }, 201);
});
app5.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const before = await getAssetById(c.env.DB, id);
  if (!before) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u5E33\u6236" }, 404);
  const updated = await updateAssetFull(c.env.DB, id, {
    name: body.name,
    type: body.type,
    balance: body.balance,
    include_in_total: body.include_in_total,
    ..."billing_day" in body ? { billing_day: body.billing_day } : {},
    ..."payment_day" in body ? { payment_day: body.payment_day } : {},
    ..."credit_limit" in body ? { credit_limit: body.credit_limit } : {},
    ..."payment_method" in body ? { payment_method: body.payment_method } : {},
    ..."payment_account" in body ? { payment_account: body.payment_account } : {}
  });
  if (!updated) return c.json({ ok: false, error: "\u66F4\u65B0\u5931\u6557" }, 500);
  if (body.balance !== void 0 && body.balance !== before.balance) {
    const diff = body.balance - before.balance;
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const accountName = body.name ?? before.name;
    await createTransaction(c.env.DB, {
      name: `\u8ABF\u6574\u9918\u984D\uFF5C${accountName}`,
      amount: Math.abs(diff),
      date: today,
      category: "\u5176\u4ED6",
      card: before.name,
      type: diff >= 0 ? "\u6536\u5165" : "\u652F\u51FA",
      status: "\u5DF2\u5C0D\u5E33",
      source: "\u9918\u984D\u8ABF\u6574",
      note: `\u9918\u984D\u5F9E ${before.balance.toLocaleString()} \u2192 ${body.balance.toLocaleString()}\uFF08${diff >= 0 ? "+" : ""}${diff.toLocaleString()}\uFF09`,
      transfer_id: null
    });
  }
  return c.json({ ok: true, before: before.balance, after: updated.balance });
});
app5.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await deleteAsset(c.env.DB, id);
  if (!ok) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u5E33\u6236" }, 404);
  return c.json({ ok: true });
});
app5.get("/history", async (c) => {
  const months = parseInt(c.req.query("months") ?? "12");
  const history = await getAssetHistory(c.env.DB, months);
  return c.json({ ok: true, data: history });
});
app5.post("/snapshot", async (c) => {
  const [assets, investments] = await Promise.all([
    getAssets(c.env.DB),
    getInvestments(c.env.DB)
  ]);
  const now = /* @__PURE__ */ new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { total: monthlyExpense } = await getMonthlySummary(c.env.DB, month);
  const totalCash = assets.filter((a) => a.type === "\u9280\u884C" || a.type === "\u73FE\u91D1" || a.type === "\u9280\u884C\u5B58\u6B3E").reduce((s, a) => s + a.balance, 0);
  const creditBalance = assets.filter((a) => a.type === "\u4FE1\u7528\u5361").reduce((s, a) => s + a.balance, 0);
  const totalInvestments = investments.reduce((s, i) => s + i.market_value, 0);
  await recordAssetSnapshot(c.env.DB, {
    snapshot_date: now.toISOString().slice(0, 10),
    total_assets: totalCash + totalInvestments + creditBalance,
    total_investments: totalInvestments,
    total_cash: totalCash,
    monthly_expense: monthlyExpense
  });
  return c.json({ ok: true });
});
var assets_default = app5;

// src/routes/categories.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_queries();
var app6 = new Hono2();
app6.get("/", async (c) => {
  const categories = await getCategories(c.env.DB);
  return c.json({ ok: true, data: categories });
});
app6.post("/", async (c) => {
  const { name, type, sort_order, icon } = await c.req.json();
  if (!name?.trim()) return c.json({ ok: false, error: "\u8ACB\u8F38\u5165\u5206\u985E\u540D\u7A31" }, 400);
  const catType = type === "\u6536\u5165" ? "\u6536\u5165" : "\u652F\u51FA";
  try {
    const id = await createCategory(c.env.DB, name.trim(), catType, sort_order, icon);
    return c.json({ ok: true, id }, 201);
  } catch {
    return c.json({ ok: false, error: "\u5206\u985E\u540D\u7A31\u5DF2\u5B58\u5728" }, 409);
  }
});
app6.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  if (body.name !== void 0 && !body.name.trim()) return c.json({ ok: false, error: "\u8ACB\u8F38\u5165\u5206\u985E\u540D\u7A31" }, 400);
  const updateData = {};
  if (body.name !== void 0) updateData.name = body.name.trim();
  if (body.sort_order !== void 0) updateData.sort_order = body.sort_order;
  if ("icon" in body) updateData.icon = body.icon;
  const ok = await updateCategory(c.env.DB, id, updateData);
  if (!ok) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u5206\u985E" }, 404);
  return c.json({ ok: true });
});
app6.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await deleteCategory(c.env.DB, id);
  if (!ok) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u6B64\u5206\u985E" }, 404);
  return c.json({ ok: true });
});
app6.post("/fix-records", async (c) => {
  const db = c.env.DB;
  const { results: cats } = await db.prepare("SELECT name FROM categories").all();
  const catNames = cats.map((c2) => c2.name);
  let fixed = 0;
  const { results: txnCats } = await db.prepare("SELECT DISTINCT category FROM transactions").all();
  for (const { category: old } of txnCats) {
    if (catNames.includes(old)) continue;
    const match2 = catNames.find((n) => old.includes(n));
    if (match2) {
      await db.prepare("UPDATE transactions SET category = ? WHERE category = ?").bind(match2, old).run();
      fixed++;
    }
  }
  const { results: recCats } = await db.prepare("SELECT DISTINCT category FROM recurring_transactions").all();
  for (const { category: old } of recCats) {
    if (catNames.includes(old)) continue;
    const match2 = catNames.find((n) => old.includes(n));
    if (match2) {
      await db.prepare("UPDATE recurring_transactions SET category = ? WHERE category = ?").bind(match2, old).run();
    }
  }
  return c.json({ ok: true, fixed });
});
var categories_default = app6;

// src/routes/recurring.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_queries();
var app7 = new Hono2();
app7.get("/", async (c) => {
  const data = await getRecurring(c.env.DB);
  return c.json({ ok: true, data });
});
app7.post("/", async (c) => {
  const body = await c.req.json();
  const startDate = body.start_date || body.next_date;
  if (!body.name || !body.amount || !body.category || !startDate) {
    return c.json({ ok: false, error: "\u7F3A\u5C11\u5FC5\u586B\u6B04\u4F4D" }, 400);
  }
  body.start_date = startDate;
  body.next_date = startDate;
  const id = await createRecurring(c.env.DB, body);
  return c.json({ ok: true, id });
});
app7.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const ok = await updateRecurring(c.env.DB, id, body);
  return c.json({ ok });
});
app7.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await deleteRecurring(c.env.DB, id);
  return c.json({ ok });
});
app7.get("/:id/transactions", async (c) => {
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM transactions WHERE recurring_id = ? ORDER BY date DESC"
  ).bind(id).all();
  return c.json({ ok: true, data: results });
});
app7.patch("/:id/template", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const ok = await updateRecurring(c.env.DB, id, body);
  return c.json({ ok });
});
app7.patch("/:id/future", async (c) => {
  const id = c.req.param("id");
  const { transaction_id, from_date, fee: feeRaw, ...templateData } = await c.req.json();
  const fee = feeRaw ?? 0;
  if (Object.keys(templateData).length) await updateRecurring(c.env.DB, id, { ...templateData, fee });
  if (from_date) {
    const txnData = {};
    for (const f of ["name", "category", "card"]) {
      if (templateData[f] !== void 0) txnData[f] = templateData[f];
    }
    if (templateData.amount !== void 0) txnData.amount = templateData.amount + fee;
    txnData.note = fee > 0 ? `\u542B\u624B\u7E8C\u8CBB NT$${fee.toLocaleString()}` : templateData.note ?? null;
    const fields = Object.keys(txnData);
    if (fields.length) {
      const sets = fields.map((f) => `${f} = ?`).join(", ");
      const vals = fields.map((f) => txnData[f]);
      await c.env.DB.prepare(
        `UPDATE transactions SET ${sets} WHERE recurring_id = ? AND date >= ?`
      ).bind(...vals, id, from_date).run();
    }
  }
  return c.json({ ok: true });
});
app7.post("/:id/generate", async (c) => {
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare("SELECT * FROM recurring_transactions WHERE id = ?").bind(id).all();
  const item = results[0];
  if (!item) return c.json({ ok: false, error: "\u627E\u4E0D\u5230\u5B9A\u671F\u9805\u76EE" }, 404);
  function calcNext(dateStr, frequency, dayOfMonth = 1) {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (frequency === "weekly") {
      const dt = new Date(y, m - 1, d + 7);
      return dt.toISOString().slice(0, 10);
    }
    if (frequency === "yearly") {
      const maxD2 = new Date(y + 1, m, 0).getDate();
      return `${y + 1}-${String(m).padStart(2, "0")}-${String(Math.min(d, maxD2)).padStart(2, "0")}`;
    }
    let ny = y, nm = m + 1;
    if (nm > 12) {
      nm = 1;
      ny++;
    }
    const maxD = new Date(ny, nm, 0).getDate();
    return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(dayOfMonth, maxD)).padStart(2, "0")}`;
  }
  __name(calcNext, "calcNext");
  const fee = item.fee ?? 0;
  const cardName = item.card ?? "";
  const assetRow = cardName ? await c.env.DB.prepare("SELECT id FROM assets WHERE name = ? LIMIT 1").bind(cardName).first() : null;
  const accountId = assetRow?.id ?? null;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const body = await c.req.json().catch(() => ({}));
  const until = body.until_date ?? today;
  let nd = item.next_date;
  let count3 = 0;
  while (nd <= until && count3 < 120) {
    const exists = await c.env.DB.prepare(
      "SELECT id FROM transactions WHERE recurring_id = ? AND date = ? LIMIT 1"
    ).bind(id, nd).first();
    if (!exists) {
      await createTransaction(c.env.DB, {
        name: item.name,
        amount: item.amount + fee,
        date: nd,
        category: item.category,
        card: cardName,
        account_id: accountId,
        type: item.type,
        status: "\u5F85\u78BA\u8A8D",
        source: "\u5B9A\u671F",
        note: fee > 0 ? `\u542B\u624B\u7E8C\u8CBB NT$${fee.toLocaleString()}` : item.note ?? null,
        transfer_id: null,
        recurring_id: item.id
      });
      count3++;
    }
    nd = calcNext(nd, item.frequency, item.day_of_month);
  }
  await updateRecurring(c.env.DB, id, { next_date: nd, last_generated: today });
  return c.json({ ok: true, count: count3 });
});
app7.delete("/:id/terminate", async (c) => {
  const id = c.req.param("id");
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  await c.env.DB.prepare(
    "DELETE FROM transactions WHERE recurring_id = ? AND date > ? AND status = '\u5F85\u78BA\u8A8D'"
  ).bind(id, today).run();
  const ok = await updateRecurring(c.env.DB, id, { is_active: 0, end_date: today });
  return c.json({ ok });
});
app7.post("/process", async (c) => {
  const count3 = await processRecurring(c.env.DB);
  return c.json({ ok: true, count: count3 });
});
var recurring_default = app7;

// src/routes/auth.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var app8 = new Hono2();
app8.post("/login", async (c) => {
  const { pin } = await c.req.json();
  if (!pin || pin !== c.env.AUTH_PIN) {
    return c.json({ ok: false, error: "\u5BC6\u78BC\u932F\u8AA4" }, 401);
  }
  return c.json({ ok: true, token: c.env.AUTH_TOKEN });
});
var auth_default = app8;

// src/installer-entry.ts
init_queries();
var app9 = new Hono2();
app9.use("/api/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));
app9.get("/api/app-config", async (c) => {
  try {
    const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("app_name").first();
    const app_name = row?.value || c.env.APP_NAME || "\u6211\u7684\u8CA1\u52D9";
    return c.json({ app_name });
  } catch {
    return c.json({ app_name: c.env.APP_NAME || "\u6211\u7684\u8CA1\u52D9" });
  }
});
app9.get("/manifest.json", async (c) => {
  let appName = c.env.APP_NAME || "\u6211\u7684\u8CA1\u52D9";
  try {
    const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("app_name").first();
    if (row?.value) appName = row.value;
  } catch {
  }
  return c.json({
    name: appName,
    short_name: appName,
    description: "\u500B\u4EBA\u8CA1\u52D9\u7BA1\u7406\u7CFB\u7D71",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d1117",
    theme_color: "#161b22",
    orientation: "portrait-primary",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }]
  }, 200, { "Content-Type": "application/manifest+json" });
});
app9.route("/api/auth", auth_default);
app9.use("/api/*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  if (c.req.path === "/api/cron/run") return next();
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token || token !== c.env.AUTH_TOKEN) {
    return c.json({ ok: false, error: "\u672A\u6388\u6B0A" }, 401);
  }
  return next();
});
app9.patch("/api/app-config", async (c) => {
  const body = await c.req.json();
  const name = (body.app_name ?? "").trim();
  if (!name) return c.json({ ok: false, error: "\u540D\u7A31\u4E0D\u80FD\u70BA\u7A7A" }, 400);
  await c.env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).bind("app_name", name).run();
  return c.json({ ok: true, app_name: name });
});
app9.post("/api/self-update", async (c) => {
  const token = c.env.CF_API_TOKEN;
  const workerName = c.env.WORKER_NAME;
  if (!token || !workerName) {
    return c.json({ ok: false, error: "\u6B64\u7248\u672C\u4E0D\u652F\u63F4\u4E00\u9375\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u5B89\u88DD" }, 400);
  }
  const bundleRes = await fetch((c.env.STATIC_ORIGIN || "https://ricky-finance.ke877857.workers.dev") + "/installer-worker.js");
  if (!bundleRes.ok) {
    return c.json({ ok: false, error: "\u7121\u6CD5\u53D6\u5F97\u6700\u65B0\u7248\u672C" }, 502);
  }
  const bundle = await bundleRes.text();
  const upstream = (c.env.STATIC_ORIGIN || "https://ricky-finance.ke877857.workers.dev") + "/api/installer/update";
  const res = await fetch(upstream, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_token: token, worker_name: workerName, bundle })
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "text/event-stream" }
  });
});
app9.route("/api/transactions", transactions_default);
app9.route("/api/investments", investments_default);
app9.route("/api/summary", summary_default);
app9.route("/api/reconcile", reconcile_default);
app9.route("/api/assets", assets_default);
app9.route("/api/categories", categories_default);
app9.route("/api/recurring", recurring_default);
app9.get("/api/shortcut/data", async (c) => {
  const { getCategories: getCategories2 } = await Promise.resolve().then(() => (init_queries(), queries_exports));
  const [cats, assets] = await Promise.all([getCategories2(c.env.DB), getAssets(c.env.DB)]);
  const expCats = cats.filter((ct) => ct.type !== "\u6536\u5165");
  const incCats = cats.filter((ct) => ct.type === "\u6536\u5165");
  return c.json({
    expense_categories: expCats.map((ct) => ct.name),
    income_categories: incCats.map((ct) => ct.name),
    accounts: assets.filter((a) => a.type !== "\u6295\u8CC7\u5E33\u6236").map((a) => a.name),
    expense_category_objects: expCats.map((ct) => ({ name: ct.name, icon: ct.icon ?? null })),
    income_category_objects: incCats.map((ct) => ({ name: ct.name, icon: ct.icon ?? null }))
  });
});
app9.post("/api/cron/run", async (c) => {
  const secret = c.req.header("x-cron-secret");
  if (secret !== c.env.CRON_SECRET) {
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }
  return runNightlyJob(c.env).then((result) => c.json({ ok: true, ...result })).catch((e) => c.json({ ok: false, error: String(e) }, 500));
});
app9.all("*", async (c) => {
  const origin = c.env.STATIC_ORIGIN || "https://ricky-finance.ke877857.workers.dev";
  const url = new URL(c.req.url);
  try {
    const res = await fetch(origin + url.pathname + url.search);
    const contentType = res.headers.get("Content-Type") || "text/html; charset=utf-8";
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": contentType }
    });
  } catch {
    return c.text("\u8F09\u5165\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66", 502);
  }
});
var installer_entry_default = {
  fetch: app9.fetch,
  async scheduled(_event, env2, ctx) {
    ctx.waitUntil(runNightlyJob(env2).catch((e) => console.error("[cron] runNightlyJob \u5931\u6557\uFF1A", e)));
  }
};
async function runNightlyJob(env2) {
  const DB = env2.DB;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  try {
    const [allAssetsSnap, allInvestmentsSnap] = await Promise.all([getAssets(DB), getInvestments(DB)]);
    const monthKey = today.slice(0, 7);
    const { total: monthlyExpense } = await getMonthlySummary(DB, monthKey);
    const totalCash = allAssetsSnap.filter((a) => a.type === "\u9280\u884C" || a.type === "\u73FE\u91D1" || a.type === "\u9280\u884C\u5B58\u6B3E").reduce((s, a) => s + a.balance, 0);
    const totalInvestmentsValue = allInvestmentsSnap.reduce((s, i) => s + i.market_value, 0);
    await recordAssetSnapshot(DB, { snapshot_date: today, total_assets: totalCash + totalInvestmentsValue, total_investments: totalInvestmentsValue, total_cash: totalCash, monthly_expense: monthlyExpense });
  } catch (e) {
    console.error("[cron] \u8CC7\u7522\u5FEB\u7167\u8A18\u9304\u5931\u6557\uFF0C" + today + " \u9019\u5929\u5C07\u6C38\u4E45\u7F3A\u8CC7\u6599\uFF1A", e);
  }
  const recurringCount = await processRecurring(DB);
  const taiwanNow = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const todayDay = taiwanNow.getDate();
  const todayStr = `${taiwanNow.getFullYear()}-${String(taiwanNow.getMonth() + 1).padStart(2, "0")}-${String(taiwanNow.getDate()).padStart(2, "0")}`;
  const allAssets = await getAssets(DB);
  for (const cc of allAssets) {
    if (cc.type !== "\u4FE1\u7528\u5361" || cc.payment_method !== "auto" || !cc.payment_account || cc.billing_day !== todayDay) continue;
    const y = taiwanNow.getFullYear(), m = taiwanNow.getMonth() + 1;
    const monthStr = `${y}-${String(m).padStart(2, "0")}`;
    const fmt = /* @__PURE__ */ __name((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, "fmt");
    const periodStart = fmt(new Date(y, m - 2, cc.billing_day + 1));
    const { data: txns2 } = await getTransactions(DB, { date_from: periodStart, date_to: todayStr, card: cc.name, limit: 1e3 });
    const billAmount = txns2.filter((t) => t.type !== "\u6536\u5165" && !t.transfer_id).reduce((s, t) => s + t.amount, 0);
    if (billAmount > 0) {
      await createTransfer(DB, { from_account: cc.payment_account, to_account: cc.name, amount: billAmount, date: todayStr, note: `${monthStr} \u81EA\u52D5\u6263\u7E73`, outName: "\u81EA\u52D5\u6263\u7E73", inName: "\u81EA\u52D5\u6263\u7E73" });
    }
  }
  const { data: txns } = await getTransactions(DB, { date: today, limit: 100 });
  const totalAmount = txns.reduce((s, t) => s + t.amount, 0);
  const summaryText = txns.length ? `\u{1F4CA} ${today} \u6D88\u8CBB\u6458\u8981
\u5171 ${txns.length} \u7B46\uFF0C\u7E3D\u91D1\u984D NT$${totalAmount.toLocaleString()}` : `\u{1F4CA} ${today} \u6D88\u8CBB\u6458\u8981
\u4ECA\u65E5\u7121\u6D88\u8CBB\u8A18\u9304`;
  await upsertDailySummary(DB, today, {
    total_amount: totalAmount,
    transaction_count: txns.length,
    summary_text: summaryText
  });
  return { date: today, recurring_generated: recurringCount };
}
__name(runNightlyJob, "runNightlyJob");
export {
  installer_entry_default as default
};
//# sourceMappingURL=installer-entry.js.map
