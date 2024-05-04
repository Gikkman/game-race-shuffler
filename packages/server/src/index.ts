import path from "node:path";
import { fileURLToPath } from "node:url";

import { PathUtils } from "@grs/shared";

import * as Server from './Server.js';
import * as Controller from './Controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await PathUtils.init(__dirname);
await Server.init();
await Controller.init();

// This call should be called after all other modules are initalized
// We must bind the error handler last, so it handles errors from all
// routes that might be added by modules as they are initialised
Server.bindServerHandler();
