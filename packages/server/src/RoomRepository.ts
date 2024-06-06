import { PathUtils } from "@grs/shared";
import { RoomStateData } from "./RoomState.js";
import Datastore from "nedb-promises";

let db: Datastore<RoomStateData>;
let initialized = false;

export default {
  init,
  getAll,
  create,
  update
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
  db.persistence.setAutocompactionInterval(10*60*1000);

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

/************************************************************************
*  Internal functions
************************************************************************/
function checkInitialized() {
  if (initialized) {
    return;
  }
  throw new Error(`Module 'RoomRepository' was called before it was initialized`);
}
