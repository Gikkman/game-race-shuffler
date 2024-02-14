import fs from "node:fs";
import path from "node:path";
import { PathUtils } from "@grs/shared";

let initialized = false;
let clientConfig: ClientConfig;
let saveStateLocation: string;

export * as ClientConfigService from "./ClientConfigService";

export function init() {
  if(initialized) {
    return;
  }
  initialized = true;

  const clientConfigPath = PathUtils.pathRelativeToProjectRoot("client-config.json");
  if(!fs.existsSync(clientConfigPath)) {
    throw new Error("No file found at " + clientConfigPath);
  }

  const clientConfigContent = fs.readFileSync(clientConfigPath, "utf-8");
  const clientConfigJson = JSON.parse(clientConfigContent);
  if(!isClientConfig(clientConfigJson)) {
    throw new Error("Invalid client config");
  }
  clientConfig = clientConfigJson;

  saveStateLocation = PathUtils.pathRelativeToProjectRoot("_states");
  if(!PathUtils.existsSync(saveStateLocation)) {
    fs.mkdirSync(saveStateLocation);
  }
}

export function getClientConfig(): ClientConfig {
  return {...clientConfig};
}

export function getSaveStateLocation(hash: string): string {
  return path.join(saveStateLocation, hash);
}

export type ClientConfig = {
  bizhawk: string,
  games: {
    index: number,
    path: string,
  }[]
}

/************************************************************************
*  Internal Functions
************************************************************************/

function isClientConfig(obj: unknown): obj is ClientConfig {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error(`The content of client-config.json was not a valid Javascript object`);
  }

  const { bizhawk, games } = obj as { bizhawk: unknown, games: unknown[] };

  if (typeof bizhawk !== 'string') {
    throw new Error(`Property 'bizhawk' in client-config.json is not a string`);
  }
  if(!PathUtils.existsSync(bizhawk) || !bizhawk.endsWith("EmuHawk.exe")) {
    throw new Error(`The 'bizhawk' property in client-config.json does not resolve to a file: ${bizhawk}`);
  }

  if (!Array.isArray(games)) {
    throw new Error(`Property 'game' in client-config.json is not an array`);
  }

  games.forEach((game, idx) => {
    if( typeof game !== 'object' || game === null) {
      throw new Error(`Game element at index ${idx} in client-config.json is not an object`);
    }

    const {path, index} = game as { path: unknown, index: unknown };
    if(typeof index !== 'number') {
      throw new Error(`Property 'index' of game ${idx} in client-config.json is not a number`);
    }
    if(typeof path !== 'string') {
      throw new Error(`Property 'path' of game ${idx} in client-config.json is not a string`);
    }
    if(!PathUtils.existsSync(path)) {
      throw new Error(`The 'path' property of game ${idx} in client-config.json does not resolve to a file: ${path}`);
    }
  });

  return true;
}
