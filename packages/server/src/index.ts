import * as Server from './Server';
import { PathUtils } from "@grs/shared";
async function main() {
  Server.init();
}
main();
PathUtils.init(__dirname);
