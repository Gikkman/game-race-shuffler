enum LOG_LEVEL {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 99
}
const LEVEL = calculateLogLevel();

export function getLogger(name: string) {
  return new Logger(name);
}

/**
 * Prints to stdout with newline. Multiple arguments can be passed, with the first used as the primary message and
 * all additional used as substitution values similar to printf(3) (the arguments are all passed to util.format()).
 *
 * ```js
 * const LOGGER = getLogger("my-name")
 * const count = 5;
 * LOGGER.info('count: %d', count);
 * // Prints: [INFO] (my-name) count: 5, to stdout
 * LOGGER.info('count:', count);
 * // Prints: [INFO] (my-name) count: 5, to stdout
 * ```
 */
class Logger {
  private name: string;
  constructor(name: string) {
    this.name = name;
  }

  debug(message: string, ...rest: unknown[]) {
    if(LEVEL > LOG_LEVEL.DEBUG) {
      return;
    }
    this.logPrint(LOG_LEVEL.DEBUG, message, rest);
  }

  info(message: string, ...rest: unknown[]) {
    if(LEVEL > LOG_LEVEL.INFO) {
      return;
    }
    this.logPrint(LOG_LEVEL.INFO, message, rest);
  }

  warn(message: string, ...rest: unknown[]) {
    if(LEVEL > LOG_LEVEL.WARN) {
      return;
    }
    this.logPrint(LOG_LEVEL.WARN, message, rest);
  }

  err(message: string|Error, ...rest: unknown[]) {
    if(LEVEL > LOG_LEVEL.ERROR) {
      return;
    }
    this.logPrint(LOG_LEVEL.ERROR, message, rest);
  }

  private logPrint(minLevel: LOG_LEVEL, message: string|Error, rest: unknown[]) {
    if(LEVEL > minLevel) {
      return;
    }
    if(typeof message === "object" || Array.isArray(message)) {
      console.log(`[${logLevelToStr(minLevel)}] (${this.name})`, message, ...rest);
    }
    else {
      console.log(`[${logLevelToStr(minLevel)}] (${this.name}) ${message}`, ...rest);
    }
  }
}


function logLevelToStr(level: LOG_LEVEL) {
  switch(level) {
  case LOG_LEVEL.DEBUG: return "DEBUG";
  case LOG_LEVEL.INFO: return "INFO";
  case LOG_LEVEL.WARN: return "WARN";
  case LOG_LEVEL.ERROR: return "ERROR";
  default: return "";
  }
}

function calculateLogLevel(): LOG_LEVEL {
  return tryLogLevel(process.env["LOGLEVEL"])
        ?? tryLogLevel(process.env["LOG_LEVEL"])
        ?? LOG_LEVEL.INFO;
}

function tryLogLevel(str?: string) {
  switch(str?.toUpperCase()) {
  case "DEBUG": return LOG_LEVEL.DEBUG;
  case "INFO": return LOG_LEVEL.INFO;
  case "WARN": return LOG_LEVEL.WARN;
  case "ERROR": return LOG_LEVEL.ERROR;
  case "OFF": return LOG_LEVEL.OFF;
  default: return undefined;
  }
}