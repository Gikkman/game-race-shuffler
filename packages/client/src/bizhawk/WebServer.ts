import Fastify, { RouteHandlerMethod } from 'fastify';
import { TipcNamespaceClient, TipcNodeClient } from 'tipc';
import { WebsocketContract } from '@grs/shared';

let initialized = false;
const fastify = Fastify({
  logger: true,
});

const tipcFactory = TipcNodeClient.create({
  address: "localhost",
  port: 8080,
  loggerOptions: fastify.log
});

let tipcNsClient: TipcNamespaceClient<WebsocketContract>;

export async function init() {
  if (initialized) {
    return;
  }
  initialized = true;

  try {
    // Start server
    await fastify.listen({ port: 47911 });
    const tipcClient = await tipcFactory.connect();
    tipcNsClient = tipcClient.forContractAndNamespace<WebsocketContract>("ns");

    // Setup shutdown hooks for the server
    process.on("beforeExit", () => {
      fastify.close();
      tipcClient.shutdown();
    });

  }
  catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

export function bindGet(path: string, callback: RouteHandlerMethod) {
  fastify.get(path, callback);
}

export function bindPost(path: string, callback: RouteHandlerMethod) {
  fastify.post(path, callback);
}

export function tipc() {
  return tipcNsClient;
}
