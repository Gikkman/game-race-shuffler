import { Option, program } from 'commander';

let initialized = false;

export function init() {
  if(initialized) {
    return;
  }
  program
    .name("Game Race Shuffler Client")
    .addOption(new Option('-c, --config <location>', 'Where to find the client-config.json file')
      .env("GRS_CLIENT_CONFIG")
      .default("client-config.json"))
    .parse();

  initialized = true;
}

export function getClientConfigLocation()  {
  ensureInitialized();
  const option = program.opts();
  return option['config'] as string;
}

function ensureInitialized() {
  if(!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
