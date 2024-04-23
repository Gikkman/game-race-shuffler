import express from 'express';
import { Server } from 'http';
import { RequestHandler } from 'express-serve-static-core';
import { TipcNamespaceServer, TipcNodeServer, TipcServer } from 'tipc';
import { Logger, WebsocketContract, PathUtils } from '@grs/shared';
import { ServerConfigService } from './ServerConfigService';

const app = express();

/************************************************************************
 *  Variables
 ************************************************************************/
let initialized = false;

const port = 47911;
let server: Server;

let tipcServer: TipcServer;
let tipcNamespaceServer: TipcNamespaceServer<WebsocketContract>;

const TIPC_LOGGER = Logger.getLogger();
const LOGGER = Logger.getLogger("WEB");

/************************************************************************
 * Module functions
 ************************************************************************/
export async function init() {
  app.use(express.json());
  app.use("/",express.static(PathUtils.pathRelativeToWorkspaceRoot("public")));

  server = app.listen(port, "0.0.0.0");

  // Config server
  app.use(express.json());
  server.on('error', onError);
  server.on('listening', onListening);
  await setupWebSocket(server);

  process.on("beforeExit", () => {
    initialized = false;
    server?.close();
    tipcServer?.shutdown();
  });

  initialized = true;
}

export function bindGet(url: string, callback: express.RequestHandler) {
  ensureInitialized();
  LOGGER.info("Bind GET -> " + url);
  app.get(url, (req, res, next) => {
    LOGGER.debug("GET -> %s", req.path);
    callback(req, res, next);
  });
}

export function bindPost(url: string, callback: RequestHandler) {
  ensureInitialized();
  LOGGER.info("Bind POST -> " + url);
  app.post(url, (req, res, next) => {
    LOGGER.debug("POST -> %s", req.path);
    callback(req, res, next);
  });
}

export function tipc() {
  ensureInitialized();
  return tipcNamespaceServer;
}
/***********************************************************************
* Internal methods
***********************************************************************/
async function setupWebSocket(server: Server) {
  tipcServer = await TipcNodeServer.create({
    server: server,
    loggerOptions: {
      debug: TIPC_LOGGER.debug,
      info: TIPC_LOGGER.info,
      warn: TIPC_LOGGER.warn,
      error: TIPC_LOGGER.error,
      logLevel: TIPC_LOGGER.getLogLevel(),
    },
    onNewConnection: (ws, request) => {
      if(!request.url || !request.url.includes("?")) {
        ws.close();
        return LOGGER.info("New connection failed. No query params");
      }
      const url = new URL(request.url, `http://${request.headers.host}`);
      const key = url.searchParams.get("key");
      if(!key) {
        ws.close();
        return LOGGER.info("New connection failed. No key provided");
      }
      if(key !== ServerConfigService.getConnectionKey()) {
        ws.close();
        return LOGGER.info("New connection failed. Key missmatch. Got: %s", key);
      }
      LOGGER.info("New client connected");
      ws.on('close', () => {
        LOGGER.info("Client disconnected");
      });
    },
  }).connect();
  tipcNamespaceServer = tipcServer.forContractAndNamespace<WebsocketContract>("ns");
}

function onError(err: unknown) {
  const error = err as {syscall: string, code: string};
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'pipe ' + port
    : 'port ' + port;

  switch (error.code) {
  case 'EACCES':
    LOGGER.error(bind + ' requires elevated privileges');
    process.exit(1);
    break;
  case 'EADDRINUSE':
    LOGGER.error(bind + ' is already in use');
    process.exit(1);
    break;
  case 'ECONNRESET':
    LOGGER.error('Socket hang up');
    break;
  default:
    throw error;
  }
}

function onListening() {
  const addr: unknown = server.address();
  if(addr && typeof addr === "object" && 'address' in addr && 'port' in addr) {
    LOGGER.info("Server started. Listening on http://" + addr.address + ":" + addr.port);
  }
  else {
    LOGGER.info("Server started. Listening: " + addr);
  }
}

function ensureInitialized() {
  if(!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
