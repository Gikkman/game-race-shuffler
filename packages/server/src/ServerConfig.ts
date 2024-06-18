import fs from "node:fs";
import { Logger, PathUtils } from "@grs/shared";
import { mergician } from "mergician";
import { Immutable } from "./Types.js";

type Config = {
  serverPort: number,
  tiltify: {
    enabled: boolean,
    webhookId: string,
    webhookSecret: string,
    clientId: string,
    clientSecret: string,
  }
}

const LOGGER = Logger.getLogger("ServerConfig");
let initialized = false;
let config: Config;

export function init() {
  if(initialized) {
    return;
  }

  const baseConfig = loadConfigFile("server-config.base.json");
  if(!baseConfig) {
    throw new Error("No server-config.base.json found");
  }
  const overrideConfig = loadConfigFile("server-config.override.json");
  if(!overrideConfig) {
    LOGGER.info("No server-config.override.json found. Running on only base config");
  }
  config = mergician(baseConfig, overrideConfig??{}) as Config;

  initialized = true;
}

export function getConfig(): Immutable<Config> {
  ensureInitialized();
  return config;
}

function loadConfigFile(name: string): Config|undefined {
  const path = PathUtils.pathRelativeToProjectRoot(name);
  if(fs.existsSync(path)) {
    const content = fs.readFileSync(path, "utf8");
    const config = JSON.parse(content) as Config;
    if(typeof config.serverPort === "string") {
      config.serverPort = parseInt(config.serverPort);
    }
    return config;
  }
  return undefined;
}

function ensureInitialized() {
  if(!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
