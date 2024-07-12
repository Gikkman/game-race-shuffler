import { Logger, PathUtils } from "@grs/shared";
import { RoomStateData } from "./RoomState.js";
import Datastore from "nedb-promises";

const LOGGER = Logger.getLogger("RoomArchive");
let db: Datastore<RoomStateData>;
let initialized = false;

export default {
  init,
  getAll,
  create,
};
/************************************************************************
*  Exported functions
************************************************************************/
async function init() {
  if(initialized) {
    return;
  }

  const roomDbPath = PathUtils.pathRelativeToWorkspaceRoot("room-archive.db");
  db = Datastore.create({filename: roomDbPath});
  LOGGER.debug("Db initialized at %s", roomDbPath);

  initialized = true;
}

async function getAll(): Promise<RoomStateData[]> {
  checkInitialized();
  return db.find({});
}

async function create(data: RoomStateData) {
  checkInitialized();
  return db.insert(data);
}

/************************************************************************
*  Internal functions
************************************************************************/
function checkInitialized() {
  if (initialized) {
    return;
  }
  throw new Error(`Module 'RoomRepository' was called before it was initialized`);
}
