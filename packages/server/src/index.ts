import * as Server from './Server';
import * as Controller from './Controller';
import { PathUtils } from "@grs/shared";

async function main() {
  await PathUtils.init(__dirname);
  // ClientConfigService.init();
  await Server.init();
  await Controller.init();
}

main();
