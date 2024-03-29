import fs from "node:fs";
import { PathUtils } from "@grs/shared";
import * as CommandLineService from './CommandLineService';

type ClientConfig = {
  name: string;
  gameDir: string;
  saveDir: string;
  bizhawk: string;
}

let initialized = false;
let saveStateLocation: string;
let gameLocation: string;
let bizhawkLocation: string;
let clientName: string;

export * as ClientConfigService from "./ClientConfigService";

export function init() {
  if(initialized) {
    return;
  }

  const clientConfigPath = PathUtils.toAbsolutePath( CommandLineService.getClientConfigLocation(), PathUtils.pathRelativeToProjectRoot(""));
  if(!fs.existsSync(clientConfigPath)) {
    throw new Error("No file found at " + clientConfigPath);
  }

  const clientConfigContent = fs.readFileSync(clientConfigPath, "utf-8");
  const clientConfig = JSON.parse(clientConfigContent);
  if(!typeGuardClientConfig(clientConfig)){
    process.exit(1);
  }

  clientName = clientConfig.name;

  saveStateLocation = PathUtils.toAbsolutePath(clientConfig.saveDir, clientConfigPath);
  PathUtils.ensureDir(saveStateLocation);

  gameLocation = PathUtils.toAbsolutePath(clientConfig.gameDir,  clientConfigPath);
  PathUtils.ensureDir(gameLocation);

  bizhawkLocation = PathUtils.toAbsolutePath(clientConfig.bizhawk, clientConfigPath);
  if(!(PathUtils.existsSync(bizhawkLocation) && bizhawkLocation.endsWith("EmuHawk.exe"))){
    throw new Error("Invalid Bizhawk path. Cannot find EmuHwak.exe at location " + bizhawkLocation);
  }

  initialized = true;
}

export function getBizhawkLocation(): string {
  ensureInitialized();
  return bizhawkLocation;
}

export function getGameLocation(): string {
  ensureInitialized();
  return gameLocation;
}

export function getSaveStateLocation(): string {
  ensureInitialized();
  return saveStateLocation;
}

export function getClientName(): string {
  ensureInitialized();
  return clientName;
}

/************************************************************************
*  Internal Functions
************************************************************************/

function typeGuardClientConfig(obj: unknown): obj is ClientConfig {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const { name, gameDir, saveDir, bizhawk } = obj as Partial<ClientConfig>;

  if(!(typeof name === 'string'    && name.length > 0)) {
    throw new Error("Client config error! Missing property 'name'");
  }
  if(!(typeof gameDir === 'string' && gameDir.length > 0)) {
    throw new Error("Client config error. Missing property 'gameDir'");
  }
  if(!(typeof saveDir === 'string' && saveDir.length > 0)) {
    throw new Error("Client config error. Missing property 'saveDir'");
  }
  if(!(typeof bizhawk === 'string' && bizhawk.length > 0)) {
    throw new Error("Client config error. Missing property ''bizhawk");
  }
  return true;
}

function ensureInitialized() {
  if(!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
