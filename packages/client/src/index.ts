import path from "node:path";
import { fileURLToPath } from "node:url";

import { PathUtils } from '@grs/shared';

import * as ClientConfigService from './ClientConfigService.js';
import * as WebServer from './bizhawk/WebServer.js';
import * as BizhawkController from './bizhawk/BizhawkController.js';
import * as GameFinderService from './GameFinderService.js';
import * as CommandLineService from './CommandLineService.js';
import { launchBizhawk } from './bizhawk/BizhawkService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await PathUtils.init(__dirname);
  await CommandLineService.init();
  await ClientConfigService.init();
  await GameFinderService.init();
  await WebServer.init();
  await BizhawkController.init();
  launchBizhawk(WebServer.getAddress().port);
}
main();
