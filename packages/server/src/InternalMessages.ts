import { TipcNamespaceServer, TipcNodeServer } from "tipc/cjs";
import { TiltifyDonationEvent } from "./Types.js";

type Contract = {
  tiltifyWebhook: TiltifyDonationEvent,
  cleanupCron: void,
}

let initialized = false;
let messages: TipcNamespaceServer<Contract>;

export async function init() {
  if(initialized) {
    return;
  }
  initialized = true;
  const conn = await TipcNodeServer.create({noWsServer: true}).connect();
  messages = conn.forContractAndNamespace<Contract>("internal");
}

export default function() {
  return messages;
}
