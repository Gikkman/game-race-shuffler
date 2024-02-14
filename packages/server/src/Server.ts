import Fastify, { RouteHandlerMethod } from 'fastify';
import WebSocket from 'ws';

let initialized = false;
const fastify = Fastify({
  logger: true,
});
const wss = new WebSocket.Server({
  noServer: true
});


export async function init() {
  if (initialized) {
    return;
  }
  initialized = true;

  try {
    wss.on('connection', (ws) => {
      // Handle WebSocket connections and messages
      ws.on('message', (message) => {
        console.log('Received message:', message);
        ws.send('Reply from server: ' + message);
      });
    });

    // Upgrade HTTP server to WebSocket server
    fastify.server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    await fastify.listen({ port: 47911 });

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

