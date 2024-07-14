import * as ChildProcess from 'child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

import { Logger, FunctionUtils, PathUtils } from '@grs/shared';

import { getBizhawkLocation, getBizhawkConfig } from '../ClientConfigService.js';
import { deleteLatestSaveState, getLatestSaveStatePath, getNextSaveStatePath } from './SaveStateService.js';

/************************************************************************
 *  Types
 ************************************************************************/
type BizhawkEvent = {
  action: string,
  path?: string,
}

enum BizhawkAction {
  PAUSE = "PAUS",
  SAVE = "SAVE",
  LOAD = "LOAD",
  GAME = "GAME",
  CONTINUE = "CONT",
  QUIT = "QUIT",
  PING = "PING",
}

/************************************************************************
 *  Variables
 ************************************************************************/
const LOGGER = Logger.getLogger("BizhawkService");
const BIZ_LOGGER = Logger.getLogger("Bizhawk.exe");
const BLANK_GAME: GameData = {gameName: "No Game", absolutePath: "", fileName: "", logicalName: "nogame"};
const QUEUE: BizhawkEvent[] = [];

let bizhawkProc: ChildProcess.ChildProcess | undefined;
let healthCheckTimeout: NodeJS.Timeout | undefined;

let bizhawkCallPort: number;
/************************************************************************
 *  Export
 ************************************************************************/
let currentGame = BLANK_GAME;
let bizhawkMuted = false;

export function muteBizhawk() {
  if (bizhawkMuted) {
    return LOGGER.info("Mute request, but was already muted. Skipping");
  }

  LOGGER.info("Mute action queued");
  bizhawkMuted = true;
  pushBizhawkEventQueue(BizhawkAction.PAUSE);
}

export function unmuteBizhawk() {
  LOGGER.info("Unmute action queued");
  bizhawkMuted = false;
  pushBizhawkEventQueue(BizhawkAction.CONTINUE);
}

export function loadGame(game: GameData) {
  LOGGER.info("Load request. Game: ", game.absolutePath);
  internalLoadGame(game).then(() => {
    LOGGER.info("Game loaded: ", game.absolutePath);
  });
}

export async function saveAndQuit() {
  LOGGER.info("Save and Quit requested");
  await saveStateIfRunning(currentGame);
  await FunctionUtils.sleep(500);
  pushBizhawkEventQueue(BizhawkAction.QUIT);
}

export function clearQueue(): void {
  currentGame = BLANK_GAME;
  while (QUEUE.length > 0) {
    QUEUE.shift();
  }
}

export function peekBizhawkEventQueue(): BizhawkEvent | undefined {
  return QUEUE[0];
}

export function popBizhawkEventQueue(): BizhawkEvent | undefined {
  return QUEUE.shift();
}

export function launchBizhawk(serverPort: number) {
  process.on('SIGINT', () => {
    LOGGER.info("Sending SIGINT to bizhawk");
    bizhawkProc?.kill('SIGINT');
  });

  bizhawkCallPort = serverPort;
  internalLaunchBizhawk();
}

export function getCurrentGame(): GameData {
  return currentGame;
}

/************************************************************************
 *  Bizhawk manipulation methods
 ************************************************************************/
async function internalLoadGame(newGame: GameData, restartCycleCount = 0) {
  if (hashGame(newGame) === hashGame(currentGame)) {
    LOGGER.debug("Skipping load. Same game already loaded");
    pushBizhawkEventQueue(BizhawkAction.CONTINUE); // The game might be paused from an external call
    return;
  }
  else {
    LOGGER.info("Loading game: ", newGame.absolutePath);
  }
  muteBizhawk();
  await FunctionUtils.sleep(50); // Just over 3 frames
  await saveStateIfRunning(currentGame);
  pushBizhawkEventQueue(BizhawkAction.GAME, newGame.absolutePath);
  await loadStateIfExists(newGame);
  await FunctionUtils.sleep(50);
  unmuteBizhawk();

  currentGame = newGame;
  checkBizhawkHealth(newGame, restartCycleCount, bizhawkProc);
}

async function saveStateIfRunning(game: GameData) {
  if (game !== BLANK_GAME) {
    const stateLocation = await getNextSaveStatePath(game);
    pushBizhawkEventQueue(BizhawkAction.SAVE, stateLocation);
  }
  else {
    LOGGER.debug("No game currently loaded. Skipping saving");
  }
}

async function loadStateIfExists(game: GameData) {
  const stateLocation = await getLatestSaveStatePath(game);
  if (stateLocation !== undefined) {
    pushBizhawkEventQueue(BizhawkAction.LOAD, stateLocation);
  }
  else {
    LOGGER.debug("No save state existed. Skipping loading");
  }
}

function pushBizhawkEventQueue(action: BizhawkAction, path?: string, callback?: () => void) {
  const event = {
    action,
    path,
    callback
  };
  QUEUE.push(event);
}

/************************************************************************
 *  Bizhawk launch methods
 ************************************************************************/
let launched = false;
let launchTime: Date;
let restartingBizhawkProcess = false;
function internalLaunchBizhawk() {
  if (launched) {
    return;
  }

  launched = true;
  restartingBizhawkProcess = false;
  launchTime = new Date();

  try {
    const bizhawkPath = getBizhawkLocation();
    const bizhawkCwd = path.dirname(bizhawkPath);
    const luaPath = getLuaPath();
    const params = ["--lua=" + luaPath, `--url_get=${bizhawkCallPort}`];

    const specialConfigPath = getPotentialSpecialConfigPath();
    if(specialConfigPath) {
      params.push(specialConfigPath);
    }

    const proc = ChildProcess.spawn(bizhawkPath, params, { windowsHide: false, env: process.env, cwd: bizhawkCwd });

    proc.stdout.on('data', (data) => {
      BIZ_LOGGER.debug(`[%s] %s`,launchTime, data.toString('utf8'));
    });

    proc.stderr.on('data', (data) => {
      BIZ_LOGGER.debug(`[%s] %s`,launchTime, data.toString('utf8'));
    });

    proc.on('close', (code, signal) => {
      BIZ_LOGGER.debug(`[%s] Bizhawk closed with code: %d signal: %s`, launchTime, code, signal);
      if(!restartingBizhawkProcess) {
        process.emit("SIGINT");
      }
    });

    proc.on('exit', (code, signal) => {
      if (!launched) {
        return;
      }
      BIZ_LOGGER.debug(`[%s] Exited Bizhawk with code: %d signal: %s`, launchTime, code, signal);
      // bizhawkLog(launchTime, "Exited Bizhawk");
      cleanupBizhawk();
    });

    proc.on('error', (e) => {
      BIZ_LOGGER.debug(`[%s] Bizhawk ran in to an error,`,launchTime, e);

      if (!launched) {
        return;
      }
      cleanupBizhawk();
    });

    bizhawkProc = proc;
    BIZ_LOGGER.debug(`[%s] Started Bizhawk: %s`, launchTime, bizhawkPath);
  }
  catch (e) {
    LOGGER.error("Starting Bizhawk failed: %s", e);
    cleanupBizhawk();
  }
}

function getLuaPath() {
  return PathUtils.pathRelativeToWorkspaceRoot("bizhawk-client.lua");
}

function cleanupBizhawk() {
  launched = false;
  clearQueue();
  bizhawkProc = undefined;
}

function hashGame(game: GameData) {
  return crypto.createHash('md5').update(game.absolutePath).digest('hex');
}

/************************************************************************
 *  Bizhawk health method
 *
 * The reason for this function is that sometimes, Bizhawk fails to load
 * a save state and the LUA script crashes and we loose the ability to
 * control Bizhawk remotely. To fix this, we request that Bizhawk sends
 * a PONG to us when we load a game, within 5 seconds. If it doesn't, we
 * kill the process, deletes the save state, restarts Bizhawk and load
 * the game up again
 ************************************************************************/
function checkBizhawkHealth(game: GameData, restartCycleCount: number, process?: ChildProcess.ChildProcess) {
  if (process === undefined) {
    return;
  } // In case we loaded a game with bizhawk closed

  pushBizhawkEventQueue(BizhawkAction.PING);
  LOGGER.info("Starting health check timeout [%s]", new Date().toISOString());
  const timeout = setTimeout(() => {
    bizhawkHealthTimeout(game, restartCycleCount, process);
    // Give longer timeout if we're in a restart, cause we gotta start the Bizhawk process too
  }, 5_000 + (restartCycleCount > 0 ? 5_000 : 0));
  clearTimeout(healthCheckTimeout);
  healthCheckTimeout = timeout;
}

export function bizhawkPong() {
  LOGGER.info("Bizhawk pong. Health check passed [%s]", new Date().toISOString());
  clearTimeout(healthCheckTimeout);
}

async function bizhawkHealthTimeout(game: GameData, restartCycleCount: number, process: ChildProcess.ChildProcess) {
  restartCycleCount++;
  LOGGER.error("Bizhawk failed health check  [%s]", new Date().toISOString());

  LOGGER.warn("Decrementing save state counter [%s]", new Date().toISOString());
  deleteLatestSaveState(game);

  // Setup  bizhawk to restart on close, since we've removed the save state
  // Use setImmediate to not spawn a new bizhawk inside the callback
  process.on('close', () => {
    setImmediate(() => {
      if (restartCycleCount > 3) {
        LOGGER.error(`Aborting restart cycle. Permanently failed to start Bizhawk for game ${game.gameName} (${game.fileName})`);
        return;
      }
      LOGGER.info("Relaunching bizhawk. Attempt: " + restartCycleCount);
      internalLaunchBizhawk();
      LOGGER.info(`Reloading game ${game.gameName} (${game.fileName})`);
      internalLoadGame(game, restartCycleCount);
    });
  });

  LOGGER.warn("Killing bizhawk process [%s]", new Date().toISOString());
  restartingBizhawkProcess = true;
  process.kill();
}

function getPotentialSpecialConfigPath() {
  const configPath = getBizhawkConfig();
  if(configPath && fs.existsSync(configPath)) {
    return "--config="+configPath;
  }
  return "";
}

