import path from "node:path";
import { fileURLToPath } from "node:url";

import { PathUtils } from "@grs/shared";

import * as Server from './Server.js';
import * as Controller from './Controller.js';
import * as RoomManager from './RoomManager.js';
import RoomRepository from './RoomRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await PathUtils.init(__dirname);
await Server.init();
await Controller.init();
await RoomRepository.init();
await RoomManager.init();

// This call should be called after all other modules are initialized
// We must bind the error handler last, so it handles errors from all
// routes that might be added by modules as they are initialized
Server.bindServerHandler();
