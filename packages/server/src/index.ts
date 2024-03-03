import * as Server from './Server';
import * as Controller from './Controller';
import * as ServerConfigService from './ServerConfigService';
import { PathUtils } from "@grs/shared";

async function main() {
  await PathUtils.init(__dirname);
  await ServerConfigService.init();
  await Server.init();
  await Controller.init();
}

main();
