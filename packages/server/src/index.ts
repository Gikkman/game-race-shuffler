import path from "node:path";
import { fileURLToPath } from "node:url";

import { PathUtils } from "../../shared/dist/_index.js";

import * as Server from './Server.js';
import * as Controller from './Controller.js';
import * as ServerConfigService from './ServerConfigService.js';
import * as RoomManager from './RoomManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await PathUtils.init(__dirname);
await ServerConfigService.init();
await Server.init();
await Controller.init();
await RoomManager.init();
