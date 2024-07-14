import path from "node:path";
import { fileURLToPath } from "node:url";

import { FunctionUtils, PathUtils } from '@grs/shared';

import * as ClientConfigService from './ClientConfigService.js';
import * as WebServer from './WebServer.js';
import * as BizhawkController from './bizhawk/BizhawkController.js';
import * as SaveStateService from './bizhawk/SaveStateService.js';
import * as GameFinderService from './GameFinderService.js';
import * as CommandLineService from './CommandLineService.js';
import * as RaceService from './RaceService.js';
import { launchBizhawk } from './bizhawk/BizhawkService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await PathUtils.init(__dirname);
  await CommandLineService.init();
  await ClientConfigService.init();
  await GameFinderService.init();
  await WebServer.init();
  await BizhawkController.init();
  await SaveStateService.init();
  launchBizhawk(WebServer.getAddress().port);

  // Give Bizhawk ~4 seconds to launch
  // In a perfect world we'd know when Bizhawk was ready but I haven't figured out how to do that yet.
  await FunctionUtils.sleep(4000);

  await RaceService.init();
}
main();
