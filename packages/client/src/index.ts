import { PathUtils } from '@grs/shared';
import * as ClientConfigService from './ClientConfigService';
import * as Server from './bizhawk/WebServer';
import { launchBizhawk } from './bizhawk/BizhawkService';

async function main() {
  PathUtils.init(__dirname);
  ClientConfigService.init();
  Server.init();

  launchBizhawk();
}
main();
