import fs from "node:fs";

import { PathUtils } from "@grs/shared";

import * as CommandLineService from './CommandLineService.js';

type ClientConfig = {
  userName: string;
  gameDir: string;
  saveDir: string;
  bizhawk: string;
  roomKey: string;
  roomName: string;
  serverUrl: string;
}

let initialized = false;
let saveStateLocation: string;
let gameLocation: string;
let bizhawkLocation: string;
let userName: string;
let roomKey: string;
let roomName: string;
let serverUrl: URL;

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
  const clientConfig = JSON.parse(clientConfigContent);
  if (!typeGuardClientConfig(clientConfig)) {
    process.exit(1);
  }

  userName = clientConfig.userName;
  roomKey = clientConfig.roomKey;
  roomName = clientConfig.roomName;

  saveStateLocation = PathUtils.toAbsolutePath(clientConfig.saveDir ?? "./states", clientConfigPath);
  PathUtils.ensureDir(saveStateLocation);

  gameLocation = PathUtils.toAbsolutePath(clientConfig.gameDir ?? "./games", clientConfigPath);
  if (!(PathUtils.existsSync(gameLocation))) {
    throw new Error("Invalid games path. Cannot find a folder at " + gameLocation);
  }

  bizhawkLocation = PathUtils.toAbsolutePath(clientConfig.bizhawk, clientConfigPath);
  if (!(PathUtils.existsSync(bizhawkLocation) && bizhawkLocation.endsWith("EmuHawk.exe"))) {
    throw new Error("Invalid Bizhawk path. Cannot find EmuHwak.exe at location " + bizhawkLocation);
  }

  const url = clientConfig.serverUrl ?? "https://grs.gikkman.com";
  if(!URL.canParse(url)) {
    throw new Error("Invalid Server URL. Cannot parse " + url);
  }
  serverUrl = new URL(url);

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

export function getUserName(): string {
  ensureInitialized();
  return userName;
}

export function getRoomKey(): string {
  ensureInitialized();
  return roomKey;
}

export function getRoomName(): string {
  ensureInitialized();
  return roomName;
}

export function getServerURL(): URL {
  ensureInitialized();
  return serverUrl;
}
/************************************************************************
*  Internal Functions
************************************************************************/

function typeGuardClientConfig(obj: unknown): obj is ClientConfig {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const { userName, roomKey, roomName } = obj as Partial<ClientConfig>;

  if (!(typeof userName === 'string' && userName.length > 0)) {
    throw new Error("Client config error! Missing property 'userName'");
  }
  if (!(typeof roomKey === 'string' && roomKey.length > 0)) {
    throw new Error("Client config error. Missing property 'roomKey'");
  }
  if (!(typeof roomName === 'string' && roomName.length > 0)) {
    throw new Error("Client config error. Missing property 'roomName'");
  }
  return true;
}

function ensureInitialized() {
  if (!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
