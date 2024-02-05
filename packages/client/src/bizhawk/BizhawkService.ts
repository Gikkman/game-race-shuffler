import { existsSync, unlinkSync } from 'graceful-fs';
import { dialog } from 'electron';
import { info, err, bizhawkLog } from '@shared/Log';
import * as Location from '@shared/Location';
import { GameData } from '@models/GameData';
import * as ChildProcess from 'child_process';
import * as ElectronWindow from '../common/ElectronWindow';
import * as ConfigService from '../config/ConfigService';
import { ConfigKey, getGameRoot } from '../config/ConfigService';
import FileSyncer from '@backend/common/FileSyncer';
import { Bus, WindowName } from '@shared/Bus';
import ConsoleService from '@backend/game/ConsoleService';
import { join, dirname } from 'path';
import FunctionUtil from '@backend/common/FunctionUtil';

/************************************************************************
 *  Variables
 ************************************************************************/
const BLANK_GAME: GameData = {id: 0, file: "", hash: "", title: "", relative_path: "", completed: null};
let queue : BizhawkEvent[] = [];
let bizhawkProc: ChildProcess.ChildProcess;
let healthCheckTimeout: NodeJS.Timeout;
enum BizhawkAction {
    PAUSE = "PAUS",
    SAVE = "SAVE",
    LOAD = "LOAD",
    GAME = "GAME",
    CONTINUE = "CONT",
    QUIT = "QUIT",
    PING = "PING",
}

interface BizhawkEvent {
    action: string,
    path: string
}

const saveStateExtension = ".State";

const gameFileSync = new FileSyncer("Title.txt", () => currentGame.title );
const consoleFileSync = new FileSyncer("Console.txt", () => ConsoleService.findById(currentGame.console_id)?.name ?? "" );
/************************************************************************
 *  Export
 ************************************************************************/
let currentGame = BLANK_GAME;
let bizhawkMuted = false;

export function muteBizhawk() {
    if(bizhawkMuted) return info("Mute request, but was already muted. Skipping");

    info("Mute action queued");
    bizhawkMuted = true;
    pushBizhawkEventQueue(BizhawkAction.PAUSE);
}

export function unmuteBizhawk() {
    info("Unmute action queued");
    bizhawkMuted = false;
    pushBizhawkEventQueue(BizhawkAction.CONTINUE);
}

export function loadGame(game: GameData) {
    info("Load request. Game: "  + game.file);
    internalLoadGame(game).then( () => {
        gameFileSync.update();
        consoleFileSync.update();
    })
    Bus.windowSend(WindowName.Main).send("game-loaded", game);
}

export async function saveAndQuit() {
    info("Save and Quit requested");
    saveStateIfRunning(currentGame);
    await FunctionUtil.sleep(500);
    pushBizhawkEventQueue(BizhawkAction.QUIT);
}

export function clearQueue() : void {
    currentGame = BLANK_GAME;
    while(queue.length > 0) queue.shift();
}

export function peekBizhawkEventQueue() : BizhawkEvent {
    return queue[0];
}

export function popBizhawkEventQueue() : BizhawkEvent {
    return queue.shift();
}

export function launchBizhawk() {
    intenalLaunchBizhawk();
}

/************************************************************************
 *  Bizhawk manipulation methods
 ************************************************************************/
async function internalLoadGame(newGame: GameData, restartCycleCount = 0) {
    let gameRoot = getGameRoot();
    let newPath = join(gameRoot, newGame.relative_path);
    if(newGame.hash === currentGame.hash) {
        info("Skipping load. Same game already loaded");
        pushBizhawkEventQueue(BizhawkAction.CONTINUE); // The game might be paused from an external call
        return;
    } else {
        info("Loading game: " + newPath);
    }
    muteBizhawk();
    saveStateIfRunning(currentGame);
    await FunctionUtil.sleep(500);
    pushBizhawkEventQueue(BizhawkAction.GAME, newPath);
    await FunctionUtil.sleep(500);
    loadStateIfExists(newGame);
    unmuteBizhawk();

    currentGame = newGame;
    checkBizhawkHealth(newGame, restartCycleCount);
}

function saveStateIfRunning(file: GameData) {
    if(file !== BLANK_GAME) {
        let stateLocation = ConfigService.getSaveStateLocation(file.hash) + saveStateExtension;
        pushBizhawkEventQueue(BizhawkAction.SAVE, stateLocation);
    } else {
        info("No game currently loaded. Skipping saving");
    }
}

function loadStateIfExists(file: GameData) {
    let stateLocation = ConfigService.getSaveStateLocation(file.hash) + saveStateExtension;
    if(existsSync(stateLocation)) {
        pushBizhawkEventQueue(BizhawkAction.LOAD, stateLocation);
    } else {
        info("No save state existed. Skipping loading");
    }
}

function deleteStateIfExists(file: GameData) {
    let stateLocation = ConfigService.getSaveStateLocation(file.hash) + saveStateExtension;
    if(existsSync(stateLocation)) {
        unlinkSync(stateLocation);
        info("Deleted save state from " + stateLocation);
    } else {
        info("No save state to delete at " + stateLocation);
    }
}

function pushBizhawkEventQueue(action: BizhawkAction, path: string = "") {
    let event = {
        action: action,
        path: path
    };
    queue.push(event);
}

/************************************************************************
 *  Bizhawk path methods
 ************************************************************************/
function getBizhawkPath() {
    let bizhawkPath = ConfigService.getConfig(ConfigKey.BIZHAWK_PATH, '');
    if(!bizhawkPath) {
        bizhawkPath = resolveBizhawkPath();
    }
    return bizhawkPath;
}

export function resolveBizhawkPath() {
    const window = ElectronWindow.getMainWindow();

    let path = dialog.showOpenDialogSync(
        window,
        {
            title: "Select EmuHawk.exe",
            buttonLabel: "Select",
            filters: [{name: "Executables", extensions: ["exe"]}, {name: "All Files", extensions:['*']}],
            properties: ['openFile']
        });
    const bizhawkPath = path[0];

    // If no choice was made, bizhawk path will be empty and we return an empty string
    if(!bizhawkPath) {
       return '';
    }
    if(!validateBizhawkPath(bizhawkPath)) {
        throw "Please chose a file named 'EmuHawk.exe'";
    }
    ConfigService.setConfig(ConfigKey.BIZHAWK_PATH, bizhawkPath);

    return bizhawkPath;
}

function validateBizhawkPath(path: string) {
    if(!path.endsWith("EmuHawk.exe")){
        err("Invalid file chosen: " + path);
        return false;
    }
    return true;
}

/************************************************************************
 *  Bizhawk launch methods
 ************************************************************************/
let launched = false;
let launchTime: Date;
function intenalLaunchBizhawk() {
    if(launched) return;
        launched = true;

    launchTime = new Date();
    try {
        let bizhawkPath = getBizhawkPath();
        let bizhawkCwd = dirname(bizhawkPath);
        let luaPath = getLuaPath();
        let params = ["--lua=" + luaPath, "--url_get=localhost:47911/bizhawk"];

        const proc = ChildProcess.spawn(bizhawkPath, params, {windowsHide: true, env: process.env, cwd: bizhawkCwd});
        proc.stdout.on('data', (data) => {
            // bizhawkLog(launchTime, data.toString('utf8'));
        });
        proc.stderr.on('data', (data) => {
            // bizhawkLog(launchTime, data.toString('utf8'));
        })

        proc.on('close', (code, signal) => {
            bizhawkLog(launchTime, `Bizhawk closed with ${Number.isInteger(code) ? 'code: ' + code : 'signal: ' + signal}`);
        });
        proc.on('exit', (code, signal) => {
            if(!launched) return;
            bizhawkLog(launchTime, "Exited Bizhawk");
            cleanupBizhawk(code, signal);
        });
        proc.on('error', (e) => {
            err(e);
            bizhawkLog(launchTime, err);

            if(!launched) return;
            cleanupBizhawk(e);
        });
        bizhawkProc = proc;
        Bus.windowSend(WindowName.Main).send("bizhawk-opened");
        bizhawkLog(launchTime, "Started Bizhawk", bizhawkPath, ...params)
    } catch(e) {
        err(e);
        cleanupBizhawk(e);
    }
}

function getLuaPath() {
    return Location.resourceLocation("lua", "random-rom.lua");
}

function cleanupBizhawk(...arg: any) {
    launched = false;
    clearQueue();
    Bus.windowSend(WindowName.Main).send("bizhawk-closed");
    bizhawkProc = undefined;
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
function checkBizhawkHealth(game: GameData, restartCycleCount: number) {
    if(!bizhawkProc) return; // In case we loaded a game with bizhawk closed

    pushBizhawkEventQueue(BizhawkAction.PING);
    info("Starting health check timeout")
    const timeout = setTimeout(() => {
        bizhawkHealthTimeout(game, restartCycleCount);
    // Give longer timeout if we're in a restart, cause we gotta start the Bizhawk process too
    }, 5_000 + (restartCycleCount ? 3_000 : 0) );
    healthCheckTimeout = timeout;
}

export function bizhawkPong() {
    info("Bizhawk pong. Health check passed");
    if(healthCheckTimeout)
        clearTimeout(healthCheckTimeout);
    healthCheckTimeout = undefined;
}

async function bizhawkHealthTimeout(game: GameData, restartCycleCount: number) {
    restartCycleCount++;
    info("Bizhawk failed health check after loading game " + game.title)

    info("Removing save state");
    deleteStateIfExists(game);

    // Setup  bizhawk to restart on close, since we've removed the save state
    // Use a timeout to not spawn a new bizhawk inside the callback
    bizhawkProc.on('close', () => {
        setTimeout(() => {
            if(restartCycleCount > 3) {
                err("Aborting restart cycle. Permanently failed to start Bizhawk for game: " + game.relative_path);
                return;
            }
            info("Relauncing bizhawk. Attempt: " + restartCycleCount);
            intenalLaunchBizhawk();
            info("Reloading game " + game.title);
            internalLoadGame(game, restartCycleCount);
        }, 0);
    })

    info("Killing bizhawk process")
    bizhawkProc.kill();
}
