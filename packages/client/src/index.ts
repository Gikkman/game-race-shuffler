import { PathUtils } from '@grs/shared';
import * as ClientConfigService from './ClientConfigService';
import * as WebServer from './bizhawk/WebServer';
import * as BizhawkController from './bizhawk/BizhawkController';
import { launchBizhawk } from './bizhawk/BizhawkService';

async function main() {
  await PathUtils.init(__dirname);
  await ClientConfigService.init();
  await WebServer.init();
  await BizhawkController.init();


  launchBizhawk(WebServer.getAddress().port);
}
main();
