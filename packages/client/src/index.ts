import { PathUtils } from '@grs/shared';
import * as ClientConfigService from './ClientConfigService';
import * as WebServer from './bizhawk/WebServer';
import * as BizhawkController from './bizhawk/BizhawkController';
import * as GameFinderService from './GameFinderService';
import * as CommandLineService from './CommandLineService';
import { launchBizhawk } from './bizhawk/BizhawkService';

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
