import express, { NextFunction, RequestHandler, Request, Response } from 'express';
import { Server } from 'http';
import history from "connect-history-api-fallback";
import { TipcNamespaceServer, TipcNodeServer, TipcServer } from 'tipc/cjs';

import { Logger, WebsocketContract, PathUtils } from '@grs/shared';
import InternalMessages from './InternalMessages.js';

const app = express();

/************************************************************************
 *  Variables
 ************************************************************************/
let initialized = false;

const port = 8090;
let server: Server;

let tipcServer: TipcServer;
let tipcNamespaceServer: TipcNamespaceServer<WebsocketContract>;

const TIPC_LOGGER = Logger.getLogger();
const LOGGER = Logger.getLogger("WEB");

/************************************************************************
 * Module functions
 ************************************************************************/
export async function init() {
  // Config server
  app.use(express.json({
    verify(req, _, buf) {
      // So we can access the raw body string in webhooks to verify their hmac
      if(req.url?.includes("/webhook")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).rawBody = buf.toString("utf8");
      }
    },
  }));
  server = app.listen(port, "0.0.0.0");

  server.on('error', onError);
  server.on('listening', onListening);
  app.use((req,_,next) => {
    if(req.path.startsWith("/assets") ||req.path === "/vite.svg") {
      LOGGER.debug(`%s -> %s`, req.method, req.path);
    }
    else {
      LOGGER.info(`%s -> %s`, req.method, req.path);
    }
    next();
  });

  await setupWebSocket(server);

  InternalMessages().addListener("shutdown", () => {
    LOGGER.info("Stopping server");
    initialized = false;
    server?.close();
    tipcServer?.shutdown();
  });

  initialized = true;
}

export function bindServerHandler() {
  const htmlPath = PathUtils.pathRelativeToWorkspaceRoot("html");
  app.use(history());
  app.use("/",express.static(htmlPath));
  app.use(handleRouteError);
}

export function bindGet(url: string, callback: RequestHandler) {
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

export function bindDelete(url: string, callback: RequestHandler) {
  ensureInitialized();
  LOGGER.info("Bind DELETE -> " + url);
  app.delete(url, (req, res, next) => {
    LOGGER.debug("DELETE -> %s", req.path);
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
    path: "/ws",
    server: server,
    loggerOptions: {
      debug: TIPC_LOGGER.debug,
      info: TIPC_LOGGER.info,
      warn: TIPC_LOGGER.warn,
      error: TIPC_LOGGER.error,
      logLevel: TIPC_LOGGER.getLogLevel(),
    },
    onNewConnection: (ws) => {
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

function handleRouteError(err: Error|string, req: Request, res: Response, _: NextFunction) {
  LOGGER.error(err);
  res.status(500).send("Internal server error");
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
