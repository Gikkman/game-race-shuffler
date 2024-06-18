import { Logger, PathUtils } from "@grs/shared";
import { RoomStateData } from "./RoomState.js";
import Datastore from "nedb-promises";
import InternalMessages from "../InternalMessages.js";

const LOGGER = Logger.getLogger("RoomRepository");
let db: Datastore<RoomStateData>;
let initialized = false;

export default {
  init,
  getAll,
  create,
  update,
  remove,
};
/************************************************************************
*  Exported functions
************************************************************************/
async function init() {
  if(initialized) {
    return;
  }

  const roomDbPath = PathUtils.pathRelativeToWorkspaceRoot("rooms.db");
  db = Datastore.create({filename: roomDbPath});
  LOGGER.debug("Db created at %s", roomDbPath);

  InternalMessages().addListener("cleanupCron", () => {
    LOGGER.debug("Starting compaction");
    db.persistence.compactDatafile();
    LOGGER.debug("Completed compaction");
  });

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

async function update(data: RoomStateData) {
  checkInitialized();
  return db.updateOne({_id: data._id}, data);
}

async function remove(roomId: string) {
  checkInitialized();
  return db.deleteOne({_id: roomId}, {});
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
