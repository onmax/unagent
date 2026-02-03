var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../node_modules/.pnpm/@cloudflare+sandbox@0.7.0/node_modules/@cloudflare/sandbox/dist/dist-BpbdH8ry.js
function getEnvString(env, key) {
  const value = env?.[key];
  return typeof value === "string" ? value : void 0;
}
__name(getEnvString, "getEnvString");
function filterEnvVars(envVars) {
  const filtered = {};
  for (const [key, value] of Object.entries(envVars)) if (value != null && typeof value === "string") filtered[key] = value;
  return filtered;
}
__name(filterEnvVars, "filterEnvVars");
function partitionEnvVars(envVars) {
  const toSet = {};
  const toUnset = [];
  for (const [key, value] of Object.entries(envVars)) if (value != null && typeof value === "string") toSet[key] = value;
  else toUnset.push(key);
  return {
    toSet,
    toUnset
  };
}
__name(partitionEnvVars, "partitionEnvVars");
var FALLBACK_REPO_NAME = "repository";
function extractRepoName(repoUrl) {
  try {
    const pathParts = new URL(repoUrl).pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) return lastPart.replace(/\.git$/, "");
  } catch {
  }
  if (repoUrl.includes(":") || repoUrl.includes("/")) {
    const segments = repoUrl.split(/[:/]/).filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) return lastSegment.replace(/\.git$/, "");
  }
  return FALLBACK_REPO_NAME;
}
__name(extractRepoName, "extractRepoName");
function redactCredentials(text) {
  let result = text;
  let pos = 0;
  while (pos < result.length) {
    const httpPos = result.indexOf("http://", pos);
    const httpsPos = result.indexOf("https://", pos);
    let protocolPos = -1;
    let protocolLen = 0;
    if (httpPos === -1 && httpsPos === -1) break;
    if (httpPos !== -1 && (httpsPos === -1 || httpPos < httpsPos)) {
      protocolPos = httpPos;
      protocolLen = 7;
    } else {
      protocolPos = httpsPos;
      protocolLen = 8;
    }
    const searchStart = protocolPos + protocolLen;
    const atPos = result.indexOf("@", searchStart);
    let urlEnd = searchStart;
    while (urlEnd < result.length) {
      const char = result[urlEnd];
      if (/[\s"'`<>,;{}[\]]/.test(char)) break;
      urlEnd++;
    }
    if (atPos !== -1 && atPos < urlEnd) {
      result = `${result.substring(0, searchStart)}******${result.substring(atPos)}`;
      pos = searchStart + 6;
    } else pos = protocolPos + protocolLen;
  }
  return result;
}
__name(redactCredentials, "redactCredentials");
function sanitizeGitData(data) {
  if (typeof data === "string") return redactCredentials(data);
  if (data === null || data === void 0) return data;
  if (Array.isArray(data)) return data.map((item) => sanitizeGitData(item));
  if (typeof data === "object") {
    const result = {};
    for (const [key, value] of Object.entries(data)) result[key] = sanitizeGitData(value);
    return result;
  }
  return data;
}
__name(sanitizeGitData, "sanitizeGitData");
var GitLogger = class GitLogger2 {
  static {
    __name(this, "GitLogger");
  }
  baseLogger;
  constructor(baseLogger) {
    this.baseLogger = baseLogger;
  }
  sanitizeContext(context) {
    return context ? sanitizeGitData(context) : context;
  }
  sanitizeError(error) {
    if (!error) return error;
    const sanitized = new Error(redactCredentials(error.message));
    sanitized.name = error.name;
    if (error.stack) sanitized.stack = redactCredentials(error.stack);
    const sanitizedRecord = sanitized;
    const errorRecord = error;
    for (const key of Object.keys(error)) if (key !== "message" && key !== "stack" && key !== "name") sanitizedRecord[key] = sanitizeGitData(errorRecord[key]);
    return sanitized;
  }
  debug(message, context) {
    this.baseLogger.debug(message, this.sanitizeContext(context));
  }
  info(message, context) {
    this.baseLogger.info(message, this.sanitizeContext(context));
  }
  warn(message, context) {
    this.baseLogger.warn(message, this.sanitizeContext(context));
  }
  error(message, error, context) {
    this.baseLogger.error(message, this.sanitizeError(error), this.sanitizeContext(context));
  }
  child(context) {
    const sanitized = sanitizeGitData(context);
    return new GitLogger2(this.baseLogger.child(sanitized));
  }
};
var Execution = class {
  static {
    __name(this, "Execution");
  }
  code;
  context;
  /**
  * All results from the execution
  */
  results = [];
  /**
  * Accumulated stdout and stderr
  */
  logs = {
    stdout: [],
    stderr: []
  };
  /**
  * Execution error if any
  */
  error;
  /**
  * Execution count (for interpreter)
  */
  executionCount;
  constructor(code, context) {
    this.code = code;
    this.context = context;
  }
  /**
  * Convert to a plain object for serialization
  */
  toJSON() {
    return {
      code: this.code,
      logs: this.logs,
      error: this.error,
      executionCount: this.executionCount,
      results: this.results.map((result) => ({
        text: result.text,
        html: result.html,
        png: result.png,
        jpeg: result.jpeg,
        svg: result.svg,
        latex: result.latex,
        markdown: result.markdown,
        javascript: result.javascript,
        json: result.json,
        chart: result.chart,
        data: result.data
      }))
    };
  }
};
var ResultImpl = class {
  static {
    __name(this, "ResultImpl");
  }
  raw;
  constructor(raw) {
    this.raw = raw;
  }
  get text() {
    return this.raw.text || this.raw.data?.["text/plain"];
  }
  get html() {
    return this.raw.html || this.raw.data?.["text/html"];
  }
  get png() {
    return this.raw.png || this.raw.data?.["image/png"];
  }
  get jpeg() {
    return this.raw.jpeg || this.raw.data?.["image/jpeg"];
  }
  get svg() {
    return this.raw.svg || this.raw.data?.["image/svg+xml"];
  }
  get latex() {
    return this.raw.latex || this.raw.data?.["text/latex"];
  }
  get markdown() {
    return this.raw.markdown || this.raw.data?.["text/markdown"];
  }
  get javascript() {
    return this.raw.javascript || this.raw.data?.["application/javascript"];
  }
  get json() {
    return this.raw.json || this.raw.data?.["application/json"];
  }
  get chart() {
    return this.raw.chart;
  }
  get data() {
    return this.raw.data;
  }
  formats() {
    const formats = [];
    if (this.text) formats.push("text");
    if (this.html) formats.push("html");
    if (this.png) formats.push("png");
    if (this.jpeg) formats.push("jpeg");
    if (this.svg) formats.push("svg");
    if (this.latex) formats.push("latex");
    if (this.markdown) formats.push("markdown");
    if (this.javascript) formats.push("javascript");
    if (this.json) formats.push("json");
    if (this.chart) formats.push("chart");
    return formats;
  }
};
var LogLevel;
(function(LogLevel$1) {
  LogLevel$1[LogLevel$1["DEBUG"] = 0] = "DEBUG";
  LogLevel$1[LogLevel$1["INFO"] = 1] = "INFO";
  LogLevel$1[LogLevel$1["WARN"] = 2] = "WARN";
  LogLevel$1[LogLevel$1["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
var COLORS = {
  reset: "\x1B[0m",
  debug: "\x1B[36m",
  info: "\x1B[32m",
  warn: "\x1B[33m",
  error: "\x1B[31m",
  dim: "\x1B[2m"
};
var CloudflareLogger = class CloudflareLogger2 {
  static {
    __name(this, "CloudflareLogger");
  }
  baseContext;
  minLevel;
  pretty;
  /**
  * Create a new CloudflareLogger
  *
  * @param baseContext Base context included in all log entries
  * @param minLevel Minimum log level to output (default: INFO)
  * @param pretty Enable pretty printing for human-readable output (default: false)
  */
  constructor(baseContext, minLevel = LogLevel.INFO, pretty = false) {
    this.baseContext = baseContext;
    this.minLevel = minLevel;
    this.pretty = pretty;
  }
  /**
  * Log debug-level message
  */
  debug(message, context) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const logData = this.buildLogData("debug", message, context);
      this.output(console.log, logData);
    }
  }
  /**
  * Log info-level message
  */
  info(message, context) {
    if (this.shouldLog(LogLevel.INFO)) {
      const logData = this.buildLogData("info", message, context);
      this.output(console.log, logData);
    }
  }
  /**
  * Log warning-level message
  */
  warn(message, context) {
    if (this.shouldLog(LogLevel.WARN)) {
      const logData = this.buildLogData("warn", message, context);
      this.output(console.warn, logData);
    }
  }
  /**
  * Log error-level message
  */
  error(message, error, context) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const logData = this.buildLogData("error", message, context, error);
      this.output(console.error, logData);
    }
  }
  /**
  * Create a child logger with additional context
  */
  child(context) {
    return new CloudflareLogger2({
      ...this.baseContext,
      ...context
    }, this.minLevel, this.pretty);
  }
  /**
  * Check if a log level should be output
  */
  shouldLog(level) {
    return level >= this.minLevel;
  }
  /**
  * Build log data object
  */
  buildLogData(level, message, context, error) {
    const logData = {
      level,
      msg: message,
      ...this.baseContext,
      ...context,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (error) logData.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    return logData;
  }
  /**
  * Output log data to console (pretty or JSON)
  */
  output(consoleFn, data) {
    if (this.pretty) this.outputPretty(consoleFn, data);
    else this.outputJson(consoleFn, data);
  }
  /**
  * Output as JSON (production)
  */
  outputJson(consoleFn, data) {
    consoleFn(JSON.stringify(data));
  }
  /**
  * Output as pretty-printed, colored text (development)
  *
  * Format: LEVEL [component] message (trace: tr_...) {context}
  * Example: INFO [sandbox-do] Command started (trace: tr_7f3a9b2c) {commandId: "cmd-123"}
  */
  outputPretty(consoleFn, data) {
    const { level, msg, timestamp, traceId, component, sandboxId, sessionId, processId, commandId, operation, duration, error, ...rest } = data;
    const levelStr = String(level || "INFO").toUpperCase();
    const levelColor = this.getLevelColor(levelStr);
    const componentBadge = component ? `[${component}]` : "";
    const traceIdShort = traceId ? String(traceId).substring(0, 12) : "";
    let logLine = `${levelColor}${levelStr.padEnd(5)}${COLORS.reset} ${componentBadge} ${msg}`;
    if (traceIdShort) logLine += ` ${COLORS.dim}(trace: ${traceIdShort})${COLORS.reset}`;
    const contextFields = [];
    if (operation) contextFields.push(`operation: ${operation}`);
    if (commandId) contextFields.push(`commandId: ${String(commandId).substring(0, 12)}`);
    if (sandboxId) contextFields.push(`sandboxId: ${sandboxId}`);
    if (sessionId) contextFields.push(`sessionId: ${String(sessionId).substring(0, 12)}`);
    if (processId) contextFields.push(`processId: ${processId}`);
    if (duration !== void 0) contextFields.push(`duration: ${duration}ms`);
    if (contextFields.length > 0) logLine += ` ${COLORS.dim}{${contextFields.join(", ")}}${COLORS.reset}`;
    consoleFn(logLine);
    if (error && typeof error === "object") {
      const errorObj = error;
      if (errorObj.message) consoleFn(`  ${COLORS.error}Error: ${errorObj.message}${COLORS.reset}`);
      if (errorObj.stack) consoleFn(`  ${COLORS.dim}${errorObj.stack}${COLORS.reset}`);
    }
    if (Object.keys(rest).length > 0) consoleFn(`  ${COLORS.dim}${JSON.stringify(rest, null, 2)}${COLORS.reset}`);
  }
  /**
  * Get ANSI color code for log level
  */
  getLevelColor(level) {
    switch (level.toLowerCase()) {
      case "debug":
        return COLORS.debug;
      case "info":
        return COLORS.info;
      case "warn":
        return COLORS.warn;
      case "error":
        return COLORS.error;
      default:
        return COLORS.reset;
    }
  }
};
var TraceContext = class TraceContext2 {
  static {
    __name(this, "TraceContext");
  }
  /**
  * HTTP header name for trace ID propagation
  */
  static TRACE_HEADER = "X-Trace-Id";
  /**
  * Generate a new trace ID
  *
  * Format: "tr_" + 16 random hex characters
  * Example: "tr_7f3a9b2c4e5d6f1a"
  *
  * @returns Newly generated trace ID
  */
  static generate() {
    return `tr_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
  }
  /**
  * Extract trace ID from HTTP request headers
  *
  * @param headers Request headers
  * @returns Trace ID if present, null otherwise
  */
  static fromHeaders(headers) {
    return headers.get(TraceContext2.TRACE_HEADER);
  }
  /**
  * Create headers object with trace ID for outgoing requests
  *
  * @param traceId Trace ID to include
  * @returns Headers object with X-Trace-Id set
  */
  static toHeaders(traceId) {
    return { [TraceContext2.TRACE_HEADER]: traceId };
  }
  /**
  * Get the header name used for trace ID propagation
  *
  * @returns Header name ("X-Trace-Id")
  */
  static getHeaderName() {
    return TraceContext2.TRACE_HEADER;
  }
};
function createNoOpLogger() {
  return {
    debug: /* @__PURE__ */ __name(() => {
    }, "debug"),
    info: /* @__PURE__ */ __name(() => {
    }, "info"),
    warn: /* @__PURE__ */ __name(() => {
    }, "warn"),
    error: /* @__PURE__ */ __name(() => {
    }, "error"),
    child: /* @__PURE__ */ __name(() => createNoOpLogger(), "child")
  };
}
__name(createNoOpLogger, "createNoOpLogger");
function createLogger(context) {
  const minLevel = getLogLevelFromEnv();
  const pretty = isPrettyPrintEnabled();
  return new CloudflareLogger({
    ...context,
    traceId: context.traceId || TraceContext.generate(),
    component: context.component
  }, minLevel, pretty);
}
__name(createLogger, "createLogger");
function getLogLevelFromEnv() {
  switch ((getEnvVar("SANDBOX_LOG_LEVEL") || "info").toLowerCase()) {
    case "debug":
      return LogLevel.DEBUG;
    case "info":
      return LogLevel.INFO;
    case "warn":
      return LogLevel.WARN;
    case "error":
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
}
__name(getLogLevelFromEnv, "getLogLevelFromEnv");
function isPrettyPrintEnabled() {
  const format = getEnvVar("SANDBOX_LOG_FORMAT");
  if (format) return format.toLowerCase() === "pretty";
  return false;
}
__name(isPrettyPrintEnabled, "isPrettyPrintEnabled");
function getEnvVar(name) {
  if (typeof process !== "undefined" && process.env) return process.env[name];
  if (typeof Bun !== "undefined") {
    const bunEnv = Bun.env;
    if (bunEnv) return bunEnv[name];
  }
}
__name(getEnvVar, "getEnvVar");
function shellEscape(str) {
  return `'${str.replace(/'/g, "'\\''")}'`;
}
__name(shellEscape, "shellEscape");
function isWSResponse(msg) {
  return typeof msg === "object" && msg !== null && "type" in msg && msg.type === "response";
}
__name(isWSResponse, "isWSResponse");
function isWSStreamChunk(msg) {
  return typeof msg === "object" && msg !== null && "type" in msg && msg.type === "stream";
}
__name(isWSStreamChunk, "isWSStreamChunk");
function isWSError(msg) {
  return typeof msg === "object" && msg !== null && "type" in msg && msg.type === "error";
}
__name(isWSError, "isWSError");
function generateRequestId() {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}
__name(generateRequestId, "generateRequestId");

// ../node_modules/.pnpm/@cloudflare+sandbox@0.7.0/node_modules/@cloudflare/sandbox/dist/errors-BCXUmJUn.js
var ErrorCode = {
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  FILE_EXISTS: "FILE_EXISTS",
  IS_DIRECTORY: "IS_DIRECTORY",
  NOT_DIRECTORY: "NOT_DIRECTORY",
  NO_SPACE: "NO_SPACE",
  TOO_MANY_FILES: "TOO_MANY_FILES",
  RESOURCE_BUSY: "RESOURCE_BUSY",
  READ_ONLY: "READ_ONLY",
  NAME_TOO_LONG: "NAME_TOO_LONG",
  TOO_MANY_LINKS: "TOO_MANY_LINKS",
  FILESYSTEM_ERROR: "FILESYSTEM_ERROR",
  COMMAND_NOT_FOUND: "COMMAND_NOT_FOUND",
  COMMAND_PERMISSION_DENIED: "COMMAND_PERMISSION_DENIED",
  INVALID_COMMAND: "INVALID_COMMAND",
  COMMAND_EXECUTION_ERROR: "COMMAND_EXECUTION_ERROR",
  STREAM_START_ERROR: "STREAM_START_ERROR",
  PROCESS_NOT_FOUND: "PROCESS_NOT_FOUND",
  PROCESS_PERMISSION_DENIED: "PROCESS_PERMISSION_DENIED",
  PROCESS_ERROR: "PROCESS_ERROR",
  SESSION_ALREADY_EXISTS: "SESSION_ALREADY_EXISTS",
  PORT_ALREADY_EXPOSED: "PORT_ALREADY_EXPOSED",
  PORT_IN_USE: "PORT_IN_USE",
  PORT_NOT_EXPOSED: "PORT_NOT_EXPOSED",
  INVALID_PORT_NUMBER: "INVALID_PORT_NUMBER",
  INVALID_PORT: "INVALID_PORT",
  SERVICE_NOT_RESPONDING: "SERVICE_NOT_RESPONDING",
  PORT_OPERATION_ERROR: "PORT_OPERATION_ERROR",
  CUSTOM_DOMAIN_REQUIRED: "CUSTOM_DOMAIN_REQUIRED",
  GIT_REPOSITORY_NOT_FOUND: "GIT_REPOSITORY_NOT_FOUND",
  GIT_BRANCH_NOT_FOUND: "GIT_BRANCH_NOT_FOUND",
  GIT_AUTH_FAILED: "GIT_AUTH_FAILED",
  GIT_NETWORK_ERROR: "GIT_NETWORK_ERROR",
  INVALID_GIT_URL: "INVALID_GIT_URL",
  GIT_CLONE_FAILED: "GIT_CLONE_FAILED",
  GIT_CHECKOUT_FAILED: "GIT_CHECKOUT_FAILED",
  GIT_OPERATION_FAILED: "GIT_OPERATION_FAILED",
  BUCKET_MOUNT_ERROR: "BUCKET_MOUNT_ERROR",
  S3FS_MOUNT_ERROR: "S3FS_MOUNT_ERROR",
  MISSING_CREDENTIALS: "MISSING_CREDENTIALS",
  INVALID_MOUNT_CONFIG: "INVALID_MOUNT_CONFIG",
  INTERPRETER_NOT_READY: "INTERPRETER_NOT_READY",
  CONTEXT_NOT_FOUND: "CONTEXT_NOT_FOUND",
  CODE_EXECUTION_ERROR: "CODE_EXECUTION_ERROR",
  PYTHON_NOT_AVAILABLE: "PYTHON_NOT_AVAILABLE",
  JAVASCRIPT_NOT_AVAILABLE: "JAVASCRIPT_NOT_AVAILABLE",
  OPENCODE_STARTUP_FAILED: "OPENCODE_STARTUP_FAILED",
  PROCESS_READY_TIMEOUT: "PROCESS_READY_TIMEOUT",
  PROCESS_EXITED_BEFORE_READY: "PROCESS_EXITED_BEFORE_READY",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_JSON_RESPONSE: "INVALID_JSON_RESPONSE",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};
var ERROR_STATUS_MAP = {
  [ErrorCode.FILE_NOT_FOUND]: 404,
  [ErrorCode.COMMAND_NOT_FOUND]: 404,
  [ErrorCode.PROCESS_NOT_FOUND]: 404,
  [ErrorCode.PORT_NOT_EXPOSED]: 404,
  [ErrorCode.GIT_REPOSITORY_NOT_FOUND]: 404,
  [ErrorCode.GIT_BRANCH_NOT_FOUND]: 404,
  [ErrorCode.CONTEXT_NOT_FOUND]: 404,
  [ErrorCode.IS_DIRECTORY]: 400,
  [ErrorCode.NOT_DIRECTORY]: 400,
  [ErrorCode.INVALID_COMMAND]: 400,
  [ErrorCode.INVALID_PORT_NUMBER]: 400,
  [ErrorCode.INVALID_PORT]: 400,
  [ErrorCode.INVALID_GIT_URL]: 400,
  [ErrorCode.CUSTOM_DOMAIN_REQUIRED]: 400,
  [ErrorCode.INVALID_JSON_RESPONSE]: 400,
  [ErrorCode.NAME_TOO_LONG]: 400,
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.MISSING_CREDENTIALS]: 400,
  [ErrorCode.INVALID_MOUNT_CONFIG]: 400,
  [ErrorCode.GIT_AUTH_FAILED]: 401,
  [ErrorCode.PERMISSION_DENIED]: 403,
  [ErrorCode.COMMAND_PERMISSION_DENIED]: 403,
  [ErrorCode.PROCESS_PERMISSION_DENIED]: 403,
  [ErrorCode.READ_ONLY]: 403,
  [ErrorCode.FILE_EXISTS]: 409,
  [ErrorCode.PORT_ALREADY_EXPOSED]: 409,
  [ErrorCode.PORT_IN_USE]: 409,
  [ErrorCode.RESOURCE_BUSY]: 409,
  [ErrorCode.SESSION_ALREADY_EXISTS]: 409,
  [ErrorCode.SERVICE_NOT_RESPONDING]: 502,
  [ErrorCode.GIT_NETWORK_ERROR]: 502,
  [ErrorCode.PYTHON_NOT_AVAILABLE]: 501,
  [ErrorCode.JAVASCRIPT_NOT_AVAILABLE]: 501,
  [ErrorCode.INTERPRETER_NOT_READY]: 503,
  [ErrorCode.OPENCODE_STARTUP_FAILED]: 503,
  [ErrorCode.PROCESS_READY_TIMEOUT]: 408,
  [ErrorCode.PROCESS_EXITED_BEFORE_READY]: 500,
  [ErrorCode.NO_SPACE]: 500,
  [ErrorCode.TOO_MANY_FILES]: 500,
  [ErrorCode.TOO_MANY_LINKS]: 500,
  [ErrorCode.FILESYSTEM_ERROR]: 500,
  [ErrorCode.COMMAND_EXECUTION_ERROR]: 500,
  [ErrorCode.STREAM_START_ERROR]: 500,
  [ErrorCode.PROCESS_ERROR]: 500,
  [ErrorCode.PORT_OPERATION_ERROR]: 500,
  [ErrorCode.GIT_CLONE_FAILED]: 500,
  [ErrorCode.GIT_CHECKOUT_FAILED]: 500,
  [ErrorCode.GIT_OPERATION_FAILED]: 500,
  [ErrorCode.CODE_EXECUTION_ERROR]: 500,
  [ErrorCode.BUCKET_MOUNT_ERROR]: 500,
  [ErrorCode.S3FS_MOUNT_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500,
  [ErrorCode.INTERNAL_ERROR]: 500
};

// ../node_modules/.pnpm/@cloudflare+containers@0.0.30/node_modules/@cloudflare/containers/dist/lib/helpers.js
function generateId(length = 9) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i2 = 0; i2 < length; i2++) {
    result += alphabet[bytes[i2] % alphabet.length];
  }
  return result;
}
__name(generateId, "generateId");
function parseTimeExpression(timeExpression) {
  if (typeof timeExpression === "number") {
    return timeExpression;
  }
  if (typeof timeExpression === "string") {
    const match = timeExpression.match(/^(\d+)([smh])$/);
    if (!match) {
      throw new Error(`invalid time expression ${timeExpression}`);
    }
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      default:
        throw new Error(`unknown time unit ${unit}`);
    }
  }
  throw new Error(`invalid type for a time expression: ${typeof timeExpression}`);
}
__name(parseTimeExpression, "parseTimeExpression");

// ../node_modules/.pnpm/@cloudflare+containers@0.0.30/node_modules/@cloudflare/containers/dist/lib/container.js
import { DurableObject } from "cloudflare:workers";
var NO_CONTAINER_INSTANCE_ERROR = "there is no container instance that can be provided to this durable object";
var RUNTIME_SIGNALLED_ERROR = "runtime signalled the container to exit:";
var UNEXPECTED_EXIT_ERROR = "container exited with unexpected exit code:";
var NOT_LISTENING_ERROR = "the container is not listening";
var CONTAINER_STATE_KEY = "__CF_CONTAINER_STATE";
var MAX_ALARM_RETRIES = 3;
var PING_TIMEOUT_MS = 5e3;
var DEFAULT_SLEEP_AFTER = "10m";
var INSTANCE_POLL_INTERVAL_MS = 300;
var TIMEOUT_TO_GET_CONTAINER_MS = 8e3;
var TIMEOUT_TO_GET_PORTS_MS = 2e4;
var FALLBACK_PORT_TO_CHECK = 33;
var signalToNumbers = {
  SIGINT: 2,
  SIGTERM: 15,
  SIGKILL: 9
};
function isErrorOfType(e, matchingString) {
  const errorString = e instanceof Error ? e.message : String(e);
  return errorString.toLowerCase().includes(matchingString);
}
__name(isErrorOfType, "isErrorOfType");
var isNoInstanceError = /* @__PURE__ */ __name((error) => isErrorOfType(error, NO_CONTAINER_INSTANCE_ERROR), "isNoInstanceError");
var isRuntimeSignalledError = /* @__PURE__ */ __name((error) => isErrorOfType(error, RUNTIME_SIGNALLED_ERROR), "isRuntimeSignalledError");
var isNotListeningError = /* @__PURE__ */ __name((error) => isErrorOfType(error, NOT_LISTENING_ERROR), "isNotListeningError");
var isContainerExitNonZeroError = /* @__PURE__ */ __name((error) => isErrorOfType(error, UNEXPECTED_EXIT_ERROR), "isContainerExitNonZeroError");
function getExitCodeFromError(error) {
  if (!(error instanceof Error)) {
    return null;
  }
  if (isRuntimeSignalledError(error)) {
    return +error.message.toLowerCase().slice(error.message.toLowerCase().indexOf(RUNTIME_SIGNALLED_ERROR) + RUNTIME_SIGNALLED_ERROR.length + 1);
  }
  if (isContainerExitNonZeroError(error)) {
    return +error.message.toLowerCase().slice(error.message.toLowerCase().indexOf(UNEXPECTED_EXIT_ERROR) + UNEXPECTED_EXIT_ERROR.length + 1);
  }
  return null;
}
__name(getExitCodeFromError, "getExitCodeFromError");
function addTimeoutSignal(existingSignal, timeoutMs) {
  const controller = new AbortController();
  if (existingSignal?.aborted) {
    controller.abort();
    return controller.signal;
  }
  existingSignal?.addEventListener("abort", () => controller.abort());
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener("abort", () => clearTimeout(timeoutId));
  return controller.signal;
}
__name(addTimeoutSignal, "addTimeoutSignal");
var ContainerState = class {
  static {
    __name(this, "ContainerState");
  }
  storage;
  status;
  constructor(storage) {
    this.storage = storage;
  }
  async setRunning() {
    await this.setStatusAndupdate("running");
  }
  async setHealthy() {
    await this.setStatusAndupdate("healthy");
  }
  async setStopping() {
    await this.setStatusAndupdate("stopping");
  }
  async setStopped() {
    await this.setStatusAndupdate("stopped");
  }
  async setStoppedWithCode(exitCode) {
    this.status = { status: "stopped_with_code", lastChange: Date.now(), exitCode };
    await this.update();
  }
  async getState() {
    if (!this.status) {
      const state = await this.storage.get(CONTAINER_STATE_KEY);
      if (!state) {
        this.status = {
          status: "stopped",
          lastChange: Date.now()
        };
        await this.update();
      } else {
        this.status = state;
      }
    }
    return this.status;
  }
  async setStatusAndupdate(status) {
    this.status = { status, lastChange: Date.now() };
    await this.update();
  }
  async update() {
    if (!this.status)
      throw new Error("status should be init");
    await this.storage.put(CONTAINER_STATE_KEY, this.status);
  }
};
var Container = class extends DurableObject {
  static {
    __name(this, "Container");
  }
  // =========================
  //     Public Attributes
  // =========================
  // Default port for the container (undefined means no default port)
  defaultPort;
  // Required ports that should be checked for availability during container startup
  // Override this in your subclass to specify ports that must be ready
  requiredPorts;
  // Timeout after which the container will sleep if no activity
  // The signal sent to the container by default is a SIGTERM.
  // The container won't get a SIGKILL if this threshold is triggered.
  sleepAfter = DEFAULT_SLEEP_AFTER;
  // Container configuration properties
  // Set these properties directly in your container instance
  envVars = {};
  entrypoint;
  enableInternet = true;
  // =========================
  //     PUBLIC INTERFACE
  // =========================
  constructor(ctx, env, options) {
    super(ctx, env);
    if (ctx.container === void 0) {
      throw new Error("Containers have not been enabled for this Durable Object class. Have you correctly setup your Wrangler config? More info: https://developers.cloudflare.com/containers/get-started/#configuration");
    }
    this.state = new ContainerState(this.ctx.storage);
    this.ctx.blockConcurrencyWhile(async () => {
      this.renewActivityTimeout();
      await this.scheduleNextAlarm();
    });
    this.container = ctx.container;
    if (options) {
      if (options.defaultPort !== void 0)
        this.defaultPort = options.defaultPort;
      if (options.sleepAfter !== void 0)
        this.sleepAfter = options.sleepAfter;
    }
    this.sql`
      CREATE TABLE IF NOT EXISTS container_schedules (
        id TEXT PRIMARY KEY NOT NULL DEFAULT (randomblob(9)),
        callback TEXT NOT NULL,
        payload TEXT,
        type TEXT NOT NULL CHECK(type IN ('scheduled', 'delayed')),
        time INTEGER NOT NULL,
        delayInSeconds INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `;
    if (this.container.running) {
      this.monitor = this.container.monitor();
      this.setupMonitorCallbacks();
    }
  }
  /**
   * Gets the current state of the container
   * @returns Promise<State>
   */
  async getState() {
    return { ...await this.state.getState() };
  }
  // ==========================
  //     CONTAINER STARTING
  // ==========================
  /**
   * Start the container if it's not running and set up monitoring and lifecycle hooks,
   * without waiting for ports to be ready.
   *
   * It will automatically retry if the container fails to start, using the specified waitOptions
   *
   *
   * @example
   * await this.start({
   *   envVars: { DEBUG: 'true', NODE_ENV: 'development' },
   *   entrypoint: ['npm', 'run', 'dev'],
   *   enableInternet: false
   * });
   *
   * @param startOptions - Override `envVars`, `entrypoint` and `enableInternet` on a per-instance basis
   * @param waitOptions - Optional wait configuration with abort signal for cancellation. Default ~8s timeout.
   * @returns A promise that resolves when the container start command has been issued
   * @throws Error if no container context is available or if all start attempts fail
   */
  async start(startOptions, waitOptions) {
    const portToCheck = waitOptions?.portToCheck ?? this.defaultPort ?? (this.requiredPorts ? this.requiredPorts[0] : FALLBACK_PORT_TO_CHECK);
    const pollInterval = waitOptions?.waitInterval ?? INSTANCE_POLL_INTERVAL_MS;
    await this.startContainerIfNotRunning({
      signal: waitOptions?.signal,
      waitInterval: pollInterval,
      retries: waitOptions?.retries ?? Math.ceil(TIMEOUT_TO_GET_CONTAINER_MS / pollInterval),
      portToCheck
    }, startOptions);
    this.setupMonitorCallbacks();
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.onStart();
    });
  }
  async startAndWaitForPorts(portsOrArgs, cancellationOptions, startOptions) {
    let ports;
    let resolvedCancellationOptions = {};
    let resolvedStartOptions = {};
    if (typeof portsOrArgs === "object" && portsOrArgs !== null && !Array.isArray(portsOrArgs)) {
      ports = portsOrArgs.ports;
      resolvedCancellationOptions = portsOrArgs.cancellationOptions;
      resolvedStartOptions = portsOrArgs.startOptions;
    } else {
      ports = portsOrArgs;
      resolvedCancellationOptions = cancellationOptions;
      resolvedStartOptions = startOptions;
    }
    const portsToCheck = await this.getPortsToCheck(ports);
    await this.syncPendingStoppedEvents();
    resolvedCancellationOptions ??= {};
    const containerGetTimeout = resolvedCancellationOptions.instanceGetTimeoutMS ?? TIMEOUT_TO_GET_CONTAINER_MS;
    const pollInterval = resolvedCancellationOptions.waitInterval ?? INSTANCE_POLL_INTERVAL_MS;
    let containerGetRetries = Math.ceil(containerGetTimeout / pollInterval);
    const waitOptions = {
      signal: resolvedCancellationOptions.abort,
      retries: containerGetRetries,
      waitInterval: pollInterval,
      portToCheck: portsToCheck[0]
    };
    const triesUsed = await this.startContainerIfNotRunning(waitOptions, resolvedStartOptions);
    const totalPortReadyTries = Math.ceil(resolvedCancellationOptions.portReadyTimeoutMS ?? TIMEOUT_TO_GET_PORTS_MS / pollInterval);
    let triesLeft = totalPortReadyTries - triesUsed;
    for (const port of portsToCheck) {
      triesLeft = await this.waitForPort({
        signal: resolvedCancellationOptions.abort,
        waitInterval: pollInterval,
        retries: triesLeft,
        portToCheck: port
      });
    }
    this.setupMonitorCallbacks();
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.state.setHealthy();
      await this.onStart();
    });
  }
  /**
   *
   * Waits for a specified port to be ready
   *
   * Returns the number of tries used to get the port, or throws if it couldn't get the port within the specified retry limits.
   *
   * @param waitOptions -
   * - `portToCheck`: The port number to check
   * - `abort`: Optional AbortSignal to cancel waiting
   * - `retries`: Number of retries before giving up (default: TRIES_TO_GET_PORTS)
   * - `waitInterval`: Interval between retries in milliseconds (default: INSTANCE_POLL_INTERVAL_MS)
   */
  async waitForPort(waitOptions) {
    const port = waitOptions.portToCheck;
    const tcpPort = this.container.getTcpPort(port);
    const abortedSignal = new Promise((res) => {
      waitOptions.signal?.addEventListener("abort", () => {
        res(true);
      });
    });
    const pollInterval = waitOptions.waitInterval ?? INSTANCE_POLL_INTERVAL_MS;
    let tries = waitOptions.retries ?? Math.ceil(TIMEOUT_TO_GET_PORTS_MS / pollInterval);
    for (let i2 = 0; i2 < tries; i2++) {
      try {
        const combinedSignal = addTimeoutSignal(waitOptions.signal, PING_TIMEOUT_MS);
        await tcpPort.fetch("http://ping", { signal: combinedSignal });
        console.log(`Port ${port} is ready`);
        break;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.debug(`Error checking ${port}: ${errorMessage}`);
        if (!this.container.running) {
          try {
            await this.onError(new Error(`Container crashed while checking for ports, did you start the container and setup the entrypoint correctly?`));
          } catch {
          }
          throw e;
        }
        if (i2 === tries - 1) {
          try {
            await this.onError(`Failed to verify port ${port} is available after ${(i2 + 1) * pollInterval}ms, last error: ${errorMessage}`);
          } catch {
          }
          throw e;
        }
        await Promise.any([
          new Promise((resolve) => setTimeout(resolve, waitOptions.waitInterval)),
          abortedSignal
        ]);
        if (waitOptions.signal?.aborted) {
          throw new Error("Container request aborted.");
        }
      }
    }
    return tries;
  }
  // =======================
  //     LIFECYCLE HOOKS
  // =======================
  /**
   * Send a signal to the container.
   * @param signal - The signal to send to the container (default: 15 for SIGTERM)
   */
  async stop(signal = "SIGTERM") {
    if (!this.container.running) {
      return;
    }
    this.container.signal(typeof signal === "string" ? signalToNumbers[signal] : signal);
  }
  /**
   * Destroys the container with a SIGKILL. Triggers onStop.
   */
  async destroy() {
    await this.container.destroy();
  }
  /**
   * Lifecycle method called when container starts successfully
   * Override this method in subclasses to handle container start events
   */
  onStart() {
  }
  /**
   * Lifecycle method called when container shuts down
   * Override this method in subclasses to handle Container stopped events
   * @param params - Object containing exitCode and reason for the stop
   */
  onStop(_2) {
  }
  /**
   * Lifecycle method called when the container is running, and the activity timeout
   * expiration (set by `sleepAfter`) has been reached.
   *
   * If you want to shutdown the container, you should call this.stop() here
   *
   * By default, this method calls `this.stop()`
   */
  async onActivityExpired() {
    if (!this.container.running) {
      return;
    }
    await this.stop();
  }
  /**
   * Error handler for container errors
   * Override this method in subclasses to handle container errors
   * @param error - The error that occurred
   * @returns Can return any value or throw the error
   */
  onError(error) {
    console.error("Container error:", error);
    throw error;
  }
  /**
   * Renew the container's activity timeout
   *
   * Call this method whenever there is activity on the container
   */
  renewActivityTimeout() {
    const timeoutInMs = parseTimeExpression(this.sleepAfter) * 1e3;
    this.sleepAfterMs = Date.now() + timeoutInMs;
  }
  // ==================
  //     SCHEDULING
  // ==================
  /**
   * Schedule a task to be executed in the future.
   *
   * We strongly recommend using this instead of the `alarm` handler.
   *
   * @template T Type of the payload data
   * @param when When to execute the task (Date object or number of seconds delay)
   * @param callback Name of the method to call
   * @param payload Data to pass to the callback
   * @returns Schedule object representing the scheduled task
   */
  async schedule(when, callback, payload) {
    const id = generateId(9);
    if (typeof callback !== "string") {
      throw new Error("Callback must be a string (method name)");
    }
    if (typeof this[callback] !== "function") {
      throw new Error(`this.${callback} is not a function`);
    }
    if (when instanceof Date) {
      const timestamp = Math.floor(when.getTime() / 1e3);
      this.sql`
        INSERT OR REPLACE INTO container_schedules (id, callback, payload, type, time)
        VALUES (${id}, ${callback}, ${JSON.stringify(payload)}, 'scheduled', ${timestamp})
      `;
      await this.scheduleNextAlarm();
      return {
        taskId: id,
        callback,
        payload,
        time: timestamp,
        type: "scheduled"
      };
    }
    if (typeof when === "number") {
      const time = Math.floor(Date.now() / 1e3 + when);
      this.sql`
        INSERT OR REPLACE INTO container_schedules (id, callback, payload, type, delayInSeconds, time)
        VALUES (${id}, ${callback}, ${JSON.stringify(payload)}, 'delayed', ${when}, ${time})
      `;
      await this.scheduleNextAlarm();
      return {
        taskId: id,
        callback,
        payload,
        delayInSeconds: when,
        time,
        type: "delayed"
      };
    }
    throw new Error("Invalid schedule type. 'when' must be a Date or number of seconds");
  }
  // ============
  //     HTTP
  // ============
  /**
   * Send a request to the container (HTTP or WebSocket) using standard fetch API signature
   *
   * This method handles HTTP requests to the container.
   *
   * WebSocket requests done outside the DO won't work until https://github.com/cloudflare/workerd/issues/2319 is addressed.
   * Until then, please use `switchPort` + `fetch()`.
   *
   * Method supports multiple signatures to match standard fetch API:
   * - containerFetch(request: Request, port?: number)
   * - containerFetch(url: string | URL, init?: RequestInit, port?: number)
   *
   * Starts the container if not already running, and waits for the target port to be ready.
   *
   * @returns A Response from the container
   */
  async containerFetch(requestOrUrl, portOrInit, portParam) {
    let { request, port } = this.requestAndPortFromContainerFetchArgs(requestOrUrl, portOrInit, portParam);
    const state = await this.state.getState();
    if (!this.container.running || state.status !== "healthy") {
      try {
        await this.startAndWaitForPorts(port, { abort: request.signal });
      } catch (e) {
        if (isNoInstanceError(e)) {
          return new Response("There is no Container instance available at this time.\nThis is likely because you have reached your max concurrent instance count (set in wrangler config) or are you currently provisioning the Container.\nIf you are deploying your Container for the first time, check your dashboard to see provisioning status, this may take a few minutes.", { status: 503 });
        } else {
          return new Response(`Failed to start container: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
        }
      }
    }
    const tcpPort = this.container.getTcpPort(port);
    const containerUrl = request.url.replace("https:", "http:");
    try {
      this.renewActivityTimeout();
      const res = await tcpPort.fetch(containerUrl, request);
      return res;
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e;
      }
      if (e.message.includes("Network connection lost.")) {
        return new Response("Container suddenly disconnected, try again", { status: 500 });
      }
      console.error(`Error proxying request to container ${this.ctx.id}:`, e);
      return new Response(`Error proxying request to container: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
    }
  }
  /**
   *
   * Fetch handler on the Container class.
   * By default this forwards all requests to the container by calling `containerFetch`.
   * Use `switchPort` to specify which port on the container to target, or this will use `defaultPort`.
   * @param request The request to handle
   */
  async fetch(request) {
    if (this.defaultPort === void 0 && !request.headers.has("cf-container-target-port")) {
      throw new Error("No port configured for this container. Set the `defaultPort` in your Container subclass, or specify a port with `container.fetch(switchPort(request, port))`.");
    }
    let portValue = this.defaultPort;
    if (request.headers.has("cf-container-target-port")) {
      const portFromHeaders = parseInt(request.headers.get("cf-container-target-port") ?? "");
      if (isNaN(portFromHeaders)) {
        throw new Error("port value from switchPort is not a number");
      } else {
        portValue = portFromHeaders;
      }
    }
    return await this.containerFetch(request, portValue);
  }
  // ===============================
  // ===============================
  //     PRIVATE METHODS & ATTRS
  // ===============================
  // ===============================
  // ==========================
  //     PRIVATE ATTRIBUTES
  // ==========================
  container;
  // onStopCalled will be true when we are in the middle of an onStop call
  onStopCalled = false;
  state;
  monitor;
  monitorSetup = false;
  sleepAfterMs = 0;
  // ==========================
  //     GENERAL HELPERS
  // ==========================
  /**
   * Execute SQL queries against the Container's database
   */
  sql(strings, ...values) {
    let query = "";
    query = strings.reduce((acc, str, i2) => acc + str + (i2 < values.length ? "?" : ""), "");
    return [...this.ctx.storage.sql.exec(query, ...values)];
  }
  requestAndPortFromContainerFetchArgs(requestOrUrl, portOrInit, portParam) {
    let request;
    let port;
    if (requestOrUrl instanceof Request) {
      request = requestOrUrl;
      port = typeof portOrInit === "number" ? portOrInit : void 0;
    } else {
      const url = typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.toString();
      const init = typeof portOrInit === "number" ? {} : portOrInit || {};
      port = typeof portOrInit === "number" ? portOrInit : typeof portParam === "number" ? portParam : void 0;
      request = new Request(url, init);
    }
    port ??= this.defaultPort;
    if (port === void 0) {
      throw new Error("No port specified for container fetch. Set defaultPort or specify a port parameter.");
    }
    return { request, port };
  }
  /**
   *
   * The method prioritizes port sources in this order:
   * 1. Ports specified directly in the method call
   * 2. `requiredPorts` class property (if set)
   * 3. `defaultPort` (if neither of the above is specified)
   * 4. Falls back to port 33 if none of the above are set
   */
  async getPortsToCheck(overridePorts) {
    let portsToCheck = [];
    if (overridePorts !== void 0) {
      portsToCheck = Array.isArray(overridePorts) ? overridePorts : [overridePorts];
    } else if (this.requiredPorts && this.requiredPorts.length > 0) {
      portsToCheck = [...this.requiredPorts];
    } else {
      portsToCheck = [this.defaultPort ?? FALLBACK_PORT_TO_CHECK];
    }
    return portsToCheck;
  }
  // ===========================================
  //     CONTAINER INTERACTION & MONITORING
  // ===========================================
  /**
   * Tries to start a container if it's not already running
   * Returns the number of tries used
   */
  async startContainerIfNotRunning(waitOptions, options) {
    if (this.container.running) {
      if (!this.monitor) {
        this.monitor = this.container.monitor();
      }
      return 0;
    }
    const abortedSignal = new Promise((res) => {
      waitOptions.signal?.addEventListener("abort", () => {
        res(true);
      });
    });
    const pollInterval = waitOptions.waitInterval ?? INSTANCE_POLL_INTERVAL_MS;
    const totalTries = waitOptions.retries ?? Math.ceil(TIMEOUT_TO_GET_CONTAINER_MS / pollInterval);
    await this.state.setRunning();
    for (let tries = 0; tries < totalTries; tries++) {
      const envVars = options?.envVars ?? this.envVars;
      const entrypoint = options?.entrypoint ?? this.entrypoint;
      const enableInternet = options?.enableInternet ?? this.enableInternet;
      const startConfig = {
        enableInternet
      };
      if (envVars && Object.keys(envVars).length > 0)
        startConfig.env = envVars;
      if (entrypoint)
        startConfig.entrypoint = entrypoint;
      this.renewActivityTimeout();
      const handleError = /* @__PURE__ */ __name(async () => {
        const err = await this.monitor?.catch((err2) => err2);
        if (typeof err === "number") {
          const toThrow = new Error(`Container exited before we could determine the container health, exit code: ${err}`);
          try {
            await this.onError(toThrow);
          } catch {
          }
          throw toThrow;
        } else if (!isNoInstanceError(err)) {
          try {
            await this.onError(err);
          } catch {
          }
          throw err;
        }
      }, "handleError");
      if (tries > 0 && !this.container.running) {
        await handleError();
      }
      await this.scheduleNextAlarm();
      if (!this.container.running) {
        this.container.start(startConfig);
        this.monitor = this.container.monitor();
      } else {
        await this.scheduleNextAlarm();
      }
      this.renewActivityTimeout();
      const port = this.container.getTcpPort(waitOptions.portToCheck);
      try {
        const combinedSignal = addTimeoutSignal(waitOptions.signal, PING_TIMEOUT_MS);
        await port.fetch("http://containerstarthealthcheck", { signal: combinedSignal });
        return tries;
      } catch (error) {
        if (isNotListeningError(error) && this.container.running) {
          return tries;
        }
        if (!this.container.running && isNotListeningError(error)) {
          await handleError();
        }
        console.debug("Error checking if container is ready:", error instanceof Error ? error.message : String(error));
        await Promise.any([
          new Promise((res) => setTimeout(res, waitOptions.waitInterval)),
          abortedSignal
        ]);
        if (waitOptions.signal?.aborted) {
          throw new Error("Aborted waiting for container to start as we received a cancellation signal");
        }
        if (totalTries === tries + 1) {
          if (error instanceof Error && error.message.includes("Network connection lost")) {
            this.ctx.abort();
          }
          throw new Error(NO_CONTAINER_INSTANCE_ERROR);
        }
        continue;
      }
    }
    throw new Error(`Container did not start after ${totalTries * pollInterval}ms`);
  }
  setupMonitorCallbacks() {
    if (this.monitorSetup) {
      return;
    }
    this.monitorSetup = true;
    this.monitor?.then(async () => {
      await this.ctx.blockConcurrencyWhile(async () => {
        await this.state.setStoppedWithCode(0);
      });
    }).catch(async (error) => {
      if (isNoInstanceError(error)) {
        return;
      }
      const exitCode = getExitCodeFromError(error);
      if (exitCode !== null) {
        await this.state.setStoppedWithCode(exitCode);
        this.monitorSetup = false;
        this.monitor = void 0;
        return;
      }
      try {
        await this.onError(error);
      } catch {
      }
    }).finally(() => {
      this.monitorSetup = false;
      if (this.timeout) {
        if (this.resolve)
          this.resolve();
        clearTimeout(this.timeout);
      }
    });
  }
  deleteSchedules(name) {
    this.sql`DELETE FROM container_schedules WHERE callback = ${name}`;
  }
  // ============================
  //     ALARMS AND SCHEDULES
  // ============================
  /**
   * Method called when an alarm fires
   * Executes any scheduled tasks that are due
   */
  async alarm(alarmProps) {
    if (alarmProps.isRetry && alarmProps.retryCount > MAX_ALARM_RETRIES) {
      const scheduleCount = Number(this.sql`SELECT COUNT(*) as count FROM container_schedules`[0]?.count) || 0;
      const hasScheduledTasks = scheduleCount > 0;
      if (hasScheduledTasks || this.container.running) {
        await this.scheduleNextAlarm();
      }
      return;
    }
    const prevAlarm = Date.now();
    await this.ctx.storage.setAlarm(prevAlarm);
    await this.ctx.storage.sync();
    const result = this.sql`
         SELECT * FROM container_schedules;
       `;
    let minTime = Date.now() + 3 * 60 * 1e3;
    const now = Date.now() / 1e3;
    for (const row of result) {
      if (row.time > now) {
        continue;
      }
      const callback = this[row.callback];
      if (!callback || typeof callback !== "function") {
        console.error(`Callback ${row.callback} not found or is not a function`);
        continue;
      }
      const schedule = this.getSchedule(row.id);
      try {
        const payload = row.payload ? JSON.parse(row.payload) : void 0;
        await callback.call(this, payload, await schedule);
      } catch (e) {
        console.error(`Error executing scheduled callback "${row.callback}":`, e);
      }
      this.sql`DELETE FROM container_schedules WHERE id = ${row.id}`;
    }
    const resultForMinTime = this.sql`
         SELECT * FROM container_schedules;
       `;
    const minTimeFromSchedules = Math.min(...resultForMinTime.map((r2) => r2.time * 1e3));
    if (!this.container.running) {
      await this.syncPendingStoppedEvents();
      if (resultForMinTime.length == 0) {
        await this.ctx.storage.deleteAlarm();
      } else {
        await this.ctx.storage.setAlarm(minTimeFromSchedules);
      }
      return;
    }
    if (this.isActivityExpired()) {
      await this.onActivityExpired();
      this.renewActivityTimeout();
      return;
    }
    minTime = Math.min(minTimeFromSchedules, minTime, this.sleepAfterMs);
    const timeout = Math.max(0, minTime - Date.now());
    await new Promise((resolve) => {
      this.resolve = resolve;
      if (!this.container.running) {
        resolve();
        return;
      }
      this.timeout = setTimeout(() => {
        resolve();
      }, timeout);
    });
    await this.ctx.storage.setAlarm(Date.now());
  }
  timeout;
  resolve;
  // synchronises container state with the container source of truth to process events
  async syncPendingStoppedEvents() {
    const state = await this.state.getState();
    if (!this.container.running && state.status === "healthy") {
      await this.callOnStop({ exitCode: 0, reason: "exit" });
      return;
    }
    if (!this.container.running && state.status === "stopped_with_code") {
      await this.callOnStop({ exitCode: state.exitCode ?? 0, reason: "exit" });
      return;
    }
  }
  async callOnStop(onStopParams) {
    if (this.onStopCalled) {
      return;
    }
    this.onStopCalled = true;
    const promise = this.onStop(onStopParams);
    if (promise instanceof Promise) {
      await promise.finally(() => {
        this.onStopCalled = false;
      });
    } else {
      this.onStopCalled = false;
    }
    await this.state.setStopped();
  }
  /**
   * Schedule the next alarm based on upcoming tasks
   */
  async scheduleNextAlarm(ms = 1e3) {
    const nextTime = ms + Date.now();
    if (this.timeout) {
      if (this.resolve)
        this.resolve();
      clearTimeout(this.timeout);
    }
    await this.ctx.storage.setAlarm(nextTime);
    await this.ctx.storage.sync();
  }
  async listSchedules(name) {
    const result = this.sql`
      SELECT * FROM container_schedules WHERE callback = ${name} LIMIT 1
    `;
    if (!result || result.length === 0) {
      return [];
    }
    return result.map(this.toSchedule);
  }
  toSchedule(schedule) {
    let payload;
    try {
      payload = JSON.parse(schedule.payload);
    } catch (e) {
      console.error(`Error parsing payload for schedule ${schedule.id}:`, e);
      payload = void 0;
    }
    if (schedule.type === "delayed") {
      return {
        taskId: schedule.id,
        callback: schedule.callback,
        payload,
        type: "delayed",
        time: schedule.time,
        delayInSeconds: schedule.delayInSeconds
      };
    }
    return {
      taskId: schedule.id,
      callback: schedule.callback,
      payload,
      type: "scheduled",
      time: schedule.time
    };
  }
  /**
   * Get a scheduled task by ID
   * @template T Type of the payload data
   * @param id ID of the scheduled task
   * @returns The Schedule object or undefined if not found
   */
  async getSchedule(id) {
    const result = this.sql`
      SELECT * FROM container_schedules WHERE id = ${id} LIMIT 1
    `;
    if (!result || result.length === 0) {
      return void 0;
    }
    const schedule = result[0];
    return this.toSchedule(schedule);
  }
  isActivityExpired() {
    return this.sleepAfterMs <= Date.now();
  }
};

// ../node_modules/.pnpm/@cloudflare+sandbox@0.7.0/node_modules/@cloudflare/sandbox/dist/index.js
var SandboxError = class extends Error {
  static {
    __name(this, "SandboxError");
  }
  constructor(errorResponse) {
    super(errorResponse.message);
    this.errorResponse = errorResponse;
    this.name = "SandboxError";
  }
  get code() {
    return this.errorResponse.code;
  }
  get context() {
    return this.errorResponse.context;
  }
  get httpStatus() {
    return this.errorResponse.httpStatus;
  }
  get operation() {
    return this.errorResponse.operation;
  }
  get suggestion() {
    return this.errorResponse.suggestion;
  }
  get timestamp() {
    return this.errorResponse.timestamp;
  }
  get documentation() {
    return this.errorResponse.documentation;
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      httpStatus: this.httpStatus,
      operation: this.operation,
      suggestion: this.suggestion,
      timestamp: this.timestamp,
      documentation: this.documentation,
      stack: this.stack
    };
  }
};
var FileNotFoundError = class extends SandboxError {
  static {
    __name(this, "FileNotFoundError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "FileNotFoundError";
  }
  get path() {
    return this.context.path;
  }
};
var FileExistsError = class extends SandboxError {
  static {
    __name(this, "FileExistsError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "FileExistsError";
  }
  get path() {
    return this.context.path;
  }
};
var FileSystemError = class extends SandboxError {
  static {
    __name(this, "FileSystemError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "FileSystemError";
  }
  get path() {
    return this.context.path;
  }
  get stderr() {
    return this.context.stderr;
  }
  get exitCode() {
    return this.context.exitCode;
  }
};
var PermissionDeniedError = class extends SandboxError {
  static {
    __name(this, "PermissionDeniedError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "PermissionDeniedError";
  }
  get path() {
    return this.context.path;
  }
};
var CommandNotFoundError = class extends SandboxError {
  static {
    __name(this, "CommandNotFoundError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "CommandNotFoundError";
  }
  get command() {
    return this.context.command;
  }
};
var CommandError = class extends SandboxError {
  static {
    __name(this, "CommandError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "CommandError";
  }
  get command() {
    return this.context.command;
  }
  get exitCode() {
    return this.context.exitCode;
  }
  get stdout() {
    return this.context.stdout;
  }
  get stderr() {
    return this.context.stderr;
  }
};
var ProcessNotFoundError = class extends SandboxError {
  static {
    __name(this, "ProcessNotFoundError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "ProcessNotFoundError";
  }
  get processId() {
    return this.context.processId;
  }
};
var ProcessError = class extends SandboxError {
  static {
    __name(this, "ProcessError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "ProcessError";
  }
  get processId() {
    return this.context.processId;
  }
  get pid() {
    return this.context.pid;
  }
  get exitCode() {
    return this.context.exitCode;
  }
  get stderr() {
    return this.context.stderr;
  }
};
var SessionAlreadyExistsError = class extends SandboxError {
  static {
    __name(this, "SessionAlreadyExistsError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "SessionAlreadyExistsError";
  }
  get sessionId() {
    return this.context.sessionId;
  }
};
var PortAlreadyExposedError = class extends SandboxError {
  static {
    __name(this, "PortAlreadyExposedError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "PortAlreadyExposedError";
  }
  get port() {
    return this.context.port;
  }
  get portName() {
    return this.context.portName;
  }
};
var PortNotExposedError = class extends SandboxError {
  static {
    __name(this, "PortNotExposedError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "PortNotExposedError";
  }
  get port() {
    return this.context.port;
  }
};
var InvalidPortError = class extends SandboxError {
  static {
    __name(this, "InvalidPortError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "InvalidPortError";
  }
  get port() {
    return this.context.port;
  }
  get reason() {
    return this.context.reason;
  }
};
var ServiceNotRespondingError = class extends SandboxError {
  static {
    __name(this, "ServiceNotRespondingError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "ServiceNotRespondingError";
  }
  get port() {
    return this.context.port;
  }
  get portName() {
    return this.context.portName;
  }
};
var PortInUseError = class extends SandboxError {
  static {
    __name(this, "PortInUseError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "PortInUseError";
  }
  get port() {
    return this.context.port;
  }
};
var PortError = class extends SandboxError {
  static {
    __name(this, "PortError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "PortError";
  }
  get port() {
    return this.context.port;
  }
  get portName() {
    return this.context.portName;
  }
  get stderr() {
    return this.context.stderr;
  }
};
var CustomDomainRequiredError = class extends SandboxError {
  static {
    __name(this, "CustomDomainRequiredError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "CustomDomainRequiredError";
  }
};
var GitRepositoryNotFoundError = class extends SandboxError {
  static {
    __name(this, "GitRepositoryNotFoundError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "GitRepositoryNotFoundError";
  }
  get repository() {
    return this.context.repository;
  }
};
var GitAuthenticationError = class extends SandboxError {
  static {
    __name(this, "GitAuthenticationError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "GitAuthenticationError";
  }
  get repository() {
    return this.context.repository;
  }
};
var GitBranchNotFoundError = class extends SandboxError {
  static {
    __name(this, "GitBranchNotFoundError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "GitBranchNotFoundError";
  }
  get branch() {
    return this.context.branch;
  }
  get repository() {
    return this.context.repository;
  }
};
var GitNetworkError = class extends SandboxError {
  static {
    __name(this, "GitNetworkError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "GitNetworkError";
  }
  get repository() {
    return this.context.repository;
  }
  get branch() {
    return this.context.branch;
  }
  get targetDir() {
    return this.context.targetDir;
  }
};
var GitCloneError = class extends SandboxError {
  static {
    __name(this, "GitCloneError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "GitCloneError";
  }
  get repository() {
    return this.context.repository;
  }
  get targetDir() {
    return this.context.targetDir;
  }
  get stderr() {
    return this.context.stderr;
  }
  get exitCode() {
    return this.context.exitCode;
  }
};
var GitCheckoutError = class extends SandboxError {
  static {
    __name(this, "GitCheckoutError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "GitCheckoutError";
  }
  get branch() {
    return this.context.branch;
  }
  get repository() {
    return this.context.repository;
  }
  get stderr() {
    return this.context.stderr;
  }
};
var InvalidGitUrlError = class extends SandboxError {
  static {
    __name(this, "InvalidGitUrlError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "InvalidGitUrlError";
  }
  get validationErrors() {
    return this.context.validationErrors;
  }
};
var GitError = class extends SandboxError {
  static {
    __name(this, "GitError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "GitError";
  }
  get repository() {
    return this.context.repository;
  }
  get branch() {
    return this.context.branch;
  }
  get targetDir() {
    return this.context.targetDir;
  }
  get stderr() {
    return this.context.stderr;
  }
  get exitCode() {
    return this.context.exitCode;
  }
};
var InterpreterNotReadyError = class extends SandboxError {
  static {
    __name(this, "InterpreterNotReadyError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "InterpreterNotReadyError";
  }
  get retryAfter() {
    return this.context.retryAfter;
  }
  get progress() {
    return this.context.progress;
  }
};
var ContextNotFoundError = class extends SandboxError {
  static {
    __name(this, "ContextNotFoundError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "ContextNotFoundError";
  }
  get contextId() {
    return this.context.contextId;
  }
};
var CodeExecutionError = class extends SandboxError {
  static {
    __name(this, "CodeExecutionError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "CodeExecutionError";
  }
  get contextId() {
    return this.context.contextId;
  }
  get ename() {
    return this.context.ename;
  }
  get evalue() {
    return this.context.evalue;
  }
  get traceback() {
    return this.context.traceback;
  }
};
var ValidationFailedError = class extends SandboxError {
  static {
    __name(this, "ValidationFailedError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "ValidationFailedError";
  }
  get validationErrors() {
    return this.context.validationErrors;
  }
};
var ProcessReadyTimeoutError = class extends SandboxError {
  static {
    __name(this, "ProcessReadyTimeoutError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "ProcessReadyTimeoutError";
  }
  get processId() {
    return this.context.processId;
  }
  get command() {
    return this.context.command;
  }
  get condition() {
    return this.context.condition;
  }
  get timeout() {
    return this.context.timeout;
  }
};
var ProcessExitedBeforeReadyError = class extends SandboxError {
  static {
    __name(this, "ProcessExitedBeforeReadyError");
  }
  constructor(errorResponse) {
    super(errorResponse);
    this.name = "ProcessExitedBeforeReadyError";
  }
  get processId() {
    return this.context.processId;
  }
  get command() {
    return this.context.command;
  }
  get condition() {
    return this.context.condition;
  }
  get exitCode() {
    return this.context.exitCode;
  }
};
function createErrorFromResponse(errorResponse) {
  switch (errorResponse.code) {
    case ErrorCode.FILE_NOT_FOUND:
      return new FileNotFoundError(errorResponse);
    case ErrorCode.FILE_EXISTS:
      return new FileExistsError(errorResponse);
    case ErrorCode.PERMISSION_DENIED:
      return new PermissionDeniedError(errorResponse);
    case ErrorCode.IS_DIRECTORY:
    case ErrorCode.NOT_DIRECTORY:
    case ErrorCode.NO_SPACE:
    case ErrorCode.TOO_MANY_FILES:
    case ErrorCode.RESOURCE_BUSY:
    case ErrorCode.READ_ONLY:
    case ErrorCode.NAME_TOO_LONG:
    case ErrorCode.TOO_MANY_LINKS:
    case ErrorCode.FILESYSTEM_ERROR:
      return new FileSystemError(errorResponse);
    case ErrorCode.COMMAND_NOT_FOUND:
      return new CommandNotFoundError(errorResponse);
    case ErrorCode.COMMAND_PERMISSION_DENIED:
    case ErrorCode.COMMAND_EXECUTION_ERROR:
    case ErrorCode.INVALID_COMMAND:
    case ErrorCode.STREAM_START_ERROR:
      return new CommandError(errorResponse);
    case ErrorCode.PROCESS_NOT_FOUND:
      return new ProcessNotFoundError(errorResponse);
    case ErrorCode.PROCESS_PERMISSION_DENIED:
    case ErrorCode.PROCESS_ERROR:
      return new ProcessError(errorResponse);
    case ErrorCode.SESSION_ALREADY_EXISTS:
      return new SessionAlreadyExistsError(errorResponse);
    case ErrorCode.PORT_ALREADY_EXPOSED:
      return new PortAlreadyExposedError(errorResponse);
    case ErrorCode.PORT_NOT_EXPOSED:
      return new PortNotExposedError(errorResponse);
    case ErrorCode.INVALID_PORT_NUMBER:
    case ErrorCode.INVALID_PORT:
      return new InvalidPortError(errorResponse);
    case ErrorCode.SERVICE_NOT_RESPONDING:
      return new ServiceNotRespondingError(errorResponse);
    case ErrorCode.PORT_IN_USE:
      return new PortInUseError(errorResponse);
    case ErrorCode.PORT_OPERATION_ERROR:
      return new PortError(errorResponse);
    case ErrorCode.CUSTOM_DOMAIN_REQUIRED:
      return new CustomDomainRequiredError(errorResponse);
    case ErrorCode.GIT_REPOSITORY_NOT_FOUND:
      return new GitRepositoryNotFoundError(errorResponse);
    case ErrorCode.GIT_AUTH_FAILED:
      return new GitAuthenticationError(errorResponse);
    case ErrorCode.GIT_BRANCH_NOT_FOUND:
      return new GitBranchNotFoundError(errorResponse);
    case ErrorCode.GIT_NETWORK_ERROR:
      return new GitNetworkError(errorResponse);
    case ErrorCode.GIT_CLONE_FAILED:
      return new GitCloneError(errorResponse);
    case ErrorCode.GIT_CHECKOUT_FAILED:
      return new GitCheckoutError(errorResponse);
    case ErrorCode.INVALID_GIT_URL:
      return new InvalidGitUrlError(errorResponse);
    case ErrorCode.GIT_OPERATION_FAILED:
      return new GitError(errorResponse);
    case ErrorCode.INTERPRETER_NOT_READY:
      return new InterpreterNotReadyError(errorResponse);
    case ErrorCode.CONTEXT_NOT_FOUND:
      return new ContextNotFoundError(errorResponse);
    case ErrorCode.CODE_EXECUTION_ERROR:
      return new CodeExecutionError(errorResponse);
    case ErrorCode.VALIDATION_FAILED:
      return new ValidationFailedError(errorResponse);
    case ErrorCode.INVALID_JSON_RESPONSE:
    case ErrorCode.UNKNOWN_ERROR:
    case ErrorCode.INTERNAL_ERROR:
      return new SandboxError(errorResponse);
    default:
      return new SandboxError(errorResponse);
  }
}
__name(createErrorFromResponse, "createErrorFromResponse");
var TIMEOUT_MS = 12e4;
var MIN_TIME_FOR_RETRY_MS = 15e3;
var BaseTransport = class {
  static {
    __name(this, "BaseTransport");
  }
  config;
  logger;
  constructor(config) {
    this.config = config;
    this.logger = config.logger ?? createNoOpLogger();
  }
  /**
  * Fetch with automatic retry for 503 (container starting)
  *
  * This is the primary entry point for making requests. It wraps the
  * transport-specific doFetch() with retry logic for container startup.
  */
  async fetch(path, options) {
    const startTime = Date.now();
    let attempt = 0;
    while (true) {
      const response = await this.doFetch(path, options);
      if (response.status === 503) {
        const elapsed = Date.now() - startTime;
        const remaining = TIMEOUT_MS - elapsed;
        if (remaining > MIN_TIME_FOR_RETRY_MS) {
          const delay = Math.min(3e3 * 2 ** attempt, 3e4);
          this.logger.info("Container not ready, retrying", {
            status: response.status,
            attempt: attempt + 1,
            delayMs: delay,
            remainingSec: Math.floor(remaining / 1e3),
            mode: this.getMode()
          });
          await this.sleep(delay);
          attempt++;
          continue;
        }
        this.logger.error("Container failed to become ready", /* @__PURE__ */ new Error(`Failed after ${attempt + 1} attempts over ${Math.floor(elapsed / 1e3)}s`));
      }
      return response;
    }
  }
  /**
  * Sleep utility for retry delays
  */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
var HttpTransport = class extends BaseTransport {
  static {
    __name(this, "HttpTransport");
  }
  baseUrl;
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl ?? "http://localhost:3000";
  }
  getMode() {
    return "http";
  }
  async connect() {
  }
  disconnect() {
  }
  isConnected() {
    return true;
  }
  async doFetch(path, options) {
    const url = this.buildUrl(path);
    if (this.config.stub) return this.config.stub.containerFetch(url, options || {}, this.config.port);
    return globalThis.fetch(url, options);
  }
  async fetchStream(path, body, method = "POST") {
    const url = this.buildUrl(path);
    const options = this.buildStreamOptions(body, method);
    let response;
    if (this.config.stub) response = await this.config.stub.containerFetch(url, options, this.config.port);
    else response = await globalThis.fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorBody}`);
    }
    if (!response.body) throw new Error("No response body for streaming");
    return response.body;
  }
  buildUrl(path) {
    if (this.config.stub) return `http://localhost:${this.config.port}${path}`;
    return `${this.baseUrl}${path}`;
  }
  buildStreamOptions(body, method) {
    return {
      method,
      headers: body && method === "POST" ? { "Content-Type": "application/json" } : void 0,
      body: body && method === "POST" ? JSON.stringify(body) : void 0
    };
  }
};
var WebSocketTransport = class extends BaseTransport {
  static {
    __name(this, "WebSocketTransport");
  }
  ws = null;
  state = "disconnected";
  pendingRequests = /* @__PURE__ */ new Map();
  connectPromise = null;
  boundHandleMessage;
  boundHandleClose;
  constructor(config) {
    super(config);
    if (!config.wsUrl) throw new Error("wsUrl is required for WebSocket transport");
    this.boundHandleMessage = this.handleMessage.bind(this);
    this.boundHandleClose = this.handleClose.bind(this);
  }
  getMode() {
    return "websocket";
  }
  /**
  * Check if WebSocket is connected
  */
  isConnected() {
    return this.state === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }
  /**
  * Connect to the WebSocket server
  *
  * The connection promise is assigned synchronously so concurrent
  * callers share the same connection attempt.
  */
  async connect() {
    if (this.isConnected()) return;
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
    } catch (error) {
      this.connectPromise = null;
      throw error;
    }
  }
  /**
  * Disconnect from the WebSocket server
  */
  disconnect() {
    this.cleanup();
  }
  /**
  * Transport-specific fetch implementation
  * Converts WebSocket response to standard Response object.
  */
  async doFetch(path, options) {
    await this.connect();
    const method = options?.method || "GET";
    const body = this.parseBody(options?.body);
    const result = await this.request(method, path, body);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" }
    });
  }
  /**
  * Streaming fetch implementation
  */
  async fetchStream(path, body, method = "POST") {
    return this.requestStream(method, path, body);
  }
  /**
  * Parse request body from RequestInit
  */
  parseBody(body) {
    if (!body) return;
    if (typeof body === "string") try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(`Request body must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw new Error(`WebSocket transport only supports string bodies. Got: ${typeof body}`);
  }
  /**
  * Internal connection logic
  */
  async doConnect() {
    this.state = "connecting";
    if (this.config.stub) await this.connectViaFetch();
    else await this.connectViaWebSocket();
  }
  /**
  * Connect using fetch-based WebSocket (Cloudflare Workers style)
  * This is required when running inside a Durable Object.
  *
  * Uses stub.fetch() which routes WebSocket upgrade requests through the
  * parent Container class that supports the WebSocket protocol.
  */
  async connectViaFetch() {
    const timeoutMs = this.config.connectTimeoutMs ?? 3e4;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const wsPath = new URL(this.config.wsUrl).pathname;
      const httpUrl = `http://localhost:${this.config.port || 3e3}${wsPath}`;
      const request = new Request(httpUrl, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade"
        },
        signal: controller.signal
      });
      const response = await this.config.stub.fetch(request);
      clearTimeout(timeout);
      if (response.status !== 101) throw new Error(`WebSocket upgrade failed: ${response.status} ${response.statusText}`);
      const ws = response.webSocket;
      if (!ws) throw new Error("No WebSocket in upgrade response");
      ws.accept();
      this.ws = ws;
      this.state = "connected";
      this.ws.addEventListener("close", this.boundHandleClose);
      this.ws.addEventListener("message", this.boundHandleMessage);
      this.logger.debug("WebSocket connected via fetch", { url: this.config.wsUrl });
    } catch (error) {
      clearTimeout(timeout);
      this.state = "error";
      this.logger.error("WebSocket fetch connection failed", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  /**
  * Connect using standard WebSocket API (browser/Node style)
  */
  connectViaWebSocket() {
    return new Promise((resolve, reject) => {
      const timeoutMs = this.config.connectTimeoutMs ?? 3e4;
      const timeout = setTimeout(() => {
        this.cleanup();
        reject(/* @__PURE__ */ new Error(`WebSocket connection timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      try {
        this.ws = new WebSocket(this.config.wsUrl);
        const onOpen = /* @__PURE__ */ __name(() => {
          clearTimeout(timeout);
          this.ws?.removeEventListener("open", onOpen);
          this.ws?.removeEventListener("error", onConnectError);
          this.state = "connected";
          this.logger.debug("WebSocket connected", { url: this.config.wsUrl });
          resolve();
        }, "onOpen");
        const onConnectError = /* @__PURE__ */ __name(() => {
          clearTimeout(timeout);
          this.ws?.removeEventListener("open", onOpen);
          this.ws?.removeEventListener("error", onConnectError);
          this.state = "error";
          this.logger.error("WebSocket error", /* @__PURE__ */ new Error("WebSocket connection failed"));
          reject(/* @__PURE__ */ new Error("WebSocket connection failed"));
        }, "onConnectError");
        this.ws.addEventListener("open", onOpen);
        this.ws.addEventListener("error", onConnectError);
        this.ws.addEventListener("close", this.boundHandleClose);
        this.ws.addEventListener("message", this.boundHandleMessage);
      } catch (error) {
        clearTimeout(timeout);
        this.state = "error";
        reject(error);
      }
    });
  }
  /**
  * Send a request and wait for response
  */
  async request(method, path, body) {
    await this.connect();
    const id = generateRequestId();
    const request = {
      type: "request",
      id,
      method,
      path,
      body
    };
    return new Promise((resolve, reject) => {
      const timeoutMs = this.config.requestTimeoutMs ?? 12e4;
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(/* @__PURE__ */ new Error(`Request timeout after ${timeoutMs}ms: ${method} ${path}`));
      }, timeoutMs);
      this.pendingRequests.set(id, {
        resolve: /* @__PURE__ */ __name((response) => {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(id);
          resolve({
            status: response.status,
            body: response.body
          });
        }, "resolve"),
        reject: /* @__PURE__ */ __name((error) => {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(id);
          reject(error);
        }, "reject"),
        isStreaming: false,
        timeoutId
      });
      try {
        this.send(request);
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
  /**
  * Send a streaming request and return a ReadableStream
  *
  * The stream will receive data chunks as they arrive over the WebSocket.
  * Format matches SSE for compatibility with existing streaming code.
  */
  async requestStream(method, path, body) {
    await this.connect();
    const id = generateRequestId();
    const request = {
      type: "request",
      id,
      method,
      path,
      body
    };
    return new ReadableStream({
      start: /* @__PURE__ */ __name((controller) => {
        const timeoutMs = this.config.requestTimeoutMs ?? 12e4;
        const timeoutId = setTimeout(() => {
          this.pendingRequests.delete(id);
          controller.error(/* @__PURE__ */ new Error(`Stream timeout after ${timeoutMs}ms: ${method} ${path}`));
        }, timeoutMs);
        this.pendingRequests.set(id, {
          resolve: /* @__PURE__ */ __name((response) => {
            clearTimeout(timeoutId);
            this.pendingRequests.delete(id);
            if (response.status >= 400) controller.error(/* @__PURE__ */ new Error(`Stream error: ${response.status} - ${JSON.stringify(response.body)}`));
            else controller.close();
          }, "resolve"),
          reject: /* @__PURE__ */ __name((error) => {
            clearTimeout(timeoutId);
            this.pendingRequests.delete(id);
            controller.error(error);
          }, "reject"),
          streamController: controller,
          isStreaming: true,
          timeoutId
        });
        try {
          this.send(request);
        } catch (error) {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(id);
          controller.error(error instanceof Error ? error : new Error(String(error)));
        }
      }, "start"),
      cancel: /* @__PURE__ */ __name(() => {
        const pending = this.pendingRequests.get(id);
        if (pending?.timeoutId) clearTimeout(pending.timeoutId);
        this.pendingRequests.delete(id);
      }, "cancel")
    });
  }
  /**
  * Send a message over the WebSocket
  */
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("WebSocket not connected");
    this.ws.send(JSON.stringify(message));
    this.logger.debug("WebSocket sent", {
      id: message.id,
      method: message.method,
      path: message.path
    });
  }
  /**
  * Handle incoming WebSocket messages
  */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      if (isWSResponse(message)) this.handleResponse(message);
      else if (isWSStreamChunk(message)) this.handleStreamChunk(message);
      else if (isWSError(message)) this.handleError(message);
      else this.logger.warn("Unknown WebSocket message type", { message });
    } catch (error) {
      this.logger.error("Failed to parse WebSocket message", error instanceof Error ? error : new Error(String(error)));
    }
  }
  /**
  * Handle a response message
  */
  handleResponse(response) {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      this.logger.warn("Received response for unknown request", { id: response.id });
      return;
    }
    this.logger.debug("WebSocket response", {
      id: response.id,
      status: response.status,
      done: response.done
    });
    if (response.done) pending.resolve(response);
  }
  /**
  * Handle a stream chunk message
  */
  handleStreamChunk(chunk) {
    const pending = this.pendingRequests.get(chunk.id);
    if (!pending || !pending.streamController) {
      this.logger.warn("Received stream chunk for unknown request", { id: chunk.id });
      return;
    }
    const encoder = new TextEncoder();
    let sseData;
    if (chunk.event) sseData = `event: ${chunk.event}
data: ${chunk.data}

`;
    else sseData = `data: ${chunk.data}

`;
    try {
      pending.streamController.enqueue(encoder.encode(sseData));
    } catch (error) {
      this.logger.debug("Failed to enqueue stream chunk, cleaning up", {
        id: chunk.id,
        error: error instanceof Error ? error.message : String(error)
      });
      if (pending.timeoutId) clearTimeout(pending.timeoutId);
      this.pendingRequests.delete(chunk.id);
    }
  }
  /**
  * Handle an error message
  */
  handleError(error) {
    if (error.id) {
      const pending = this.pendingRequests.get(error.id);
      if (pending) {
        pending.reject(/* @__PURE__ */ new Error(`${error.code}: ${error.message}`));
        return;
      }
    }
    this.logger.error("WebSocket error message", new Error(error.message), {
      code: error.code,
      status: error.status
    });
  }
  /**
  * Handle WebSocket close
  */
  handleClose(event) {
    this.state = "disconnected";
    this.ws = null;
    const closeError = /* @__PURE__ */ new Error(`WebSocket closed: ${event.code} ${event.reason || "No reason"}`);
    for (const [, pending] of this.pendingRequests) {
      if (pending.timeoutId) clearTimeout(pending.timeoutId);
      if (pending.streamController) try {
        pending.streamController.error(closeError);
      } catch {
      }
      pending.reject(closeError);
    }
    this.pendingRequests.clear();
  }
  /**
  * Cleanup resources
  */
  cleanup() {
    if (this.ws) {
      this.ws.removeEventListener("close", this.boundHandleClose);
      this.ws.removeEventListener("message", this.boundHandleMessage);
      this.ws.close();
      this.ws = null;
    }
    this.state = "disconnected";
    this.connectPromise = null;
    for (const pending of this.pendingRequests.values()) if (pending.timeoutId) clearTimeout(pending.timeoutId);
    this.pendingRequests.clear();
  }
};
function createTransport(options) {
  switch (options.mode) {
    case "websocket":
      return new WebSocketTransport(options);
    default:
      return new HttpTransport(options);
  }
}
__name(createTransport, "createTransport");
var BaseHttpClient = class {
  static {
    __name(this, "BaseHttpClient");
  }
  options;
  logger;
  transport;
  constructor(options = {}) {
    this.options = options;
    this.logger = options.logger ?? createNoOpLogger();
    if (options.transport) this.transport = options.transport;
    else this.transport = createTransport({
      mode: options.transportMode ?? "http",
      baseUrl: options.baseUrl ?? "http://localhost:3000",
      wsUrl: options.wsUrl,
      logger: this.logger,
      stub: options.stub,
      port: options.port
    });
  }
  /**
  * Check if using WebSocket transport
  */
  isWebSocketMode() {
    return this.transport.getMode() === "websocket";
  }
  /**
  * Core fetch method - delegates to Transport which handles retry logic
  */
  async doFetch(path, options) {
    return this.transport.fetch(path, options);
  }
  /**
  * Make a POST request with JSON body
  */
  async post(endpoint, data, responseHandler) {
    const response = await this.doFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return this.handleResponse(response, responseHandler);
  }
  /**
  * Make a GET request
  */
  async get(endpoint, responseHandler) {
    const response = await this.doFetch(endpoint, { method: "GET" });
    return this.handleResponse(response, responseHandler);
  }
  /**
  * Make a DELETE request
  */
  async delete(endpoint, responseHandler) {
    const response = await this.doFetch(endpoint, { method: "DELETE" });
    return this.handleResponse(response, responseHandler);
  }
  /**
  * Handle HTTP response with error checking and parsing
  */
  async handleResponse(response, customHandler) {
    if (!response.ok) await this.handleErrorResponse(response);
    if (customHandler) return customHandler(response);
    try {
      return await response.json();
    } catch (error) {
      throw createErrorFromResponse({
        code: ErrorCode.INVALID_JSON_RESPONSE,
        message: `Invalid JSON response: ${error instanceof Error ? error.message : "Unknown parsing error"}`,
        context: {},
        httpStatus: response.status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  /**
  * Handle error responses with consistent error throwing
  */
  async handleErrorResponse(response) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        code: ErrorCode.INTERNAL_ERROR,
        message: `HTTP error! status: ${response.status}`,
        context: { statusText: response.statusText },
        httpStatus: response.status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const error = createErrorFromResponse(errorData);
    this.options.onError?.(errorData.message, void 0);
    throw error;
  }
  /**
  * Create a streaming response handler for Server-Sent Events
  */
  async handleStreamResponse(response) {
    if (!response.ok) await this.handleErrorResponse(response);
    if (!response.body) throw new Error("No response body for streaming");
    return response.body;
  }
  /**
  * Stream request handler
  *
  * For HTTP mode, uses doFetch + handleStreamResponse to get proper error typing.
  * For WebSocket mode, uses Transport's streaming support.
  *
  * @param path - The API path to call
  * @param body - Optional request body (for POST requests)
  * @param method - HTTP method (default: POST, use GET for process logs)
  */
  async doStreamFetch(path, body, method = "POST") {
    if (this.transport.getMode() === "websocket") try {
      return await this.transport.fetchStream(path, body, method);
    } catch (error) {
      this.logError(`stream ${method} ${path}`, error);
      throw error;
    }
    const response = await this.doFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body && method === "POST" ? JSON.stringify(body) : void 0
    });
    return this.handleStreamResponse(response);
  }
  /**
  * Utility method to log successful operations
  */
  logSuccess(operation, details) {
    this.logger.info(operation, details ? { details } : void 0);
  }
  /**
  * Utility method to log errors intelligently
  * Only logs unexpected errors (5xx), not expected errors (4xx)
  *
  * - 4xx errors (validation, not found, conflicts): Don't log (expected client errors)
  * - 5xx errors (server failures, internal errors): DO log (unexpected server errors)
  */
  logError(operation, error) {
    if (error && typeof error === "object" && "httpStatus" in error) {
      const httpStatus = error.httpStatus;
      if (httpStatus >= 500) this.logger.error(`Unexpected error in ${operation}`, error instanceof Error ? error : new Error(String(error)), { httpStatus });
    } else this.logger.error(`Error in ${operation}`, error instanceof Error ? error : new Error(String(error)));
  }
};
var CommandClient = class extends BaseHttpClient {
  static {
    __name(this, "CommandClient");
  }
  /**
  * Execute a command and return the complete result
  * @param command - The command to execute
  * @param sessionId - The session ID for this command execution
  * @param timeoutMs - Optional timeout in milliseconds (unlimited by default)
  * @param env - Optional environment variables for this command
  * @param cwd - Optional working directory for this command
  */
  async execute(command, sessionId, options) {
    try {
      const data = {
        command,
        sessionId,
        ...options?.timeoutMs !== void 0 && { timeoutMs: options.timeoutMs },
        ...options?.env !== void 0 && { env: options.env },
        ...options?.cwd !== void 0 && { cwd: options.cwd }
      };
      const response = await this.post("/api/execute", data);
      this.logSuccess("Command executed", `${command}, Success: ${response.success}`);
      this.options.onCommandComplete?.(response.success, response.exitCode, response.stdout, response.stderr, response.command);
      return response;
    } catch (error) {
      this.logError("execute", error);
      this.options.onError?.(error instanceof Error ? error.message : String(error), command);
      throw error;
    }
  }
  /**
  * Execute a command and return a stream of events
  * @param command - The command to execute
  * @param sessionId - The session ID for this command execution
  * @param options - Optional per-command execution settings
  */
  async executeStream(command, sessionId, options) {
    try {
      const data = {
        command,
        sessionId,
        ...options?.timeoutMs !== void 0 && { timeoutMs: options.timeoutMs },
        ...options?.env !== void 0 && { env: options.env },
        ...options?.cwd !== void 0 && { cwd: options.cwd }
      };
      const stream = await this.doStreamFetch("/api/execute/stream", data);
      this.logSuccess("Command stream started", command);
      return stream;
    } catch (error) {
      this.logError("executeStream", error);
      this.options.onError?.(error instanceof Error ? error.message : String(error), command);
      throw error;
    }
  }
};
var FileClient = class extends BaseHttpClient {
  static {
    __name(this, "FileClient");
  }
  /**
  * Create a directory
  * @param path - Directory path to create
  * @param sessionId - The session ID for this operation
  * @param options - Optional settings (recursive)
  */
  async mkdir(path, sessionId, options) {
    try {
      const data = {
        path,
        sessionId,
        recursive: options?.recursive ?? false
      };
      const response = await this.post("/api/mkdir", data);
      this.logSuccess("Directory created", `${path} (recursive: ${data.recursive})`);
      return response;
    } catch (error) {
      this.logError("mkdir", error);
      throw error;
    }
  }
  /**
  * Write content to a file
  * @param path - File path to write to
  * @param content - Content to write
  * @param sessionId - The session ID for this operation
  * @param options - Optional settings (encoding)
  */
  async writeFile(path, content, sessionId, options) {
    try {
      const data = {
        path,
        content,
        sessionId,
        encoding: options?.encoding
      };
      const response = await this.post("/api/write", data);
      this.logSuccess("File written", `${path} (${content.length} chars)`);
      return response;
    } catch (error) {
      this.logError("writeFile", error);
      throw error;
    }
  }
  /**
  * Read content from a file
  * @param path - File path to read from
  * @param sessionId - The session ID for this operation
  * @param options - Optional settings (encoding)
  */
  async readFile(path, sessionId, options) {
    try {
      const data = {
        path,
        sessionId,
        encoding: options?.encoding
      };
      const response = await this.post("/api/read", data);
      this.logSuccess("File read", `${path} (${response.content.length} chars)`);
      return response;
    } catch (error) {
      this.logError("readFile", error);
      throw error;
    }
  }
  /**
  * Stream a file using Server-Sent Events
  * Returns a ReadableStream of SSE events containing metadata, chunks, and completion
  * @param path - File path to stream
  * @param sessionId - The session ID for this operation
  */
  async readFileStream(path, sessionId) {
    try {
      const data = {
        path,
        sessionId
      };
      const stream = await this.doStreamFetch("/api/read/stream", data);
      this.logSuccess("File stream started", path);
      return stream;
    } catch (error) {
      this.logError("readFileStream", error);
      throw error;
    }
  }
  /**
  * Delete a file
  * @param path - File path to delete
  * @param sessionId - The session ID for this operation
  */
  async deleteFile(path, sessionId) {
    try {
      const data = {
        path,
        sessionId
      };
      const response = await this.post("/api/delete", data);
      this.logSuccess("File deleted", path);
      return response;
    } catch (error) {
      this.logError("deleteFile", error);
      throw error;
    }
  }
  /**
  * Rename a file
  * @param path - Current file path
  * @param newPath - New file path
  * @param sessionId - The session ID for this operation
  */
  async renameFile(path, newPath, sessionId) {
    try {
      const data = {
        oldPath: path,
        newPath,
        sessionId
      };
      const response = await this.post("/api/rename", data);
      this.logSuccess("File renamed", `${path} -> ${newPath}`);
      return response;
    } catch (error) {
      this.logError("renameFile", error);
      throw error;
    }
  }
  /**
  * Move a file
  * @param path - Current file path
  * @param newPath - Destination file path
  * @param sessionId - The session ID for this operation
  */
  async moveFile(path, newPath, sessionId) {
    try {
      const data = {
        sourcePath: path,
        destinationPath: newPath,
        sessionId
      };
      const response = await this.post("/api/move", data);
      this.logSuccess("File moved", `${path} -> ${newPath}`);
      return response;
    } catch (error) {
      this.logError("moveFile", error);
      throw error;
    }
  }
  /**
  * List files in a directory
  * @param path - Directory path to list
  * @param sessionId - The session ID for this operation
  * @param options - Optional settings (recursive, includeHidden)
  */
  async listFiles(path, sessionId, options) {
    try {
      const data = {
        path,
        sessionId,
        options: options || {}
      };
      const response = await this.post("/api/list-files", data);
      this.logSuccess("Files listed", `${path} (${response.count} files)`);
      return response;
    } catch (error) {
      this.logError("listFiles", error);
      throw error;
    }
  }
  /**
  * Check if a file or directory exists
  * @param path - Path to check
  * @param sessionId - The session ID for this operation
  */
  async exists(path, sessionId) {
    try {
      const data = {
        path,
        sessionId
      };
      const response = await this.post("/api/exists", data);
      this.logSuccess("Path existence checked", `${path} (exists: ${response.exists})`);
      return response;
    } catch (error) {
      this.logError("exists", error);
      throw error;
    }
  }
};
var GitClient = class extends BaseHttpClient {
  static {
    __name(this, "GitClient");
  }
  constructor(options = {}) {
    super(options);
    this.logger = new GitLogger(this.logger);
  }
  /**
  * Clone a Git repository
  * @param repoUrl - URL of the Git repository to clone
  * @param sessionId - The session ID for this operation
  * @param options - Optional settings (branch, targetDir, depth)
  */
  async checkout(repoUrl, sessionId, options) {
    try {
      let targetDir = options?.targetDir;
      if (!targetDir) targetDir = `/workspace/${extractRepoName(repoUrl)}`;
      const data = {
        repoUrl,
        sessionId,
        targetDir
      };
      if (options?.branch) data.branch = options.branch;
      if (options?.depth !== void 0) {
        if (!Number.isInteger(options.depth) || options.depth <= 0) throw new Error(`Invalid depth value: ${options.depth}. Must be a positive integer (e.g., 1, 5, 10).`);
        data.depth = options.depth;
      }
      const response = await this.post("/api/git/checkout", data);
      this.logSuccess("Repository cloned", `${repoUrl} (branch: ${response.branch}) -> ${response.targetDir}`);
      return response;
    } catch (error) {
      this.logError("checkout", error);
      throw error;
    }
  }
};
var InterpreterClient = class extends BaseHttpClient {
  static {
    __name(this, "InterpreterClient");
  }
  maxRetries = 3;
  retryDelayMs = 1e3;
  async createCodeContext(options = {}) {
    return this.executeWithRetry(async () => {
      const response = await this.doFetch("/api/contexts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: options.language || "python",
          cwd: options.cwd || "/workspace",
          env_vars: options.envVars
        })
      });
      if (!response.ok) throw await this.parseErrorResponse(response);
      const data = await response.json();
      if (!data.success) throw new Error(`Failed to create context: ${JSON.stringify(data)}`);
      return {
        id: data.contextId,
        language: data.language,
        cwd: data.cwd || "/workspace",
        createdAt: new Date(data.timestamp),
        lastUsed: new Date(data.timestamp)
      };
    });
  }
  async runCodeStream(contextId, code, language, callbacks, timeoutMs) {
    return this.executeWithRetry(async () => {
      const stream = await this.doStreamFetch("/api/execute/code", {
        context_id: contextId,
        code,
        language,
        ...timeoutMs !== void 0 && { timeout_ms: timeoutMs }
      });
      for await (const chunk of this.readLines(stream)) await this.parseExecutionResult(chunk, callbacks);
    });
  }
  async listCodeContexts() {
    return this.executeWithRetry(async () => {
      const response = await this.doFetch("/api/contexts", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw await this.parseErrorResponse(response);
      const data = await response.json();
      if (!data.success) throw new Error(`Failed to list contexts: ${JSON.stringify(data)}`);
      return data.contexts.map((ctx) => ({
        id: ctx.id,
        language: ctx.language,
        cwd: ctx.cwd || "/workspace",
        createdAt: new Date(data.timestamp),
        lastUsed: new Date(data.timestamp)
      }));
    });
  }
  async deleteCodeContext(contextId) {
    return this.executeWithRetry(async () => {
      const response = await this.doFetch(`/api/contexts/${contextId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw await this.parseErrorResponse(response);
    });
  }
  /**
  * Get a raw stream for code execution.
  * Used by CodeInterpreter.runCodeStreaming() for direct stream access.
  */
  async streamCode(contextId, code, language) {
    return this.doStreamFetch("/api/execute/code", {
      context_id: contextId,
      code,
      language
    });
  }
  /**
  * Execute an operation with automatic retry for transient errors
  */
  async executeWithRetry(operation) {
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) try {
      return await operation();
    } catch (error) {
      this.logError("executeWithRetry", error);
      lastError = error;
      if (this.isRetryableError(error)) {
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelayMs * 2 ** attempt + Math.random() * 1e3;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
    throw lastError || /* @__PURE__ */ new Error("Execution failed after retries");
  }
  isRetryableError(error) {
    if (error instanceof InterpreterNotReadyError) return true;
    if (error instanceof Error) return error.message.includes("not ready") || error.message.includes("initializing");
    return false;
  }
  async parseErrorResponse(response) {
    try {
      return createErrorFromResponse(await response.json());
    } catch {
      return createErrorFromResponse({
        code: ErrorCode.INTERNAL_ERROR,
        message: `HTTP ${response.status}: ${response.statusText}`,
        context: {},
        httpStatus: response.status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  async *readLines(stream) {
    const reader = stream.getReader();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += new TextDecoder().decode(value);
        if (done) break;
        let newlineIdx = buffer.indexOf("\n");
        while (newlineIdx !== -1) {
          yield buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          newlineIdx = buffer.indexOf("\n");
        }
      }
      if (buffer.length > 0) yield buffer;
    } finally {
      try {
        await reader.cancel();
      } catch {
      }
      reader.releaseLock();
    }
  }
  async parseExecutionResult(line, callbacks) {
    if (!line.trim()) return;
    if (!line.startsWith("data: ")) return;
    try {
      const jsonData = line.substring(6);
      const data = JSON.parse(jsonData);
      switch (data.type) {
        case "stdout":
          if (callbacks.onStdout && data.text) await callbacks.onStdout({
            text: data.text,
            timestamp: data.timestamp || Date.now()
          });
          break;
        case "stderr":
          if (callbacks.onStderr && data.text) await callbacks.onStderr({
            text: data.text,
            timestamp: data.timestamp || Date.now()
          });
          break;
        case "result":
          if (callbacks.onResult) {
            const result = new ResultImpl(data);
            await callbacks.onResult(result);
          }
          break;
        case "error":
          if (callbacks.onError) await callbacks.onError({
            name: data.ename || "Error",
            message: data.evalue || "Unknown error",
            traceback: data.traceback || []
          });
          break;
        case "execution_complete":
          break;
      }
    } catch (error) {
      this.logError("parseExecutionResult", error);
    }
  }
};
var PortClient = class extends BaseHttpClient {
  static {
    __name(this, "PortClient");
  }
  /**
  * Expose a port and get a preview URL
  * @param port - Port number to expose
  * @param sessionId - The session ID for this operation
  * @param name - Optional name for the port
  */
  async exposePort(port, sessionId, name) {
    try {
      const data = {
        port,
        sessionId,
        name
      };
      const response = await this.post("/api/expose-port", data);
      this.logSuccess("Port exposed", `${port} exposed at ${response.url}${name ? ` (${name})` : ""}`);
      return response;
    } catch (error) {
      this.logError("exposePort", error);
      throw error;
    }
  }
  /**
  * Unexpose a port and remove its preview URL
  * @param port - Port number to unexpose
  * @param sessionId - The session ID for this operation
  */
  async unexposePort(port, sessionId) {
    try {
      const url = `/api/exposed-ports/${port}?session=${encodeURIComponent(sessionId)}`;
      const response = await this.delete(url);
      this.logSuccess("Port unexposed", `${port}`);
      return response;
    } catch (error) {
      this.logError("unexposePort", error);
      throw error;
    }
  }
  /**
  * Get all currently exposed ports
  * @param sessionId - The session ID for this operation
  */
  async getExposedPorts(sessionId) {
    try {
      const url = `/api/exposed-ports?session=${encodeURIComponent(sessionId)}`;
      const response = await this.get(url);
      this.logSuccess("Exposed ports retrieved", `${response.ports.length} ports exposed`);
      return response;
    } catch (error) {
      this.logError("getExposedPorts", error);
      throw error;
    }
  }
  /**
  * Watch a port for readiness via SSE stream
  * @param request - Port watch configuration
  * @returns SSE stream that emits PortWatchEvent objects
  */
  async watchPort(request) {
    try {
      const stream = await this.doStreamFetch("/api/port-watch", request);
      this.logSuccess("Port watch started", `port ${request.port}`);
      return stream;
    } catch (error) {
      this.logError("watchPort", error);
      throw error;
    }
  }
};
var ProcessClient = class extends BaseHttpClient {
  static {
    __name(this, "ProcessClient");
  }
  /**
  * Start a background process
  * @param command - Command to execute as a background process
  * @param sessionId - The session ID for this operation
  * @param options - Optional settings (processId)
  */
  async startProcess(command, sessionId, options) {
    try {
      const data = {
        command,
        sessionId,
        ...options?.processId !== void 0 && { processId: options.processId },
        ...options?.timeoutMs !== void 0 && { timeoutMs: options.timeoutMs },
        ...options?.env !== void 0 && { env: options.env },
        ...options?.cwd !== void 0 && { cwd: options.cwd },
        ...options?.encoding !== void 0 && { encoding: options.encoding },
        ...options?.autoCleanup !== void 0 && { autoCleanup: options.autoCleanup }
      };
      const response = await this.post("/api/process/start", data);
      this.logSuccess("Process started", `${command} (ID: ${response.processId})`);
      return response;
    } catch (error) {
      this.logError("startProcess", error);
      throw error;
    }
  }
  /**
  * List all processes (sandbox-scoped, not session-scoped)
  */
  async listProcesses() {
    try {
      const response = await this.get(`/api/process/list`);
      this.logSuccess("Processes listed", `${response.processes.length} processes`);
      return response;
    } catch (error) {
      this.logError("listProcesses", error);
      throw error;
    }
  }
  /**
  * Get information about a specific process (sandbox-scoped, not session-scoped)
  * @param processId - ID of the process to retrieve
  */
  async getProcess(processId) {
    try {
      const url = `/api/process/${processId}`;
      const response = await this.get(url);
      this.logSuccess("Process retrieved", `ID: ${processId}`);
      return response;
    } catch (error) {
      this.logError("getProcess", error);
      throw error;
    }
  }
  /**
  * Kill a specific process (sandbox-scoped, not session-scoped)
  * @param processId - ID of the process to kill
  */
  async killProcess(processId) {
    try {
      const url = `/api/process/${processId}`;
      const response = await this.delete(url);
      this.logSuccess("Process killed", `ID: ${processId}`);
      return response;
    } catch (error) {
      this.logError("killProcess", error);
      throw error;
    }
  }
  /**
  * Kill all running processes (sandbox-scoped, not session-scoped)
  */
  async killAllProcesses() {
    try {
      const response = await this.delete(`/api/process/kill-all`);
      this.logSuccess("All processes killed", `${response.cleanedCount} processes terminated`);
      return response;
    } catch (error) {
      this.logError("killAllProcesses", error);
      throw error;
    }
  }
  /**
  * Get logs from a specific process (sandbox-scoped, not session-scoped)
  * @param processId - ID of the process to get logs from
  */
  async getProcessLogs(processId) {
    try {
      const url = `/api/process/${processId}/logs`;
      const response = await this.get(url);
      this.logSuccess("Process logs retrieved", `ID: ${processId}, stdout: ${response.stdout.length} chars, stderr: ${response.stderr.length} chars`);
      return response;
    } catch (error) {
      this.logError("getProcessLogs", error);
      throw error;
    }
  }
  /**
  * Stream logs from a specific process (sandbox-scoped, not session-scoped)
  * @param processId - ID of the process to stream logs from
  */
  async streamProcessLogs(processId) {
    try {
      const url = `/api/process/${processId}/stream`;
      const stream = await this.doStreamFetch(url, void 0, "GET");
      this.logSuccess("Process log stream started", `ID: ${processId}`);
      return stream;
    } catch (error) {
      this.logError("streamProcessLogs", error);
      throw error;
    }
  }
};
var UtilityClient = class extends BaseHttpClient {
  static {
    __name(this, "UtilityClient");
  }
  /**
  * Ping the sandbox to check if it's responsive
  */
  async ping() {
    try {
      const response = await this.get("/api/ping");
      this.logSuccess("Ping successful", response.message);
      return response.message;
    } catch (error) {
      this.logError("ping", error);
      throw error;
    }
  }
  /**
  * Get list of available commands in the sandbox environment
  */
  async getCommands() {
    try {
      const response = await this.get("/api/commands");
      this.logSuccess("Commands retrieved", `${response.count} commands available`);
      return response.availableCommands;
    } catch (error) {
      this.logError("getCommands", error);
      throw error;
    }
  }
  /**
  * Create a new execution session
  * @param options - Session configuration (id, env, cwd)
  */
  async createSession(options) {
    try {
      const response = await this.post("/api/session/create", options);
      this.logSuccess("Session created", `ID: ${options.id}`);
      return response;
    } catch (error) {
      this.logError("createSession", error);
      throw error;
    }
  }
  /**
  * Delete an execution session
  * @param sessionId - Session ID to delete
  */
  async deleteSession(sessionId) {
    try {
      const response = await this.post("/api/session/delete", { sessionId });
      this.logSuccess("Session deleted", `ID: ${sessionId}`);
      return response;
    } catch (error) {
      this.logError("deleteSession", error);
      throw error;
    }
  }
  /**
  * Get the container version
  * Returns the version embedded in the Docker image during build
  */
  async getVersion() {
    try {
      const response = await this.get("/api/version");
      this.logSuccess("Version retrieved", response.version);
      return response.version;
    } catch (error) {
      this.logger.debug("Failed to get container version (may be old container)", { error });
      return "unknown";
    }
  }
};
var SandboxClient = class {
  static {
    __name(this, "SandboxClient");
  }
  commands;
  files;
  processes;
  ports;
  git;
  interpreter;
  utils;
  transport = null;
  constructor(options) {
    if (options.transportMode === "websocket" && options.wsUrl) this.transport = createTransport({
      mode: "websocket",
      wsUrl: options.wsUrl,
      baseUrl: options.baseUrl,
      logger: options.logger,
      stub: options.stub,
      port: options.port
    });
    const clientOptions = {
      baseUrl: "http://localhost:3000",
      ...options,
      transport: this.transport ?? options.transport
    };
    this.commands = new CommandClient(clientOptions);
    this.files = new FileClient(clientOptions);
    this.processes = new ProcessClient(clientOptions);
    this.ports = new PortClient(clientOptions);
    this.git = new GitClient(clientOptions);
    this.interpreter = new InterpreterClient(clientOptions);
    this.utils = new UtilityClient(clientOptions);
  }
  /**
  * Get the current transport mode
  */
  getTransportMode() {
    return this.transport?.getMode() ?? "http";
  }
  /**
  * Check if WebSocket is connected (only relevant in WebSocket mode)
  */
  isWebSocketConnected() {
    return this.transport?.isConnected() ?? false;
  }
  /**
  * Connect WebSocket transport (no-op in HTTP mode)
  * Called automatically on first request, but can be called explicitly
  * to establish connection upfront.
  */
  async connect() {
    if (this.transport) await this.transport.connect();
  }
  /**
  * Disconnect WebSocket transport (no-op in HTTP mode)
  * Should be called when the sandbox is destroyed.
  */
  disconnect() {
    if (this.transport) this.transport.disconnect();
  }
};
var SecurityError = class extends Error {
  static {
    __name(this, "SecurityError");
  }
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "SecurityError";
  }
};
function validatePort(port) {
  if (!Number.isInteger(port)) return false;
  if (port < 1024 || port > 65535) return false;
  if ([3e3, 8787].includes(port)) return false;
  return true;
}
__name(validatePort, "validatePort");
function sanitizeSandboxId(id) {
  if (!id || id.length > 63) throw new SecurityError("Sandbox ID must be 1-63 characters long.", "INVALID_SANDBOX_ID_LENGTH");
  if (id.startsWith("-") || id.endsWith("-")) throw new SecurityError("Sandbox ID cannot start or end with hyphens (DNS requirement).", "INVALID_SANDBOX_ID_HYPHENS");
  const reservedNames = [
    "www",
    "api",
    "admin",
    "root",
    "system",
    "cloudflare",
    "workers"
  ];
  const lowerCaseId = id.toLowerCase();
  if (reservedNames.includes(lowerCaseId)) throw new SecurityError(`Reserved sandbox ID '${id}' is not allowed.`, "RESERVED_SANDBOX_ID");
  return id;
}
__name(sanitizeSandboxId, "sanitizeSandboxId");
function validateLanguage(language) {
  if (!language) return;
  const supportedLanguages = [
    "python",
    "python3",
    "javascript",
    "js",
    "node",
    "typescript",
    "ts"
  ];
  const normalized = language.toLowerCase();
  if (!supportedLanguages.includes(normalized)) throw new SecurityError(`Unsupported language '${language}'. Supported languages: python, javascript, typescript`, "INVALID_LANGUAGE");
}
__name(validateLanguage, "validateLanguage");
var CodeInterpreter = class {
  static {
    __name(this, "CodeInterpreter");
  }
  interpreterClient;
  contexts = /* @__PURE__ */ new Map();
  constructor(sandbox) {
    this.interpreterClient = sandbox.client.interpreter;
  }
  /**
  * Create a new code execution context
  */
  async createCodeContext(options = {}) {
    validateLanguage(options.language);
    const context = await this.interpreterClient.createCodeContext(options);
    this.contexts.set(context.id, context);
    return context;
  }
  /**
  * Run code with optional context
  */
  async runCode(code, options = {}) {
    let context = options.context;
    if (!context) {
      const language = options.language || "python";
      context = await this.getOrCreateDefaultContext(language);
    }
    const execution = new Execution(code, context);
    await this.interpreterClient.runCodeStream(context.id, code, options.language, {
      onStdout: /* @__PURE__ */ __name((output) => {
        execution.logs.stdout.push(output.text);
        if (options.onStdout) return options.onStdout(output);
      }, "onStdout"),
      onStderr: /* @__PURE__ */ __name((output) => {
        execution.logs.stderr.push(output.text);
        if (options.onStderr) return options.onStderr(output);
      }, "onStderr"),
      onResult: /* @__PURE__ */ __name(async (result) => {
        execution.results.push(new ResultImpl(result));
        if (options.onResult) return options.onResult(result);
      }, "onResult"),
      onError: /* @__PURE__ */ __name((error) => {
        execution.error = error;
        if (options.onError) return options.onError(error);
      }, "onError")
    });
    return execution;
  }
  /**
  * Run code and return a streaming response
  */
  async runCodeStream(code, options = {}) {
    let context = options.context;
    if (!context) {
      const language = options.language || "python";
      context = await this.getOrCreateDefaultContext(language);
    }
    return this.interpreterClient.streamCode(context.id, code, options.language);
  }
  /**
  * List all code contexts
  */
  async listCodeContexts() {
    const contexts = await this.interpreterClient.listCodeContexts();
    for (const context of contexts) this.contexts.set(context.id, context);
    return contexts;
  }
  /**
  * Delete a code context
  */
  async deleteCodeContext(contextId) {
    await this.interpreterClient.deleteCodeContext(contextId);
    this.contexts.delete(contextId);
  }
  async getOrCreateDefaultContext(language) {
    for (const context of this.contexts.values()) if (context.language === language) return context;
    return this.createCodeContext({ language });
  }
};
function isLocalhostPattern(hostname) {
  if (hostname.startsWith("[")) if (hostname.includes("]:")) return hostname.substring(0, hostname.indexOf("]:") + 1) === "[::1]";
  else return hostname === "[::1]";
  if (hostname === "::1") return true;
  const hostPart = hostname.split(":")[0];
  return hostPart === "localhost" || hostPart === "127.0.0.1" || hostPart === "0.0.0.0";
}
__name(isLocalhostPattern, "isLocalhostPattern");
async function* parseSSEStream(stream, signal) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) throw new Error("Operation was aborted");
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.startsWith("data: ")) {
          const data = line.substring(6);
          if (data === "[DONE]" || data.trim() === "") continue;
          try {
            yield JSON.parse(data);
          } catch {
          }
        }
      }
    }
    if (buffer.trim() && buffer.startsWith("data: ")) {
      const data = buffer.substring(6);
      if (data !== "[DONE]" && data.trim()) try {
        yield JSON.parse(data);
      } catch {
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
    }
    reader.releaseLock();
  }
}
__name(parseSSEStream, "parseSSEStream");
var BucketMountError = class extends Error {
  static {
    __name(this, "BucketMountError");
  }
  code;
  constructor(message, code = ErrorCode.BUCKET_MOUNT_ERROR) {
    super(message);
    this.name = "BucketMountError";
    this.code = code;
  }
};
var S3FSMountError = class extends BucketMountError {
  static {
    __name(this, "S3FSMountError");
  }
  constructor(message) {
    super(message, ErrorCode.S3FS_MOUNT_ERROR);
    this.name = "S3FSMountError";
  }
};
var MissingCredentialsError = class extends BucketMountError {
  static {
    __name(this, "MissingCredentialsError");
  }
  constructor(message) {
    super(message, ErrorCode.MISSING_CREDENTIALS);
    this.name = "MissingCredentialsError";
  }
};
var InvalidMountConfigError = class extends BucketMountError {
  static {
    __name(this, "InvalidMountConfigError");
  }
  constructor(message) {
    super(message, ErrorCode.INVALID_MOUNT_CONFIG);
    this.name = "InvalidMountConfigError";
  }
};
function detectCredentials(options, envVars) {
  if (options.credentials) return options.credentials;
  const awsAccessKeyId = envVars.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = envVars.AWS_SECRET_ACCESS_KEY;
  if (awsAccessKeyId && awsSecretAccessKey) return {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  };
  throw new MissingCredentialsError("No credentials found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables, or pass explicit credentials in options.");
}
__name(detectCredentials, "detectCredentials");
function detectProviderFromUrl(endpoint) {
  try {
    const hostname = new URL(endpoint).hostname.toLowerCase();
    if (hostname.endsWith(".r2.cloudflarestorage.com")) return "r2";
    if (hostname.endsWith(".amazonaws.com") || hostname === "s3.amazonaws.com") return "s3";
    if (hostname === "storage.googleapis.com") return "gcs";
    return null;
  } catch {
    return null;
  }
}
__name(detectProviderFromUrl, "detectProviderFromUrl");
function getProviderFlags(provider) {
  if (!provider) return ["use_path_request_style"];
  switch (provider) {
    case "r2":
      return ["nomixupload"];
    case "s3":
      return [];
    case "gcs":
      return [];
    default:
      return ["use_path_request_style"];
  }
}
__name(getProviderFlags, "getProviderFlags");
function resolveS3fsOptions(provider, userOptions) {
  const providerFlags = getProviderFlags(provider);
  if (!userOptions || userOptions.length === 0) return providerFlags;
  const allFlags = [...providerFlags, ...userOptions];
  const flagMap = /* @__PURE__ */ new Map();
  for (const flag of allFlags) {
    const [flagName] = flag.split("=");
    flagMap.set(flagName, flag);
  }
  return Array.from(flagMap.values());
}
__name(resolveS3fsOptions, "resolveS3fsOptions");
function validatePrefix(prefix) {
  if (!prefix.startsWith("/")) throw new InvalidMountConfigError(`Prefix must start with '/': "${prefix}"`);
}
__name(validatePrefix, "validatePrefix");
function validateBucketName(bucket, mountPath) {
  if (bucket.includes(":")) {
    const [bucketName, prefixPart] = bucket.split(":");
    throw new InvalidMountConfigError(`Bucket name cannot contain ':'. To mount a prefix, use the 'prefix' option:
  mountBucket('${bucketName}', '${mountPath}', { ...options, prefix: '${prefixPart}' })`);
  }
  if (!/^[a-z0-9]([a-z0-9.-]{0,61}[a-z0-9])?$/.test(bucket)) throw new InvalidMountConfigError(`Invalid bucket name: "${bucket}". Bucket names must be 3-63 characters, lowercase alphanumeric, dots, or hyphens, and cannot start/end with dots or hyphens.`);
}
__name(validateBucketName, "validateBucketName");
function buildS3fsSource(bucket, prefix) {
  return prefix ? `${bucket}:${prefix}` : bucket;
}
__name(buildS3fsSource, "buildS3fsSource");
var SDK_VERSION = "0.7.0";
var Sandbox = class extends Container {
  static {
    __name(this, "Sandbox");
  }
  defaultPort = 3e3;
  sleepAfter = "10m";
  client;
  codeInterpreter;
  sandboxName = null;
  normalizeId = false;
  baseUrl = null;
  defaultSession = null;
  envVars = {};
  logger;
  keepAliveEnabled = false;
  activeMounts = /* @__PURE__ */ new Map();
  transport = "http";
  /**
  * Default container startup timeouts (conservative for production)
  * Based on Cloudflare docs: "Containers take several minutes to provision"
  */
  DEFAULT_CONTAINER_TIMEOUTS = {
    instanceGetTimeoutMS: 3e4,
    portReadyTimeoutMS: 9e4,
    waitIntervalMS: 1e3
  };
  /**
  * Active container timeout configuration
  * Can be set via options, env vars, or defaults
  */
  containerTimeouts = { ...this.DEFAULT_CONTAINER_TIMEOUTS };
  /**
  * Create a SandboxClient with current transport settings
  */
  createSandboxClient() {
    return new SandboxClient({
      logger: this.logger,
      port: 3e3,
      stub: this,
      ...this.transport === "websocket" && {
        transportMode: "websocket",
        wsUrl: "ws://localhost:3000/ws"
      }
    });
  }
  constructor(ctx, env) {
    super(ctx, env);
    const envObj = env;
    ["SANDBOX_LOG_LEVEL", "SANDBOX_LOG_FORMAT"].forEach((key) => {
      if (envObj?.[key]) this.envVars[key] = String(envObj[key]);
    });
    this.containerTimeouts = this.getDefaultTimeouts(envObj);
    this.logger = createLogger({
      component: "sandbox-do",
      sandboxId: this.ctx.id.toString()
    });
    const transportEnv = envObj?.SANDBOX_TRANSPORT;
    if (transportEnv === "websocket") this.transport = "websocket";
    else if (transportEnv != null && transportEnv !== "http") this.logger.warn(`Invalid SANDBOX_TRANSPORT value: "${transportEnv}". Must be "http" or "websocket". Defaulting to "http".`);
    this.client = this.createSandboxClient();
    this.codeInterpreter = new CodeInterpreter(this);
    this.ctx.blockConcurrencyWhile(async () => {
      this.sandboxName = await this.ctx.storage.get("sandboxName") || null;
      this.normalizeId = await this.ctx.storage.get("normalizeId") || false;
      this.defaultSession = await this.ctx.storage.get("defaultSession") || null;
      this.keepAliveEnabled = await this.ctx.storage.get("keepAliveEnabled") || false;
      const storedTimeouts = await this.ctx.storage.get("containerTimeouts");
      if (storedTimeouts) this.containerTimeouts = {
        ...this.containerTimeouts,
        ...storedTimeouts
      };
    });
  }
  async setSandboxName(name, normalizeId) {
    if (!this.sandboxName) {
      this.sandboxName = name;
      this.normalizeId = normalizeId || false;
      await this.ctx.storage.put("sandboxName", name);
      await this.ctx.storage.put("normalizeId", this.normalizeId);
    }
  }
  async setBaseUrl(baseUrl) {
    if (!this.baseUrl) {
      this.baseUrl = baseUrl;
      await this.ctx.storage.put("baseUrl", baseUrl);
    } else if (this.baseUrl !== baseUrl) throw new Error("Base URL already set and different from one previously provided");
  }
  async setSleepAfter(sleepAfter) {
    this.sleepAfter = sleepAfter;
    this.renewActivityTimeout();
  }
  async setKeepAlive(keepAlive) {
    this.keepAliveEnabled = keepAlive;
    await this.ctx.storage.put("keepAliveEnabled", keepAlive);
  }
  async setEnvVars(envVars) {
    const { toSet, toUnset } = partitionEnvVars(envVars);
    for (const key of toUnset) delete this.envVars[key];
    this.envVars = {
      ...this.envVars,
      ...toSet
    };
    if (this.defaultSession) {
      for (const key of toUnset) {
        const unsetCommand = `unset ${key}`;
        const result = await this.client.commands.execute(unsetCommand, this.defaultSession);
        if (result.exitCode !== 0) throw new Error(`Failed to unset ${key}: ${result.stderr || "Unknown error"}`);
      }
      for (const [key, value] of Object.entries(toSet)) {
        const exportCommand = `export ${key}=${shellEscape(value)}`;
        const result = await this.client.commands.execute(exportCommand, this.defaultSession);
        if (result.exitCode !== 0) throw new Error(`Failed to set ${key}: ${result.stderr || "Unknown error"}`);
      }
    }
  }
  /**
  * RPC method to configure container startup timeouts
  */
  async setContainerTimeouts(timeouts) {
    const validated = { ...this.containerTimeouts };
    if (timeouts.instanceGetTimeoutMS !== void 0) validated.instanceGetTimeoutMS = this.validateTimeout(timeouts.instanceGetTimeoutMS, "instanceGetTimeoutMS", 5e3, 3e5);
    if (timeouts.portReadyTimeoutMS !== void 0) validated.portReadyTimeoutMS = this.validateTimeout(timeouts.portReadyTimeoutMS, "portReadyTimeoutMS", 1e4, 6e5);
    if (timeouts.waitIntervalMS !== void 0) validated.waitIntervalMS = this.validateTimeout(timeouts.waitIntervalMS, "waitIntervalMS", 100, 5e3);
    this.containerTimeouts = validated;
    await this.ctx.storage.put("containerTimeouts", this.containerTimeouts);
    this.logger.debug("Container timeouts updated", this.containerTimeouts);
  }
  /**
  * Validate a timeout value is within acceptable range
  * Throws error if invalid - used for user-provided values
  */
  validateTimeout(value, name, min, max) {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) throw new Error(`${name} must be a valid finite number, got ${value}`);
    if (value < min || value > max) throw new Error(`${name} must be between ${min}-${max}ms, got ${value}ms`);
    return value;
  }
  /**
  * Get default timeouts with env var fallbacks and validation
  * Precedence: SDK defaults < Env vars < User config
  */
  getDefaultTimeouts(env) {
    const parseAndValidate = /* @__PURE__ */ __name((envVar, name, min, max) => {
      const defaultValue = this.DEFAULT_CONTAINER_TIMEOUTS[name];
      if (envVar === void 0) return defaultValue;
      const parsed = parseInt(envVar, 10);
      if (Number.isNaN(parsed)) {
        this.logger.warn(`Invalid ${name}: "${envVar}" is not a number. Using default: ${defaultValue}ms`);
        return defaultValue;
      }
      if (parsed < min || parsed > max) {
        this.logger.warn(`Invalid ${name}: ${parsed}ms. Must be ${min}-${max}ms. Using default: ${defaultValue}ms`);
        return defaultValue;
      }
      return parsed;
    }, "parseAndValidate");
    return {
      instanceGetTimeoutMS: parseAndValidate(getEnvString(env, "SANDBOX_INSTANCE_TIMEOUT_MS"), "instanceGetTimeoutMS", 5e3, 3e5),
      portReadyTimeoutMS: parseAndValidate(getEnvString(env, "SANDBOX_PORT_TIMEOUT_MS"), "portReadyTimeoutMS", 1e4, 6e5),
      waitIntervalMS: parseAndValidate(getEnvString(env, "SANDBOX_POLL_INTERVAL_MS"), "waitIntervalMS", 100, 5e3)
    };
  }
  async mountBucket(bucket, mountPath, options) {
    this.logger.info(`Mounting bucket ${bucket} to ${mountPath}`);
    const prefix = options.prefix || void 0;
    this.validateMountOptions(bucket, mountPath, {
      ...options,
      prefix
    });
    const s3fsSource = buildS3fsSource(bucket, prefix);
    const provider = options.provider || detectProviderFromUrl(options.endpoint);
    this.logger.debug(`Detected provider: ${provider || "unknown"}`, {
      explicitProvider: options.provider,
      prefix
    });
    const credentials = detectCredentials(options, this.envVars);
    const passwordFilePath = this.generatePasswordFilePath();
    this.activeMounts.set(mountPath, {
      bucket: s3fsSource,
      mountPath,
      endpoint: options.endpoint,
      provider,
      passwordFilePath,
      mounted: false
    });
    try {
      await this.createPasswordFile(passwordFilePath, bucket, credentials);
      await this.exec(`mkdir -p ${shellEscape(mountPath)}`);
      await this.executeS3FSMount(s3fsSource, mountPath, options, provider, passwordFilePath);
      this.activeMounts.set(mountPath, {
        bucket: s3fsSource,
        mountPath,
        endpoint: options.endpoint,
        provider,
        passwordFilePath,
        mounted: true
      });
      this.logger.info(`Successfully mounted bucket ${bucket} to ${mountPath}`);
    } catch (error) {
      await this.deletePasswordFile(passwordFilePath);
      this.activeMounts.delete(mountPath);
      throw error;
    }
  }
  /**
  * Manually unmount a bucket filesystem
  *
  * @param mountPath - Absolute path where the bucket is mounted
  * @throws InvalidMountConfigError if mount path doesn't exist or isn't mounted
  */
  async unmountBucket(mountPath) {
    this.logger.info(`Unmounting bucket from ${mountPath}`);
    const mountInfo = this.activeMounts.get(mountPath);
    if (!mountInfo) throw new InvalidMountConfigError(`No active mount found at path: ${mountPath}`);
    try {
      await this.exec(`fusermount -u ${shellEscape(mountPath)}`);
      mountInfo.mounted = false;
      this.activeMounts.delete(mountPath);
    } finally {
      await this.deletePasswordFile(mountInfo.passwordFilePath);
    }
    this.logger.info(`Successfully unmounted bucket from ${mountPath}`);
  }
  /**
  * Validate mount options
  */
  validateMountOptions(bucket, mountPath, options) {
    if (!options.endpoint) throw new InvalidMountConfigError("Endpoint is required. Provide the full S3-compatible endpoint URL.");
    try {
      new URL(options.endpoint);
    } catch (error) {
      throw new InvalidMountConfigError(`Invalid endpoint URL: "${options.endpoint}". Must be a valid HTTP(S) URL.`);
    }
    validateBucketName(bucket, mountPath);
    if (!mountPath.startsWith("/")) throw new InvalidMountConfigError(`Mount path must be absolute (start with /): "${mountPath}"`);
    if (this.activeMounts.has(mountPath)) throw new InvalidMountConfigError(`Mount path "${mountPath}" is already in use by bucket "${this.activeMounts.get(mountPath)?.bucket}". Unmount the existing bucket first or use a different mount path.`);
    if (options.prefix !== void 0) validatePrefix(options.prefix);
  }
  /**
  * Generate unique password file path for s3fs credentials
  */
  generatePasswordFilePath() {
    return `/tmp/.passwd-s3fs-${crypto.randomUUID()}`;
  }
  /**
  * Create password file with s3fs credentials
  * Format: bucket:accessKeyId:secretAccessKey
  */
  async createPasswordFile(passwordFilePath, bucket, credentials) {
    const content = `${bucket}:${credentials.accessKeyId}:${credentials.secretAccessKey}`;
    await this.writeFile(passwordFilePath, content);
    await this.exec(`chmod 0600 ${shellEscape(passwordFilePath)}`);
    this.logger.debug(`Created password file: ${passwordFilePath}`);
  }
  /**
  * Delete password file
  */
  async deletePasswordFile(passwordFilePath) {
    try {
      await this.exec(`rm -f ${shellEscape(passwordFilePath)}`);
      this.logger.debug(`Deleted password file: ${passwordFilePath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete password file ${passwordFilePath}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }
  /**
  * Execute S3FS mount command
  */
  async executeS3FSMount(bucket, mountPath, options, provider, passwordFilePath) {
    const resolvedOptions = resolveS3fsOptions(provider, options.s3fsOptions);
    const s3fsArgs = [];
    s3fsArgs.push(`passwd_file=${passwordFilePath}`);
    s3fsArgs.push(...resolvedOptions);
    if (options.readOnly) s3fsArgs.push("ro");
    s3fsArgs.push(`url=${options.endpoint}`);
    const optionsStr = shellEscape(s3fsArgs.join(","));
    const mountCmd = `s3fs ${shellEscape(bucket)} ${shellEscape(mountPath)} -o ${optionsStr}`;
    this.logger.debug("Executing s3fs mount", {
      bucket,
      mountPath,
      provider,
      resolvedOptions
    });
    const result = await this.exec(mountCmd);
    if (result.exitCode !== 0) throw new S3FSMountError(`S3FS mount failed: ${result.stderr || result.stdout || "Unknown error"}`);
    this.logger.debug("Mount command executed successfully");
  }
  /**
  * Cleanup and destroy the sandbox container
  */
  async destroy() {
    this.logger.info("Destroying sandbox container");
    this.client.disconnect();
    for (const [mountPath, mountInfo] of this.activeMounts.entries()) {
      if (mountInfo.mounted) try {
        this.logger.info(`Unmounting bucket ${mountInfo.bucket} from ${mountPath}`);
        await this.exec(`fusermount -u ${shellEscape(mountPath)}`);
        mountInfo.mounted = false;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to unmount bucket ${mountInfo.bucket} from ${mountPath}: ${errorMsg}`);
      }
      await this.deletePasswordFile(mountInfo.passwordFilePath);
    }
    await super.destroy();
  }
  onStart() {
    this.logger.debug("Sandbox started");
    this.checkVersionCompatibility().catch((error) => {
      this.logger.error("Version compatibility check failed", error instanceof Error ? error : new Error(String(error)));
    });
  }
  /**
  * Check if the container version matches the SDK version
  * Logs a warning if there's a mismatch
  */
  async checkVersionCompatibility() {
    try {
      const sdkVersion = SDK_VERSION;
      const containerVersion = await this.client.utils.getVersion();
      if (containerVersion === "unknown") {
        this.logger.warn("Container version check: Container version could not be determined. This may indicate an outdated container image. Please update your container to match SDK version " + sdkVersion);
        return;
      }
      if (containerVersion !== sdkVersion) {
        const message = `Version mismatch detected! SDK version (${sdkVersion}) does not match container version (${containerVersion}). This may cause compatibility issues. Please update your container image to version ${sdkVersion}`;
        this.logger.warn(message);
      } else this.logger.debug("Version check passed", {
        sdkVersion,
        containerVersion
      });
    } catch (error) {
      this.logger.debug("Version compatibility check encountered an error", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  async onStop() {
    this.logger.debug("Sandbox stopped");
    this.defaultSession = null;
    this.activeMounts.clear();
    await Promise.all([this.ctx.storage.delete("portTokens"), this.ctx.storage.delete("defaultSession")]);
  }
  onError(error) {
    this.logger.error("Sandbox error", error instanceof Error ? error : new Error(String(error)));
  }
  /**
  * Override Container.containerFetch to use production-friendly timeouts
  * Automatically starts container with longer timeouts if not running
  */
  async containerFetch(requestOrUrl, portOrInit, portParam) {
    const { request, port } = this.parseContainerFetchArgs(requestOrUrl, portOrInit, portParam);
    if ((await this.getState()).status !== "healthy") try {
      this.logger.debug("Starting container with configured timeouts", {
        instanceTimeout: this.containerTimeouts.instanceGetTimeoutMS,
        portTimeout: this.containerTimeouts.portReadyTimeoutMS
      });
      await this.startAndWaitForPorts({
        ports: port,
        cancellationOptions: {
          instanceGetTimeoutMS: this.containerTimeouts.instanceGetTimeoutMS,
          portReadyTimeoutMS: this.containerTimeouts.portReadyTimeoutMS,
          waitInterval: this.containerTimeouts.waitIntervalMS,
          abort: request.signal
        }
      });
    } catch (e) {
      if (this.isNoInstanceError(e)) return new Response("Container is currently provisioning. This can take several minutes on first deployment. Please retry in a moment.", {
        status: 503,
        headers: { "Retry-After": "10" }
      });
      if (this.isTransientStartupError(e)) {
        this.logger.debug("Transient container startup error, returning 503", { error: e instanceof Error ? e.message : String(e) });
        return new Response("Container is starting. Please retry in a moment.", {
          status: 503,
          headers: { "Retry-After": "3" }
        });
      }
      this.logger.error("Container startup failed with permanent error", e instanceof Error ? e : new Error(String(e)));
      return new Response(`Failed to start container: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
    }
    return await super.containerFetch(requestOrUrl, portOrInit, portParam);
  }
  /**
  * Helper: Check if error is "no container instance available"
  * This indicates the container VM is still being provisioned.
  */
  isNoInstanceError(error) {
    return error instanceof Error && error.message.toLowerCase().includes("no container instance");
  }
  /**
  * Helper: Check if error is a transient startup error that should trigger retry
  *
  * These errors occur during normal container startup and are recoverable:
  * - Port not yet mapped (container starting, app not listening yet)
  * - Connection refused (port mapped but app not ready)
  * - Timeouts during startup (recoverable with retry)
  * - Network transients (temporary connectivity issues)
  *
  * Errors NOT included (permanent failures):
  * - "no such image" - missing Docker image
  * - "container already exists" - name collision
  * - Configuration errors
  */
  isTransientStartupError(error) {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return [
      "container port not found",
      "connection refused: container port",
      "the container is not listening",
      "failed to verify port",
      "container did not start",
      "network connection lost",
      "container suddenly disconnected",
      "monitor failed to find container",
      "timed out",
      "timeout",
      "the operation was aborted"
    ].some((pattern) => msg.includes(pattern));
  }
  /**
  * Helper: Parse containerFetch arguments (supports multiple signatures)
  */
  parseContainerFetchArgs(requestOrUrl, portOrInit, portParam) {
    let request;
    let port;
    if (requestOrUrl instanceof Request) {
      request = requestOrUrl;
      port = typeof portOrInit === "number" ? portOrInit : void 0;
    } else {
      const url = typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.toString();
      const init = typeof portOrInit === "number" ? {} : portOrInit || {};
      port = typeof portOrInit === "number" ? portOrInit : typeof portParam === "number" ? portParam : void 0;
      request = new Request(url, init);
    }
    port ??= this.defaultPort;
    if (port === void 0) throw new Error("No port specified for container fetch");
    return {
      request,
      port
    };
  }
  /**
  * Override onActivityExpired to prevent automatic shutdown when keepAlive is enabled
  * When keepAlive is disabled, calls parent implementation which stops the container
  */
  async onActivityExpired() {
    if (this.keepAliveEnabled) this.logger.debug("Activity expired but keepAlive is enabled - container will stay alive");
    else {
      this.logger.debug("Activity expired - stopping container");
      await super.onActivityExpired();
    }
  }
  async fetch(request) {
    const traceId = TraceContext.fromHeaders(request.headers) || TraceContext.generate();
    const requestLogger = this.logger.child({
      traceId,
      operation: "fetch"
    });
    const url = new URL(request.url);
    if (!this.sandboxName && request.headers.has("X-Sandbox-Name")) {
      const name = request.headers.get("X-Sandbox-Name");
      this.sandboxName = name;
      await this.ctx.storage.put("sandboxName", name);
    }
    const upgradeHeader = request.headers.get("Upgrade");
    const connectionHeader = request.headers.get("Connection");
    if (upgradeHeader?.toLowerCase() === "websocket" && connectionHeader?.toLowerCase().includes("upgrade")) try {
      requestLogger.debug("WebSocket upgrade requested", {
        path: url.pathname,
        port: this.determinePort(url)
      });
      return await super.fetch(request);
    } catch (error) {
      requestLogger.error("WebSocket connection failed", error instanceof Error ? error : new Error(String(error)), { path: url.pathname });
      throw error;
    }
    const port = this.determinePort(url);
    return await this.containerFetch(request, port);
  }
  wsConnect(request, port) {
    throw new Error("wsConnect must be called on the stub returned by getSandbox()");
  }
  determinePort(url) {
    const proxyMatch = url.pathname.match(/^\/proxy\/(\d+)/);
    if (proxyMatch) return parseInt(proxyMatch[1], 10);
    return 3e3;
  }
  /**
  * Ensure default session exists - lazy initialization
  * This is called automatically by all public methods that need a session
  *
  * The session ID is persisted to DO storage. On container restart, if the
  * container already has this session (from a previous instance), we sync
  * our state rather than failing on duplicate creation.
  */
  async ensureDefaultSession() {
    const sessionId = `sandbox-${this.sandboxName || "default"}`;
    if (this.defaultSession === sessionId) return this.defaultSession;
    try {
      await this.client.utils.createSession({
        id: sessionId,
        env: this.envVars || {},
        cwd: "/workspace"
      });
      this.defaultSession = sessionId;
      await this.ctx.storage.put("defaultSession", sessionId);
      this.logger.debug("Default session initialized", { sessionId });
    } catch (error) {
      if (error instanceof SessionAlreadyExistsError) {
        this.logger.debug("Session exists in container but not in DO state, syncing", { sessionId });
        this.defaultSession = sessionId;
        await this.ctx.storage.put("defaultSession", sessionId);
      } else throw error;
    }
    return this.defaultSession;
  }
  async exec(command, options) {
    const session = await this.ensureDefaultSession();
    return this.execWithSession(command, session, options);
  }
  /**
  * Internal session-aware exec implementation
  * Used by both public exec() and session wrappers
  */
  async execWithSession(command, sessionId, options) {
    const startTime = Date.now();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    try {
      if (options?.signal?.aborted) throw new Error("Operation was aborted");
      let result;
      if (options?.stream && options?.onOutput) result = await this.executeWithStreaming(command, sessionId, options, startTime, timestamp);
      else {
        const commandOptions = options && (options.timeout !== void 0 || options.env !== void 0 || options.cwd !== void 0) ? {
          timeoutMs: options.timeout,
          env: options.env,
          cwd: options.cwd
        } : void 0;
        const response = await this.client.commands.execute(command, sessionId, commandOptions);
        const duration = Date.now() - startTime;
        result = this.mapExecuteResponseToExecResult(response, duration, sessionId);
      }
      if (options?.onComplete) options.onComplete(result);
      return result;
    } catch (error) {
      if (options?.onError && error instanceof Error) options.onError(error);
      throw error;
    }
  }
  async executeWithStreaming(command, sessionId, options, startTime, timestamp) {
    let stdout = "";
    let stderr = "";
    try {
      const stream = await this.client.commands.executeStream(command, sessionId, {
        timeoutMs: options.timeout,
        env: options.env,
        cwd: options.cwd
      });
      for await (const event of parseSSEStream(stream)) {
        if (options.signal?.aborted) throw new Error("Operation was aborted");
        switch (event.type) {
          case "stdout":
          case "stderr":
            if (event.data) {
              if (event.type === "stdout") stdout += event.data;
              if (event.type === "stderr") stderr += event.data;
              if (options.onOutput) options.onOutput(event.type, event.data);
            }
            break;
          case "complete": {
            const duration = Date.now() - startTime;
            return {
              success: (event.exitCode ?? 0) === 0,
              exitCode: event.exitCode ?? 0,
              stdout,
              stderr,
              command,
              duration,
              timestamp,
              sessionId
            };
          }
          case "error":
            throw new Error(event.data || "Command execution failed");
        }
      }
      throw new Error("Stream ended without completion event");
    } catch (error) {
      if (options.signal?.aborted) throw new Error("Operation was aborted");
      throw error;
    }
  }
  mapExecuteResponseToExecResult(response, duration, sessionId) {
    return {
      success: response.success,
      exitCode: response.exitCode,
      stdout: response.stdout,
      stderr: response.stderr,
      command: response.command,
      duration,
      timestamp: response.timestamp,
      sessionId
    };
  }
  /**
  * Create a Process domain object from HTTP client DTO
  * Centralizes process object creation with bound methods
  * This eliminates duplication across startProcess, listProcesses, getProcess, and session wrappers
  */
  createProcessFromDTO(data, sessionId) {
    return {
      id: data.id,
      pid: data.pid,
      command: data.command,
      status: data.status,
      startTime: typeof data.startTime === "string" ? new Date(data.startTime) : data.startTime,
      endTime: data.endTime ? typeof data.endTime === "string" ? new Date(data.endTime) : data.endTime : void 0,
      exitCode: data.exitCode,
      sessionId,
      kill: /* @__PURE__ */ __name(async (signal) => {
        await this.killProcess(data.id, signal);
      }, "kill"),
      getStatus: /* @__PURE__ */ __name(async () => {
        return (await this.getProcess(data.id))?.status || "error";
      }, "getStatus"),
      getLogs: /* @__PURE__ */ __name(async () => {
        const logs = await this.getProcessLogs(data.id);
        return {
          stdout: logs.stdout,
          stderr: logs.stderr
        };
      }, "getLogs"),
      waitForLog: /* @__PURE__ */ __name(async (pattern, timeout) => {
        return this.waitForLogPattern(data.id, data.command, pattern, timeout);
      }, "waitForLog"),
      waitForPort: /* @__PURE__ */ __name(async (port, options) => {
        await this.waitForPortReady(data.id, data.command, port, options);
      }, "waitForPort"),
      waitForExit: /* @__PURE__ */ __name(async (timeout) => {
        return this.waitForProcessExit(data.id, data.command, timeout);
      }, "waitForExit")
    };
  }
  /**
  * Wait for a log pattern to appear in process output
  */
  async waitForLogPattern(processId, command, pattern, timeout) {
    const startTime = Date.now();
    const conditionStr = this.conditionToString(pattern);
    let collectedStdout = "";
    let collectedStderr = "";
    try {
      const existingLogs = await this.getProcessLogs(processId);
      collectedStdout = existingLogs.stdout;
      if (collectedStdout && !collectedStdout.endsWith("\n")) collectedStdout += "\n";
      collectedStderr = existingLogs.stderr;
      if (collectedStderr && !collectedStderr.endsWith("\n")) collectedStderr += "\n";
      const stdoutResult = this.matchPattern(existingLogs.stdout, pattern);
      if (stdoutResult) return stdoutResult;
      const stderrResult = this.matchPattern(existingLogs.stderr, pattern);
      if (stderrResult) return stderrResult;
    } catch (error) {
      this.logger.debug("Could not get existing logs, will stream", {
        processId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    const stream = await this.streamProcessLogs(processId);
    let timeoutId;
    let timeoutPromise;
    if (timeout !== void 0) {
      const remainingTime = timeout - (Date.now() - startTime);
      if (remainingTime <= 0) throw this.createReadyTimeoutError(processId, command, conditionStr, timeout);
      timeoutPromise = new Promise((_2, reject) => {
        timeoutId = setTimeout(() => {
          reject(this.createReadyTimeoutError(processId, command, conditionStr, timeout));
        }, remainingTime);
      });
    }
    try {
      const streamProcessor = /* @__PURE__ */ __name(async () => {
        const DEBOUNCE_MS = 50;
        let lastCheckTime = 0;
        let pendingCheck = false;
        const checkPattern = /* @__PURE__ */ __name(() => {
          const stdoutResult = this.matchPattern(collectedStdout, pattern);
          if (stdoutResult) return stdoutResult;
          const stderrResult = this.matchPattern(collectedStderr, pattern);
          if (stderrResult) return stderrResult;
          return null;
        }, "checkPattern");
        for await (const event of parseSSEStream(stream)) {
          if (event.type === "stdout" || event.type === "stderr") {
            const data = event.data || "";
            if (event.type === "stdout") collectedStdout += data;
            else collectedStderr += data;
            pendingCheck = true;
            const now = Date.now();
            if (now - lastCheckTime >= DEBOUNCE_MS) {
              lastCheckTime = now;
              pendingCheck = false;
              const result = checkPattern();
              if (result) return result;
            }
          }
          if (event.type === "exit") {
            if (pendingCheck) {
              const result = checkPattern();
              if (result) return result;
            }
            throw this.createExitedBeforeReadyError(processId, command, conditionStr, event.exitCode ?? 1);
          }
        }
        if (pendingCheck) {
          const result = checkPattern();
          if (result) return result;
        }
        throw this.createExitedBeforeReadyError(processId, command, conditionStr, 0);
      }, "streamProcessor");
      if (timeoutPromise) return await Promise.race([streamProcessor(), timeoutPromise]);
      return await streamProcessor();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  /**
  * Wait for a port to become available (for process readiness checking)
  */
  async waitForPortReady(processId, command, port, options) {
    const { mode = "http", path = "/", status = {
      min: 200,
      max: 399
    }, timeout, interval = 500 } = options ?? {};
    const conditionStr = mode === "http" ? `port ${port} (HTTP ${path})` : `port ${port} (TCP)`;
    const statusMin = typeof status === "number" ? status : status.min;
    const statusMax = typeof status === "number" ? status : status.max;
    const stream = await this.client.ports.watchPort({
      port,
      mode,
      path,
      statusMin,
      statusMax,
      processId,
      interval
    });
    let timeoutId;
    let timeoutPromise;
    if (timeout !== void 0) timeoutPromise = new Promise((_2, reject) => {
      timeoutId = setTimeout(() => {
        reject(this.createReadyTimeoutError(processId, command, conditionStr, timeout));
      }, timeout);
    });
    try {
      const streamProcessor = /* @__PURE__ */ __name(async () => {
        for await (const event of parseSSEStream(stream)) switch (event.type) {
          case "ready":
            return;
          case "process_exited":
            throw this.createExitedBeforeReadyError(processId, command, conditionStr, event.exitCode ?? 1);
          case "error":
            throw new Error(event.error || "Port watch failed");
        }
        throw new Error("Port watch stream ended unexpectedly");
      }, "streamProcessor");
      if (timeoutPromise) await Promise.race([streamProcessor(), timeoutPromise]);
      else await streamProcessor();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        await stream.cancel();
      } catch {
      }
    }
  }
  /**
  * Wait for a process to exit
  * Returns the exit code
  */
  async waitForProcessExit(processId, command, timeout) {
    const stream = await this.streamProcessLogs(processId);
    let timeoutId;
    let timeoutPromise;
    if (timeout !== void 0) timeoutPromise = new Promise((_2, reject) => {
      timeoutId = setTimeout(() => {
        reject(this.createReadyTimeoutError(processId, command, "process exit", timeout));
      }, timeout);
    });
    try {
      const streamProcessor = /* @__PURE__ */ __name(async () => {
        for await (const event of parseSSEStream(stream)) if (event.type === "exit") return { exitCode: event.exitCode ?? 1 };
        throw new Error(`Process ${processId} stream ended unexpectedly without exit event`);
      }, "streamProcessor");
      if (timeoutPromise) return await Promise.race([streamProcessor(), timeoutPromise]);
      return await streamProcessor();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  /**
  * Match a pattern against text
  */
  matchPattern(text, pattern) {
    if (typeof pattern === "string") {
      if (text.includes(pattern)) {
        const lines = text.split("\n");
        for (const line of lines) if (line.includes(pattern)) return { line };
        return { line: pattern };
      }
    } else {
      const safePattern = new RegExp(pattern.source, pattern.flags.replace("g", ""));
      const match = text.match(safePattern);
      if (match) {
        const lines = text.split("\n");
        for (const line of lines) {
          const lineMatch = line.match(safePattern);
          if (lineMatch) return {
            line,
            match: lineMatch
          };
        }
        return {
          line: match[0],
          match
        };
      }
    }
    return null;
  }
  /**
  * Convert a log pattern to a human-readable string
  */
  conditionToString(pattern) {
    if (typeof pattern === "string") return `"${pattern}"`;
    return pattern.toString();
  }
  /**
  * Create a ProcessReadyTimeoutError
  */
  createReadyTimeoutError(processId, command, condition, timeout) {
    return new ProcessReadyTimeoutError({
      code: ErrorCode.PROCESS_READY_TIMEOUT,
      message: `Process did not become ready within ${timeout}ms. Waiting for: ${condition}`,
      context: {
        processId,
        command,
        condition,
        timeout
      },
      httpStatus: 408,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      suggestion: `Check if your process outputs ${condition}. You can increase the timeout parameter.`
    });
  }
  /**
  * Create a ProcessExitedBeforeReadyError
  */
  createExitedBeforeReadyError(processId, command, condition, exitCode) {
    return new ProcessExitedBeforeReadyError({
      code: ErrorCode.PROCESS_EXITED_BEFORE_READY,
      message: `Process exited with code ${exitCode} before becoming ready. Waiting for: ${condition}`,
      context: {
        processId,
        command,
        condition,
        exitCode
      },
      httpStatus: 500,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      suggestion: "Check process logs with getLogs() for error messages"
    });
  }
  async startProcess(command, options, sessionId) {
    try {
      const session = sessionId ?? await this.ensureDefaultSession();
      const requestOptions = {
        ...options?.processId !== void 0 && { processId: options.processId },
        ...options?.timeout !== void 0 && { timeoutMs: options.timeout },
        ...options?.env !== void 0 && { env: filterEnvVars(options.env) },
        ...options?.cwd !== void 0 && { cwd: options.cwd },
        ...options?.encoding !== void 0 && { encoding: options.encoding },
        ...options?.autoCleanup !== void 0 && { autoCleanup: options.autoCleanup }
      };
      const response = await this.client.processes.startProcess(command, session, requestOptions);
      const processObj = this.createProcessFromDTO({
        id: response.processId,
        pid: response.pid,
        command: response.command,
        status: "running",
        startTime: /* @__PURE__ */ new Date(),
        endTime: void 0,
        exitCode: void 0
      }, session);
      if (options?.onStart) options.onStart(processObj);
      if (options?.onOutput || options?.onExit) this.startProcessCallbackStream(response.processId, options).catch(() => {
      });
      return processObj;
    } catch (error) {
      if (options?.onError && error instanceof Error) options.onError(error);
      throw error;
    }
  }
  /**
  * Start background streaming for process callbacks
  * Opens SSE stream to container and routes events to callbacks
  */
  async startProcessCallbackStream(processId, options) {
    try {
      const stream = await this.client.processes.streamProcessLogs(processId);
      for await (const event of parseSSEStream(stream)) switch (event.type) {
        case "stdout":
          if (event.data && options.onOutput) options.onOutput("stdout", event.data);
          break;
        case "stderr":
          if (event.data && options.onOutput) options.onOutput("stderr", event.data);
          break;
        case "exit":
        case "complete":
          if (options.onExit) options.onExit(event.exitCode ?? null);
          return;
      }
    } catch (error) {
      if (options.onError && error instanceof Error) options.onError(error);
      this.logger.error("Background process streaming failed", error instanceof Error ? error : new Error(String(error)), { processId });
    }
  }
  async listProcesses(sessionId) {
    const session = sessionId ?? await this.ensureDefaultSession();
    return (await this.client.processes.listProcesses()).processes.map((processData) => this.createProcessFromDTO({
      id: processData.id,
      pid: processData.pid,
      command: processData.command,
      status: processData.status,
      startTime: processData.startTime,
      endTime: processData.endTime,
      exitCode: processData.exitCode
    }, session));
  }
  async getProcess(id, sessionId) {
    const session = sessionId ?? await this.ensureDefaultSession();
    const response = await this.client.processes.getProcess(id);
    if (!response.process) return null;
    const processData = response.process;
    return this.createProcessFromDTO({
      id: processData.id,
      pid: processData.pid,
      command: processData.command,
      status: processData.status,
      startTime: processData.startTime,
      endTime: processData.endTime,
      exitCode: processData.exitCode
    }, session);
  }
  async killProcess(id, signal, sessionId) {
    await this.client.processes.killProcess(id);
  }
  async killAllProcesses(sessionId) {
    return (await this.client.processes.killAllProcesses()).cleanedCount;
  }
  async cleanupCompletedProcesses(sessionId) {
    return 0;
  }
  async getProcessLogs(id, sessionId) {
    const response = await this.client.processes.getProcessLogs(id);
    return {
      stdout: response.stdout,
      stderr: response.stderr,
      processId: response.processId
    };
  }
  async execStream(command, options) {
    if (options?.signal?.aborted) throw new Error("Operation was aborted");
    const session = await this.ensureDefaultSession();
    return this.client.commands.executeStream(command, session, {
      timeoutMs: options?.timeout,
      env: options?.env,
      cwd: options?.cwd
    });
  }
  /**
  * Internal session-aware execStream implementation
  */
  async execStreamWithSession(command, sessionId, options) {
    if (options?.signal?.aborted) throw new Error("Operation was aborted");
    return this.client.commands.executeStream(command, sessionId, {
      timeoutMs: options?.timeout,
      env: options?.env,
      cwd: options?.cwd
    });
  }
  /**
  * Stream logs from a background process as a ReadableStream.
  */
  async streamProcessLogs(processId, options) {
    if (options?.signal?.aborted) throw new Error("Operation was aborted");
    return this.client.processes.streamProcessLogs(processId);
  }
  async gitCheckout(repoUrl, options) {
    const session = options?.sessionId ?? await this.ensureDefaultSession();
    return this.client.git.checkout(repoUrl, session, {
      branch: options?.branch,
      targetDir: options?.targetDir,
      depth: options?.depth
    });
  }
  async mkdir(path, options = {}) {
    const session = options.sessionId ?? await this.ensureDefaultSession();
    return this.client.files.mkdir(path, session, { recursive: options.recursive });
  }
  async writeFile(path, content, options = {}) {
    const session = options.sessionId ?? await this.ensureDefaultSession();
    return this.client.files.writeFile(path, content, session, { encoding: options.encoding });
  }
  async deleteFile(path, sessionId) {
    const session = sessionId ?? await this.ensureDefaultSession();
    return this.client.files.deleteFile(path, session);
  }
  async renameFile(oldPath, newPath, sessionId) {
    const session = sessionId ?? await this.ensureDefaultSession();
    return this.client.files.renameFile(oldPath, newPath, session);
  }
  async moveFile(sourcePath, destinationPath, sessionId) {
    const session = sessionId ?? await this.ensureDefaultSession();
    return this.client.files.moveFile(sourcePath, destinationPath, session);
  }
  async readFile(path, options = {}) {
    const session = options.sessionId ?? await this.ensureDefaultSession();
    return this.client.files.readFile(path, session, { encoding: options.encoding });
  }
  /**
  * Stream a file from the sandbox using Server-Sent Events
  * Returns a ReadableStream that can be consumed with streamFile() or collectFile() utilities
  * @param path - Path to the file to stream
  * @param options - Optional session ID
  */
  async readFileStream(path, options = {}) {
    const session = options.sessionId ?? await this.ensureDefaultSession();
    return this.client.files.readFileStream(path, session);
  }
  async listFiles(path, options) {
    const session = await this.ensureDefaultSession();
    return this.client.files.listFiles(path, session, options);
  }
  async exists(path, sessionId) {
    const session = sessionId ?? await this.ensureDefaultSession();
    return this.client.files.exists(path, session);
  }
  /**
  * Expose a port and get a preview URL for accessing services running in the sandbox
  *
  * @param port - Port number to expose (1024-65535)
  * @param options - Configuration options
  * @param options.hostname - Your Worker's domain name (required for preview URL construction)
  * @param options.name - Optional friendly name for the port
  * @param options.token - Optional custom token for the preview URL (1-16 characters: lowercase letters, numbers, hyphens, underscores)
  *                       If not provided, a random 16-character token will be generated automatically
  * @returns Preview URL information including the full URL, port number, and optional name
  *
  * @example
  * // With auto-generated token
  * const { url } = await sandbox.exposePort(8080, { hostname: 'example.com' });
  * // url: https://8080-sandbox-id-abc123random4567.example.com
  *
  * @example
  * // With custom token for stable URLs across deployments
  * const { url } = await sandbox.exposePort(8080, {
  *   hostname: 'example.com',
  *   token: 'my-token-v1'
  * });
  * // url: https://8080-sandbox-id-my-token-v1.example.com
  */
  async exposePort(port, options) {
    if (options.hostname.endsWith(".workers.dev")) throw new CustomDomainRequiredError({
      code: ErrorCode.CUSTOM_DOMAIN_REQUIRED,
      message: `Port exposure requires a custom domain. .workers.dev domains do not support wildcard subdomains required for port proxying.`,
      context: { originalError: options.hostname },
      httpStatus: 400,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (!this.sandboxName) throw new Error("Sandbox name not available. Ensure sandbox is accessed through getSandbox()");
    let token;
    if (options.token !== void 0) {
      this.validateCustomToken(options.token);
      token = options.token;
    } else token = this.generatePortToken();
    const tokens = await this.ctx.storage.get("portTokens") || {};
    const existingPort = Object.entries(tokens).find(([p2, t2]) => t2 === token && p2 !== port.toString());
    if (existingPort) throw new SecurityError(`Token '${token}' is already in use by port ${existingPort[0]}. Please use a different token.`);
    const sessionId = await this.ensureDefaultSession();
    await this.client.ports.exposePort(port, sessionId, options?.name);
    tokens[port.toString()] = token;
    await this.ctx.storage.put("portTokens", tokens);
    return {
      url: this.constructPreviewUrl(port, this.sandboxName, options.hostname, token),
      port,
      name: options?.name
    };
  }
  async unexposePort(port) {
    if (!validatePort(port)) throw new SecurityError(`Invalid port number: ${port}. Must be between 1024-65535 and not reserved.`);
    const sessionId = await this.ensureDefaultSession();
    await this.client.ports.unexposePort(port, sessionId);
    const tokens = await this.ctx.storage.get("portTokens") || {};
    if (tokens[port.toString()]) {
      delete tokens[port.toString()];
      await this.ctx.storage.put("portTokens", tokens);
    }
  }
  async getExposedPorts(hostname) {
    const sessionId = await this.ensureDefaultSession();
    const response = await this.client.ports.getExposedPorts(sessionId);
    if (!this.sandboxName) throw new Error("Sandbox name not available. Ensure sandbox is accessed through getSandbox()");
    const tokens = await this.ctx.storage.get("portTokens") || {};
    return response.ports.map((port) => {
      const token = tokens[port.port.toString()];
      if (!token) throw new Error(`Port ${port.port} is exposed but has no token. This should not happen.`);
      return {
        url: this.constructPreviewUrl(port.port, this.sandboxName, hostname, token),
        port: port.port,
        status: port.status
      };
    });
  }
  async isPortExposed(port) {
    try {
      const sessionId = await this.ensureDefaultSession();
      return (await this.client.ports.getExposedPorts(sessionId)).ports.some((exposedPort) => exposedPort.port === port);
    } catch (error) {
      this.logger.error("Error checking if port is exposed", error instanceof Error ? error : new Error(String(error)), { port });
      return false;
    }
  }
  async validatePortToken(port, token) {
    if (!await this.isPortExposed(port)) return false;
    const storedToken = (await this.ctx.storage.get("portTokens") || {})[port.toString()];
    if (!storedToken) {
      this.logger.error("Port is exposed but has no token - bug detected", void 0, { port });
      return false;
    }
    if (storedToken.length !== token.length) return false;
    const encoder = new TextEncoder();
    const a2 = encoder.encode(storedToken);
    const b2 = encoder.encode(token);
    return crypto.subtle.timingSafeEqual(a2, b2);
  }
  validateCustomToken(token) {
    if (token.length === 0) throw new SecurityError(`Custom token cannot be empty.`);
    if (token.length > 16) throw new SecurityError(`Custom token too long. Maximum 16 characters allowed. Received: ${token.length} characters.`);
    if (!/^[a-z0-9_]+$/.test(token)) throw new SecurityError(`Custom token must contain only lowercase letters (a-z), numbers (0-9), and underscores (_). Invalid token provided.`);
  }
  generatePortToken() {
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/\+/g, "_").replace(/\//g, "_").replace(/=/g, "").toLowerCase();
  }
  constructPreviewUrl(port, sandboxId, hostname, token) {
    if (!validatePort(port)) throw new SecurityError(`Invalid port number: ${port}. Must be between 1024-65535 and not reserved.`);
    const effectiveId = this.sandboxName || sandboxId;
    const hasUppercase = /[A-Z]/.test(effectiveId);
    if (!this.normalizeId && hasUppercase) throw new SecurityError(`Preview URLs require lowercase sandbox IDs. Your ID "${effectiveId}" contains uppercase letters.

To fix this:
1. Create a new sandbox with: getSandbox(ns, "${effectiveId}", { normalizeId: true })
2. This will create a sandbox with ID: "${effectiveId.toLowerCase()}"

Note: Due to DNS case-insensitivity, IDs with uppercase letters cannot be used with preview URLs.`);
    const sanitizedSandboxId = sanitizeSandboxId(sandboxId).toLowerCase();
    if (isLocalhostPattern(hostname)) {
      const [host, portStr] = hostname.split(":");
      const mainPort = portStr || "80";
      try {
        const baseUrl = new URL(`http://${host}:${mainPort}`);
        baseUrl.hostname = `${port}-${sanitizedSandboxId}-${token}.${host}`;
        return baseUrl.toString();
      } catch (error) {
        throw new SecurityError(`Failed to construct preview URL: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    try {
      const baseUrl = new URL(`https://${hostname}`);
      baseUrl.hostname = `${port}-${sanitizedSandboxId}-${token}.${hostname}`;
      return baseUrl.toString();
    } catch (error) {
      throw new SecurityError(`Failed to construct preview URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
  * Create isolated execution session for advanced use cases
  * Returns ExecutionSession with full sandbox API bound to specific session
  */
  async createSession(options) {
    const sessionId = options?.id || `session-${Date.now()}`;
    const filteredEnv = filterEnvVars({
      ...this.envVars,
      ...options?.env ?? {}
    });
    const envPayload = Object.keys(filteredEnv).length > 0 ? filteredEnv : void 0;
    await this.client.utils.createSession({
      id: sessionId,
      ...envPayload && { env: envPayload },
      ...options?.cwd && { cwd: options.cwd }
    });
    return this.getSessionWrapper(sessionId);
  }
  /**
  * Get an existing session by ID
  * Returns ExecutionSession wrapper bound to the specified session
  *
  * This is useful for retrieving sessions across different requests/contexts
  * without storing the ExecutionSession object (which has RPC lifecycle limitations)
  *
  * @param sessionId - The ID of an existing session
  * @returns ExecutionSession wrapper bound to the session
  */
  async getSession(sessionId) {
    return this.getSessionWrapper(sessionId);
  }
  /**
  * Delete an execution session
  * Cleans up session resources and removes it from the container
  * Note: Cannot delete the default session. To reset the default session,
  * use sandbox.destroy() to terminate the entire sandbox.
  *
  * @param sessionId - The ID of the session to delete
  * @returns Result with success status, sessionId, and timestamp
  * @throws Error if attempting to delete the default session
  */
  async deleteSession(sessionId) {
    if (this.defaultSession && sessionId === this.defaultSession) throw new Error(`Cannot delete default session '${sessionId}'. Use sandbox.destroy() to terminate the sandbox.`);
    const response = await this.client.utils.deleteSession(sessionId);
    return {
      success: response.success,
      sessionId: response.sessionId,
      timestamp: response.timestamp
    };
  }
  /**
  * Internal helper to create ExecutionSession wrapper for a given sessionId
  * Used by both createSession and getSession
  */
  getSessionWrapper(sessionId) {
    return {
      id: sessionId,
      exec: /* @__PURE__ */ __name((command, options) => this.execWithSession(command, sessionId, options), "exec"),
      execStream: /* @__PURE__ */ __name((command, options) => this.execStreamWithSession(command, sessionId, options), "execStream"),
      startProcess: /* @__PURE__ */ __name((command, options) => this.startProcess(command, options, sessionId), "startProcess"),
      listProcesses: /* @__PURE__ */ __name(() => this.listProcesses(sessionId), "listProcesses"),
      getProcess: /* @__PURE__ */ __name((id) => this.getProcess(id, sessionId), "getProcess"),
      killProcess: /* @__PURE__ */ __name((id, signal) => this.killProcess(id, signal), "killProcess"),
      killAllProcesses: /* @__PURE__ */ __name(() => this.killAllProcesses(), "killAllProcesses"),
      cleanupCompletedProcesses: /* @__PURE__ */ __name(() => this.cleanupCompletedProcesses(), "cleanupCompletedProcesses"),
      getProcessLogs: /* @__PURE__ */ __name((id) => this.getProcessLogs(id), "getProcessLogs"),
      streamProcessLogs: /* @__PURE__ */ __name((processId, options) => this.streamProcessLogs(processId, options), "streamProcessLogs"),
      writeFile: /* @__PURE__ */ __name((path, content, options) => this.writeFile(path, content, {
        ...options,
        sessionId
      }), "writeFile"),
      readFile: /* @__PURE__ */ __name((path, options) => this.readFile(path, {
        ...options,
        sessionId
      }), "readFile"),
      readFileStream: /* @__PURE__ */ __name((path) => this.readFileStream(path, { sessionId }), "readFileStream"),
      mkdir: /* @__PURE__ */ __name((path, options) => this.mkdir(path, {
        ...options,
        sessionId
      }), "mkdir"),
      deleteFile: /* @__PURE__ */ __name((path) => this.deleteFile(path, sessionId), "deleteFile"),
      renameFile: /* @__PURE__ */ __name((oldPath, newPath) => this.renameFile(oldPath, newPath, sessionId), "renameFile"),
      moveFile: /* @__PURE__ */ __name((sourcePath, destPath) => this.moveFile(sourcePath, destPath, sessionId), "moveFile"),
      listFiles: /* @__PURE__ */ __name((path, options) => this.client.files.listFiles(path, sessionId, options), "listFiles"),
      exists: /* @__PURE__ */ __name((path) => this.exists(path, sessionId), "exists"),
      gitCheckout: /* @__PURE__ */ __name((repoUrl, options) => this.gitCheckout(repoUrl, {
        ...options,
        sessionId
      }), "gitCheckout"),
      setEnvVars: /* @__PURE__ */ __name(async (envVars) => {
        const { toSet, toUnset } = partitionEnvVars(envVars);
        try {
          for (const key of toUnset) {
            const unsetCommand = `unset ${key}`;
            const result = await this.client.commands.execute(unsetCommand, sessionId);
            if (result.exitCode !== 0) throw new Error(`Failed to unset ${key}: ${result.stderr || "Unknown error"}`);
          }
          for (const [key, value] of Object.entries(toSet)) {
            const exportCommand = `export ${key}=${shellEscape(value)}`;
            const result = await this.client.commands.execute(exportCommand, sessionId);
            if (result.exitCode !== 0) throw new Error(`Failed to set ${key}: ${result.stderr || "Unknown error"}`);
          }
        } catch (error) {
          this.logger.error("Failed to set environment variables", error instanceof Error ? error : new Error(String(error)), { sessionId });
          throw error;
        }
      }, "setEnvVars"),
      createCodeContext: /* @__PURE__ */ __name((options) => this.codeInterpreter.createCodeContext(options), "createCodeContext"),
      runCode: /* @__PURE__ */ __name(async (code, options) => {
        return (await this.codeInterpreter.runCode(code, options)).toJSON();
      }, "runCode"),
      runCodeStream: /* @__PURE__ */ __name((code, options) => this.codeInterpreter.runCodeStream(code, options), "runCodeStream"),
      listCodeContexts: /* @__PURE__ */ __name(() => this.codeInterpreter.listCodeContexts(), "listCodeContexts"),
      deleteCodeContext: /* @__PURE__ */ __name((contextId) => this.codeInterpreter.deleteCodeContext(contextId), "deleteCodeContext"),
      mountBucket: /* @__PURE__ */ __name((bucket, mountPath, options) => this.mountBucket(bucket, mountPath, options), "mountBucket"),
      unmountBucket: /* @__PURE__ */ __name((mountPath) => this.unmountBucket(mountPath), "unmountBucket")
    };
  }
  async createCodeContext(options) {
    return this.codeInterpreter.createCodeContext(options);
  }
  async runCode(code, options) {
    return (await this.codeInterpreter.runCode(code, options)).toJSON();
  }
  async runCodeStream(code, options) {
    return this.codeInterpreter.runCodeStream(code, options);
  }
  async listCodeContexts() {
    return this.codeInterpreter.listCodeContexts();
  }
  async deleteCodeContext(contextId) {
    return this.codeInterpreter.deleteCodeContext(contextId);
  }
};

// ../node_modules/.pnpm/std-env@3.10.0/node_modules/std-env/dist/index.mjs
var r = /* @__PURE__ */ Object.create(null);
var i = /* @__PURE__ */ __name((e) => globalThis.process?.env || import.meta.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (e ? r : globalThis), "i");
var o = new Proxy(r, { get(e, s) {
  return i()[s] ?? r[s];
}, has(e, s) {
  const E = i();
  return s in E || s in r;
}, set(e, s, E) {
  const B = i(true);
  return B[s] = E, true;
}, deleteProperty(e, s) {
  if (!s) return false;
  const E = i(true);
  return delete E[s], true;
}, ownKeys() {
  const e = i(true);
  return Object.keys(e);
} });
var t = typeof process < "u" && process.env && "production" || "";
var f = [["APPVEYOR"], ["AWS_AMPLIFY", "AWS_APP_ID", { ci: true }], ["AZURE_PIPELINES", "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"], ["AZURE_STATIC", "INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN"], ["APPCIRCLE", "AC_APPCIRCLE"], ["BAMBOO", "bamboo_planKey"], ["BITBUCKET", "BITBUCKET_COMMIT"], ["BITRISE", "BITRISE_IO"], ["BUDDY", "BUDDY_WORKSPACE_ID"], ["BUILDKITE"], ["CIRCLE", "CIRCLECI"], ["CIRRUS", "CIRRUS_CI"], ["CLOUDFLARE_PAGES", "CF_PAGES", { ci: true }], ["CLOUDFLARE_WORKERS", "WORKERS_CI", { ci: true }], ["CODEBUILD", "CODEBUILD_BUILD_ARN"], ["CODEFRESH", "CF_BUILD_ID"], ["DRONE"], ["DRONE", "DRONE_BUILD_EVENT"], ["DSARI"], ["GITHUB_ACTIONS"], ["GITLAB", "GITLAB_CI"], ["GITLAB", "CI_MERGE_REQUEST_ID"], ["GOCD", "GO_PIPELINE_LABEL"], ["LAYERCI"], ["HUDSON", "HUDSON_URL"], ["JENKINS", "JENKINS_URL"], ["MAGNUM"], ["NETLIFY"], ["NETLIFY", "NETLIFY_LOCAL", { ci: false }], ["NEVERCODE"], ["RENDER"], ["SAIL", "SAILCI"], ["SEMAPHORE"], ["SCREWDRIVER"], ["SHIPPABLE"], ["SOLANO", "TDDIUM"], ["STRIDER"], ["TEAMCITY", "TEAMCITY_VERSION"], ["TRAVIS"], ["VERCEL", "NOW_BUILDER"], ["VERCEL", "VERCEL", { ci: false }], ["VERCEL", "VERCEL_ENV", { ci: false }], ["APPCENTER", "APPCENTER_BUILD_ID"], ["CODESANDBOX", "CODESANDBOX_SSE", { ci: false }], ["CODESANDBOX", "CODESANDBOX_HOST", { ci: false }], ["STACKBLITZ"], ["STORMKIT"], ["CLEAVR"], ["ZEABUR"], ["CODESPHERE", "CODESPHERE_APP_ID", { ci: true }], ["RAILWAY", "RAILWAY_PROJECT_ID"], ["RAILWAY", "RAILWAY_SERVICE_ID"], ["DENO-DEPLOY", "DENO_DEPLOYMENT_ID"], ["FIREBASE_APP_HOSTING", "FIREBASE_APP_HOSTING", { ci: true }]];
function b() {
  if (globalThis.process?.env) for (const e of f) {
    const s = e[1] || e[0];
    if (globalThis.process?.env[s]) return { name: e[0].toLowerCase(), ...e[2] };
  }
  return globalThis.process?.env?.SHELL === "/bin/jsh" && globalThis.process?.versions?.webcontainer ? { name: "stackblitz", ci: false } : { name: "", ci: false };
}
__name(b, "b");
var l = b();
var p = l.name;
function n(e) {
  return e ? e !== "false" : false;
}
__name(n, "n");
var I = globalThis.process?.platform || "";
var T = n(o.CI) || l.ci !== false;
var R = n(globalThis.process?.stdout && globalThis.process?.stdout.isTTY);
var d = n(o.DEBUG);
var a = t === "test" || n(o.TEST);
var v = n(o.MINIMAL) || T || a || !R;
var A = /^win/i.test(I);
var M = /^linux/i.test(I);
var m = /^darwin/i.test(I);
var Y = !n(o.NO_COLOR) && (n(o.FORCE_COLOR) || (R || A) && o.TERM !== "dumb" || T);
var C = (globalThis.process?.versions?.node || "").replace(/^v/, "") || null;
var V = Number(C?.split(".")[0]) || null;
var W = globalThis.process || /* @__PURE__ */ Object.create(null);
var _ = { versions: {} };
var y = new Proxy(W, { get(e, s) {
  if (s === "env") return o;
  if (s in e) return e[s];
  if (s in _) return _[s];
} });
var O = globalThis.process?.release?.name === "node";
var c = !!globalThis.Bun || !!globalThis.process?.versions?.bun;
var D = !!globalThis.Deno;
var L = !!globalThis.fastly;
var S = !!globalThis.Netlify;
var u = !!globalThis.EdgeRuntime;
var N = globalThis.navigator?.userAgent === "Cloudflare-Workers";
var F = [[S, "netlify"], [u, "edge-light"], [N, "workerd"], [L, "fastly"], [D, "deno"], [c, "bun"], [O, "node"]];
function G() {
  const e = F.find((s) => s[0]);
  if (e) return { name: e[1] };
}
__name(G, "G");
var P = G();
var K = P?.name || "";

// ../src/sandbox/adapters.ts
function shellQuote(arg) {
  if (!/[^\w\-./=]/.test(arg))
    return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}
__name(shellQuote, "shellQuote");
var CloudflareSandboxAdapter = class {
  static {
    __name(this, "CloudflareSandboxAdapter");
  }
  id;
  provider = "cloudflare";
  stub;
  constructor(id, stub) {
    this.id = id;
    this.stub = stub;
  }
  async exec(command, args) {
    const cmd = args.length ? `${shellQuote(command)} ${args.map(shellQuote).join(" ")}` : shellQuote(command);
    const result = await this.stub.exec(cmd);
    return { ok: result.success, stdout: result.stdout, stderr: result.stderr, code: result.exitCode };
  }
  async writeFile(path, content) {
    const result = await this.stub.writeFile(path, content);
    if (!result.success)
      throw new Error(`Failed to write file: ${path}`);
  }
  async readFile(path) {
    const result = await this.stub.readFile(path);
    if (!result.success)
      throw new Error(`Failed to read file: ${path}`);
    return result.content;
  }
  async stop() {
    await this.stub.destroy();
  }
};

// ../src/sandbox/index.ts
async function loadVercelSandbox() {
  const moduleName = "@vercel/sandbox";
  try {
    return await import(moduleName);
  } catch (e) {
    throw new Error(`${moduleName} load failed. Install it to use the Vercel provider. Original error: ${e instanceof Error ? e.message : e}`);
  }
}
__name(loadVercelSandbox, "loadVercelSandbox");
async function loadCloudflareSandbox() {
  const moduleName = "@cloudflare/sandbox";
  try {
    return await import(moduleName);
  } catch (e) {
    throw new Error(`${moduleName} load failed. Install it to use the Cloudflare provider. Original error: ${e instanceof Error ? e.message : e}`);
  }
}
__name(loadCloudflareSandbox, "loadCloudflareSandbox");
var VercelSandbox = class {
  static {
    __name(this, "VercelSandbox");
  }
  id;
  provider = "vercel";
  instance;
  constructor(id, instance) {
    this.id = id;
    this.instance = instance;
  }
  async exec(command, args) {
    const result = await this.instance.runCommand(command, args);
    const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);
    return { ok: result.exitCode === 0, stdout, stderr, code: result.exitCode };
  }
  async writeFile(path, content) {
    await this.instance.writeFiles([{ path, content: Buffer.from(content) }]);
  }
  async readFile(path) {
    const buffer = await this.instance.readFileToBuffer({ path });
    return Buffer.from(buffer).toString();
  }
  async stop() {
    await this.instance[Symbol.asyncDispose]();
  }
};
async function createSandbox(options = {}) {
  const resolved = resolveProvider(options.provider);
  if (resolved.name === "vercel") {
    const id = `vercel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { runtime, timeout, cpu } = resolved;
    const sdk = await loadVercelSandbox();
    const instance = await sdk.Sandbox.create({
      runtime: runtime ?? "node24",
      timeoutMs: timeout ?? 3e5,
      ...cpu && { resources: { vcpus: cpu } }
    });
    return new VercelSandbox(id, instance);
  }
  if (resolved.name === "cloudflare") {
    if (!resolved.namespace)
      throw new Error("Cloudflare sandbox requires a Durable Objects binding. Pass { provider: { name: 'cloudflare', namespace } }.");
    const { namespace, sandboxId, cloudflare } = resolved;
    const id = sandboxId ?? `cloudflare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const getSandbox = (await loadCloudflareSandbox()).getSandbox;
    const stub = getSandbox(namespace, id, cloudflare);
    return new CloudflareSandboxAdapter(id, stub);
  }
  throw new Error(`Unknown sandbox provider: ${resolved.name}`);
}
__name(createSandbox, "createSandbox");
function resolveProvider(provider) {
  if (provider && provider !== "auto") {
    if (typeof provider === "string") {
      return provider === "cloudflare" ? { name: "cloudflare" } : { name: "vercel" };
    }
    return provider;
  }
  if (N || p === "cloudflare_workers" || p === "cloudflare_pages")
    return { name: "cloudflare" };
  if (p === "vercel")
    return { name: "vercel" };
  if (typeof process !== "undefined") {
    if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
      return { name: "cloudflare" };
    if (process.env.VERCEL || process.env.VERCEL_ENV)
      return { name: "vercel" };
  }
  throw new Error("Unable to auto-detect sandbox provider. Pass { provider }.");
}
__name(resolveProvider, "resolveProvider");

// src/worker.ts
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, provider: "cloudflare", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (url.pathname !== "/api/sandbox") {
      return new Response("Not found", { status: 404 });
    }
    const start = Date.now();
    try {
      const sandbox = await createSandbox({
        provider: {
          name: "cloudflare",
          namespace: env.SANDBOX
        }
      });
      try {
        const exec = await sandbox.exec("echo", ["Hello from sandbox!"]);
        await sandbox.writeFile("/tmp/test.txt", "File content works!");
        const content = await sandbox.readFile("/tmp/test.txt");
        return Response.json({
          provider: "cloudflare",
          exec,
          content,
          elapsed: Date.now() - start,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } finally {
        await sandbox.stop();
      }
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : String(error),
        elapsed: Date.now() - start,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }, { status: 500 });
    }
  }
};
export {
  Sandbox,
  worker_default as default
};
//# sourceMappingURL=worker.js.map
