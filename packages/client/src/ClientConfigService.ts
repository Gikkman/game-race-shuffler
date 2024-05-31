import fs from "node:fs";
import { parse } from "ini";

import { PathUtils } from "@grs/shared";

import * as CommandLineService from './CommandLineService.js';

type ClientConfig = {
  Room: {
    RoomName: string,
    RoomKey: string,
    UserName: string,
  },
  Paths?: {
    BizhawkProgram?: string,
    BizhawkConfig?: string,
    SaveStates?: string,
    Games?: string,
  },
  Server?: {
    Host?: string,
  },
}

type RoomConfig = {
  roomName: string,
  roomKey: string,
  userName: string,
}

let initialized = false;
let stateLocation: string;
let gameLocation: string;
let bizhawkLocation: string;
let bizhawkConfig: string|undefined;
let serverHost: string;
let roomConfig: RoomConfig;

export * as ClientConfigService from "./ClientConfigService.js";

export function init() {
  if (initialized) {
    return;
  }

  const clientConfigPath = PathUtils.toAbsolutePath(CommandLineService.getClientConfigLocation(), PathUtils.pathRelativeToProjectRoot(""));
  if (!fs.existsSync(clientConfigPath)) {
    throw new Error("No file found at " + clientConfigPath);
  }

  const clientConfigContent = fs.readFileSync(clientConfigPath, "utf-8");
  const clientConfig = parse(clientConfigContent);
  if (!typeGuardClientConfig(clientConfig)) {
    throw new Error("Config validation error");
  }

  serverHost = clientConfig?.Server?.Host ?? "grs.gikkman.com";

  roomConfig = {
    userName: clientConfig.Room.UserName,
    roomKey: clientConfig.Room.RoomKey,
    roomName: clientConfig.Room.RoomName,
  };

  stateLocation = PathUtils.toAbsolutePath(clientConfig.Paths?.SaveStates ?? "./states", clientConfigPath);
  PathUtils.ensureDir(stateLocation);

  gameLocation = PathUtils.toAbsolutePath(clientConfig.Paths?.Games ?? "./games", clientConfigPath);
  if (!(PathUtils.existsSync(gameLocation))) {
    throw new Error("Invalid games path. Cannot find a folder at " + gameLocation);
  }

  bizhawkLocation = PathUtils.toAbsolutePath(clientConfig.Paths?.BizhawkProgram ?? "../EmuHawk.exe", clientConfigPath);
  if (!(PathUtils.existsSync(bizhawkLocation) && bizhawkLocation.endsWith("EmuHawk.exe"))) {
    throw new Error("Invalid Bizhawk path. Cannot find EmuHwak.exe at location " + bizhawkLocation);
  }
  bizhawkConfig = clientConfig.Paths?.BizhawkConfig;

  initialized = true;
}

export function getBizhawkLocation(): string {
  ensureInitialized();
  return bizhawkLocation;
}

export function getBizhawkConfig(): string|undefined {
  ensureInitialized();
  return bizhawkConfig;
}

export function getGameLocation(): string {
  ensureInitialized();
  return gameLocation;
}

export function getStateLocation(): string {
  ensureInitialized();
  return stateLocation;
}

export function getRoomConfig(): RoomConfig {
  ensureInitialized();
  return roomConfig;
}

export function getServerHost(): string {
  ensureInitialized();
  return serverHost;
}

/************************************************************************
*  Internal Functions
************************************************************************/

function typeGuardClientConfig(obj: unknown): obj is ClientConfig {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error("Config file could not be parsed");
  }

  const config = obj as Partial<ClientConfig>;
  if(typeof config.Room !== "object") {
    throw new Error("Config file must have a [Room] header");
  }
  const { UserName, RoomKey, RoomName } = config.Room;

  if (!(typeof UserName === 'string' && UserName.length > 0)) {
    throw new Error("Client config error! Missing property 'UserName'");
  }
  if (!(typeof RoomKey === 'string' && RoomKey.length > 0)) {
    throw new Error("Client config error. Missing property 'RoomKey'");
  }
  if (!(typeof RoomName === 'string' && RoomName.length > 0)) {
    throw new Error("Client config error. Missing property 'RoomName'");
  }
  return true;
}

function ensureInitialized() {
  if (!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
