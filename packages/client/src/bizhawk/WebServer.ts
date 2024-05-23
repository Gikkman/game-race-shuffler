import express from 'express';
import { Server } from 'http';
import { RequestHandler } from 'express-serve-static-core';
import { TipcNamespaceClient, TipcNodeClient } from 'tipc/cjs';
import { AddressInfo } from 'ws';

import { WebsocketContract, Logger, FunctionUtils } from '@grs/shared';

import { ClientConfigService } from '../ClientConfigService.js';

/************************************************************************
 *  Variables
 ************************************************************************/
let initialized = false;
const LOGGER = Logger.getLogger("Server");
const app = express();
let server: Server;
let room: {userKey: string};

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
  const serverProtocol = (serverHost.startsWith("localhost") || serverHost.startsWith("10.") || serverHost.startsWith("172.") || serverHost.startsWith("192.168.")) ? "ws" : "wss";
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
      TIPC_LOGGER.error("Server disconnected. Reconnecting");
      const wait = 1000;
      for(let attempt = 0; attempt < 120; attempt++) {
        await FunctionUtils.sleep(wait);
        try {
          return await tipcConnectionManager.connect();
        }
        catch (ex) {
          TIPC_LOGGER.info("Reconnect attempt failed. Waiting");
        }
      }
      TIPC_LOGGER.error("Reconnect failed permanently. Exiting");
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
      process.on("beforeExit", () => {
        initialized = false;
        LOGGER.debug("Shutting down in a controlled manner");
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

export async function joinRace() {
  const userName = ClientConfigService.getUserName();
  const roomName = ClientConfigService.getRoomName();
  const roomKey = ClientConfigService.getRoomKey();
  const joinData = await tipcNsClient.invoke("joinRace", {roomKey, roomName, userName}).catch(e => {
    LOGGER.error(e);
    process.exit(1);
  });
  room = {userKey: joinData.userKey};
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

export function getUserKey() {
  ensureInitialized();
  return room.userKey;
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
