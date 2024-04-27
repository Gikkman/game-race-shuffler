import { FunctionUtils, WebsocketContract } from '@grs/shared';
import { TipcBrowserClient, TipcClient } from 'tipc';
import { TipcNamespaceClient } from 'tipc/cjs';

let initialized = false;
let conn: TipcClient;
let client: TipcNamespaceClient<WebsocketContract>;

export async function init() {
  if(initialized) {
    return console.info("TipcListener already initialized");
  }
  initialized = true;

  const tipc = TipcBrowserClient.create({
    host:"/ws?key=KEY-HERE",
    port: 47911,
    onDisconnect: async () => {
      console.error("Websocket disconnected. Reconnecting");
      const wait = 1000;
      for(let attempt = 0; attempt < 120; attempt++) {
        await FunctionUtils.sleep(wait);
        try {
          return await tipc.connect();
        }
        catch (ex) {
          console.info("Reconnect attempt failed. Waiting");
        }
      }
    }
  });
  conn = await tipc.connect();
  client = conn.forContractAndNamespace<WebsocketContract>("ns");
}

export async function reconnect() {
  if(!initialized) {
    throw "TipcListener not initialized";
  }
  if(conn.isConnected()) {
    return console.info("TipcListener already connected");
  }
  await conn.reconnect();
}

export function getClient() {
  if(!initialized) {
    throw "TipcListener not initialized";
  }
  return client;
}
