import express from 'express';
import { Server } from 'http';
import { RequestHandler } from 'express-serve-static-core';
import { TipcNamespaceClient, TipcNodeClient } from 'tipc/cjs';
import { AddressInfo } from 'ws';

import { WebsocketContract, Logger, FunctionUtils } from '@grs/shared';

import { ClientConfigService } from './ClientConfigService.js';

/************************************************************************
 *  Variables
 ************************************************************************/
let initialized = false;
const LOGGER = Logger.getLogger("Server");
const app = express();
let server: Server;

const TIPC_LOGGER = Logger.getLogger();
let tipcNsClient: TipcNamespaceClient<WebsocketContract>;

/************************************************************************
 *  Module Functions
 ************************************************************************/

export async function init(): Promise<void> {
  if (initialized) {
    return;
  }
  const [host, port] = ClientConfigService.getServerHost().split(":");
  const serverHost = host ?? "grs.gikkman.com";
  const serverPort = parseInt(port || "443");
  const serverProtocol = FunctionUtils.isSecureHost(serverHost) ? "wss" : "ws";
  const tipcConnectionManager = TipcNodeClient.create({
    host: serverHost,
    port: serverPort,
    path: "/ws",
    protocol: serverProtocol,
    loggerOptions: {
      debug: TIPC_LOGGER.debug,
      info: TIPC_LOGGER.info,
      warn: TIPC_LOGGER.warn,
      error: TIPC_LOGGER.error,
      logLevel: TIPC_LOGGER.getLogLevel(),
    },
    onDisconnect: async () => {
      LOGGER.error("Websocket server disconnected. Reconnecting");
      const wait = 1000;
      for(let attempt = 0; attempt < 120; attempt++) {
        await FunctionUtils.sleep(wait);
        try {
          await tipcConnectionManager.connect();
          return LOGGER.info("Reconnect successful");
        }
        catch (ex) {
          LOGGER.info("Reconnect attempt failed. Waiting");
        }
        // Break if we've received a SIGINT
        if(!initialized) {
          return;
        }
      }
      LOGGER.error("Reconnect failed permanently. Exiting");
      process.exit(1);
    }
  });

  const tipcClient = await tipcConnectionManager.connect().catch((e) => {
    console.error(e);
    console.error("Could not connect TIPC to remote server %s. Is server alive?", tipcClient.getAddressInfo());
    process.exit(1);
  });
  tipcNsClient = tipcClient.forContractAndNamespace<WebsocketContract>("ns");

  await new Promise<void>((res) => {
    try {
      // Start server
      server = app.listen(0, "127.0.0.1");
      server.on("listening", () => {
        const addr = server.address() as AddressInfo;
        console.log("Server started. Listening on http://" + addr.address + ":" + addr.port);
        res();
      });
      server.on("error", onError);

      // Setup shutdown hooks for the server
      process.on("SIGINT", () => {
        initialized = false;
        LOGGER.info("Shutting down in a controlled manner");
        server?.close();
        tipcClient?.shutdown();
      });
    }
    catch (err) {
      LOGGER.error("Error starting local server to listen for Bizhawk actions");
      LOGGER.error(err as Error);
      process.exit(1);
    }
  });
  initialized = true;
}

export function bindGet(url: string, callback: express.RequestHandler) {
  ensureInitialized();
  app.get(url, (req, res, next) => {
    callback(req, res, next);
  });
}

export function bindPost(url: string, callback: RequestHandler) {
  ensureInitialized();
  app.post(url, (req, res, next) => {
    callback(req, res, next);
  });
}

export function tipc() {
  ensureInitialized();
  return tipcNsClient;
}

export function getAddress() {
  ensureInitialized();
  return server.address() as AddressInfo;
}

/************************************************************************
 *  Internal functions
 ************************************************************************/
function onError(err: unknown) {
  const error = err as {syscall: string, code: string};
  const address = getAddress();
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof address.port === 'string'
    ? 'pipe ' + address.port
    : 'port ' + address.port;

  switch (error.code) {
  case 'EACCES':
    console.error(bind + ' requires elevated privileges');
    process.exit(1);
    break;
  case 'EADDRINUSE':
    console.error(bind + ' is already in use');
    process.exit(1);
    break;
  case 'ECONNRESET':
    console.error('Socket hang up');
    break;
  default:
    throw error;
  }
}

function ensureInitialized() {
  if(!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
