import { ref } from 'vue';
import { TipcBrowserClient, TipcClient, TipcNamespaceClient } from 'tipc';

import { FunctionUtils, WebsocketContract } from '@grs/shared';

let initialized = false;
let conn: TipcClient;
let client: TipcNamespaceClient<WebsocketContract>;

export const connected = ref<boolean>(false);

export async function init() {
  if(initialized) {
    return console.info("TipcListener already initialized");
  }
  initialized = true;

  const [host, port] = location.host.split(":");
  const tipc = TipcBrowserClient.create({
    host: host,
    port: parseInt(port ?? "443"),
    path: "/ws",
    protocol: host.startsWith("https") ? "wss" : "ws",
    onDisconnect: async () => {
      connected.value = false;
      console.error("Websocket disconnected. Reconnecting");
      const wait = 1000;
      for(let attempt = 0; attempt < 120; attempt++) {
        await FunctionUtils.sleep(wait);
        try {
          await tipc.connect();
          console.info("Reconnect successful");
          connected.value = true;
          break;
        }
        catch (ex) {
          console.info("Reconnect attempt failed. Waiting");
        }
      }
    }
  });
  conn = await tipc.connect();
  client = conn.forContractAndNamespace<WebsocketContract>("ns");
  connected.value = true;
}

export async function reconnect() {
  if(!initialized) {
    throw "TipcListener not initialized";
  }
  if(conn.isConnected()) {
    return console.info("TipcListener already connected");
  }
  await conn.reconnect();
  connected.value = true;
}

export function getClient() {
  if(!initialized) {
    throw "TipcListener not initialized";
  }
  return client;
}
