import * as ChildProcess from 'child_process';
import { Logger, FunctionUtils, PathUtils } from '@grs/shared';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { ClientConfigService } from '../ClientConfigService';

/************************************************************************
 *  Types
 ************************************************************************/
type BizhawkEvent = {
  action: string,
  path: string
}

type GameData = {
  absoluteFilePath: string;
  name: string;
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
const LOGGER = Logger.getLogger("Bizhawk");
const BLANK_GAME: GameData = {name: "No Game", absoluteFilePath: ""};
const QUEUE: BizhawkEvent[] = [];

let bizhawkProc: ChildProcess.ChildProcess | undefined;
let healthCheckTimeout: NodeJS.Timeout | undefined;

const saveStateExtension = ".State";
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
  LOGGER.info("Load request. Game: ", game.absoluteFilePath);
  internalLoadGame(game).then(() => {
    LOGGER.info("Game loaded: ", game.absoluteFilePath);
  });
}

export async function saveAndQuit() {
  LOGGER.info("Save and Quit requested");
  saveStateIfRunning(currentGame);
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

export function launchBizhawk() {
  intenalLaunchBizhawk();
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
    LOGGER.info("Loading game: ", newGame.absoluteFilePath);
  }
  muteBizhawk();
  saveStateIfRunning(currentGame);
  await FunctionUtils.sleep(500);
  pushBizhawkEventQueue(BizhawkAction.GAME, newGame.absoluteFilePath);
  await FunctionUtils.sleep(500);
  loadStateIfExists(newGame);
  unmuteBizhawk();

  currentGame = newGame;
  checkBizhawkHealth(newGame, restartCycleCount, bizhawkProc);
}

function saveStateIfRunning(file: GameData) {
  if (file !== BLANK_GAME) {
    const stateLocation = ClientConfigService.getSaveStateLocation(hashGame(file)) + saveStateExtension;
    pushBizhawkEventQueue(BizhawkAction.SAVE, stateLocation);
  }
  else {
    LOGGER.debug("No game currently loaded. Skipping saving");
  }
}

function loadStateIfExists(file: GameData) {
  const stateLocation = ClientConfigService.getSaveStateLocation(hashGame(file)) + saveStateExtension;
  if (fs.existsSync(stateLocation)) {
    pushBizhawkEventQueue(BizhawkAction.LOAD, stateLocation);
  }
  else {
    LOGGER.debug("No save state existed. Skipping loading");
  }
}

function deleteStateIfExists(file: GameData) {
  const stateLocation = ClientConfigService.getSaveStateLocation(hashGame(file)) + saveStateExtension;
  if (fs.existsSync(stateLocation)) {
    // TODO: Move previous save state instead of just deleting
    fs.unlinkSync(stateLocation);
    LOGGER.debug("Deleted save state from " + stateLocation);
  }
  else {
    LOGGER.debug("No save state to delete at " + stateLocation);
  }
}

function pushBizhawkEventQueue(action: BizhawkAction, path: string = "") {
  const event = {
    action: action,
    path: path
  };
  QUEUE.push(event);
}

/************************************************************************
 *  Bizhawk path methods
 ************************************************************************/
function getBizhawkPath() {
  return ClientConfigService.getClientConfig().bizhawk;
}

/************************************************************************
 *  Bizhawk launch methods
 ************************************************************************/
let launched = false;
let launchTime: Date;
function intenalLaunchBizhawk() {
  if (launched) {
    return;
  }

  launched = true;
  launchTime = new Date();
  try {
    const bizhawkPath = getBizhawkPath();
    const bizhawkCwd = path.dirname(bizhawkPath);
    const luaPath = getLuaPath();
    const params = ["--lua=" + luaPath, "--url_get=localhost:47911/bizhawk"];

    const proc = ChildProcess.spawn(bizhawkPath, params, { windowsHide: true, env: process.env, cwd: bizhawkCwd });

    proc.stdout.on('data', (data) => {
      // bizhawkLog(launchTime, data.toString('utf8'));
    });

    proc.stderr.on('data', (data) => {
      // bizhawkLog(launchTime, data.toString('utf8'));
    });

    proc.on('close', (code, signal) => {
      // bizhawkLog(launchTime, `Bizhawk closed with ${Number.isInteger(code) ? 'code: ' + code : 'signal: ' + signal}`);
    });

    proc.on('exit', (code, signal) => {
      if (!launched) {
        return;
      }
      // bizhawkLog(launchTime, "Exited Bizhawk");
      cleanupBizhawk();
    });

    proc.on('error', (e) => {
      LOGGER.error("Bizhawk ran in to an error", e);
      // bizhawkLog(launchTime, err);

      if (!launched) {
        return;
      }
      cleanupBizhawk();
    });

    bizhawkProc = proc;
    // bizhawkLog(launchTime, "Started Bizhawk", bizhawkPath, ...params)
  }
  catch (e) {
    LOGGER.error("Starting Bizhawk failed: %s", e);
    cleanupBizhawk();
  }
}

function getLuaPath() {
  return PathUtils.pathRelativeToWorkspaceRoot("lua", "random-rom.lua");
}

function cleanupBizhawk() {
  launched = false;
  clearQueue();
  bizhawkProc = undefined;
}

function hashGame(game: GameData) {
  return crypto.createHash('md5').update(game.absoluteFilePath).digest('hex');
}

/************************************************************************
 *  Bizhawk health method
 *
 * The reason for this function is that sometimes, Bizhawk failes to load
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
  LOGGER.info("Starting health check timeout");
  const timeout = setTimeout(() => {
    bizhawkHealthTimeout(game, restartCycleCount, process);
    // Give longer timeout if we're in a restart, cause we gotta start the Bizhawk process too
  }, 5_000 + (restartCycleCount ? 3_000 : 0));
  healthCheckTimeout = timeout;
}

export function bizhawkPong() {
  LOGGER.info("Bizhawk pong. Health check passed");
  if (healthCheckTimeout) {
    clearTimeout(healthCheckTimeout);
  }
  healthCheckTimeout = undefined;
}

async function bizhawkHealthTimeout(game: GameData, restartCycleCount: number, process: ChildProcess.ChildProcess) {
  restartCycleCount++;
  LOGGER.error("Bizhawk failed health check after loading game " + game.absoluteFilePath);

  LOGGER.warn("Removing save state");
  deleteStateIfExists(game);

  // Setup  bizhawk to restart on close, since we've removed the save state
  // Use setImmediate to not spawn a new bizhawk inside the callback
  process.on('close', () => {
    setImmediate(() => {
      if (restartCycleCount > 3) {
        LOGGER.error("Aborting restart cycle. Permanently failed to start Bizhawk for game: " + game.absoluteFilePath);
        return;
      }
      LOGGER.info("Relauncing bizhawk. Attempt: " + restartCycleCount);
      intenalLaunchBizhawk();
      LOGGER.info("Reloading game " + game.name);
      internalLoadGame(game, restartCycleCount);
    });
  });

  LOGGER.warn("Killing bizhawk process");
  process.kill();
}
