import { PathUtils } from '@grs/shared';
import * as ClientConfigService from './ClientConfigService';
import * as Server from './bizhawk/WebServer';
import * as BizhawkController from './bizhawk/BizhawkController';
import { launchBizhawk } from './bizhawk/BizhawkService';

async function main() {
  PathUtils.init(__dirname);
  ClientConfigService.init();
  Server.init();
  BizhawkController.init();

  launchBizhawk();
}
main();
