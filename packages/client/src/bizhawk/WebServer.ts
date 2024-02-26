import express from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { TipcNamespaceClient, TipcNodeClient } from 'tipc';
import { WebsocketContract, Logger } from '@grs/shared';

let initialized = false;
const LOGGER = Logger.getLogger("Server");
const server = express();
const port = 47911;


const TIPC_LOGGER = Logger.getLogger("TIPC");
const tipcFactory = TipcNodeClient.create({
  address: "localhost",
  port: 8080,
  loggerOptions: {
    debug: TIPC_LOGGER.debug,
    info: TIPC_LOGGER.info,
    warn: TIPC_LOGGER.warn,
    error: TIPC_LOGGER.error,
    logLevel: TIPC_LOGGER.getLogLevel(),
  }
});

let tipcNsClient: TipcNamespaceClient<WebsocketContract>;

export async function init() {
  if (initialized) {
    return;
  }
  initialized = true;

  try {
    // Start server
    const serverHandle = server.listen(port, () => {
      LOGGER.info("Listening on " + port);
    });
    // const tipcClient = await tipcFactory.connect();
    // tipcNsClient = tipcClient.forContractAndNamespace<WebsocketContract>("ns");

    // Setup shutdown hooks for the server
    process.on("beforeExit", () => {
      LOGGER.debug("Shutting down in a controlled manner");
      serverHandle.close();
      // tipcClient.shutdown();
    });

  }
  catch (err) {
    LOGGER.error(err as Error);
    process.exit(1);
  }
}

export function bindGet(url: string, callback: express.RequestHandler) {
  server.get(url, (req, res, next) => {
    callback(req, res, next);
  });
}

export function bindPost(url: string, callback: RequestHandler) {
  server.post(url, (req, res, next) => {
    callback(req, res, next);
  });
}

export function tipc() {
  return tipcNsClient;
}
