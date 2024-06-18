import path from "node:path";
import { fileURLToPath } from "node:url";

import { PathUtils } from "@grs/shared";

import * as ServerConfig from './ServerConfig.js';
import * as Server from './Server.js';
import * as Controller from './Controller.js';
import * as InternalMessages from './InternalMessages.js';
import * as TiltifyWebhook from './webhooks/TiltifyWebhook.js';
import * as RoomManager from './race/RoomManager.js';
import RoomRepository from './race/RoomRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await PathUtils.init(__dirname);
await ServerConfig.init();
await Server.init();
await Controller.init();
await InternalMessages.init();
await TiltifyWebhook.init();
await RoomRepository.init();
await RoomManager.init();

// This call should be called after all other modules are initialized
// We must bind the error handler last, so it handles errors from all
// routes that might be added by modules as they are initialized
Server.bindServerHandler();

// Setup automated cleanup tasks, and a cleanup hook on exit
const cleanupCron = setInterval(() => {
  InternalMessages.default().send("cleanupCron");
}, 2*60*1000); //Every two minutes

process.on("beforeExit", () => {
  clearInterval(cleanupCron);
});
