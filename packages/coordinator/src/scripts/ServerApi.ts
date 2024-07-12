import { CreateRoomRequest, DeleteRoomRequest, RaceAdminAction, RaceAdminChangeRacePhase, RaceAdminCompleteGame, RaceAdminSwapToGame, RaceAdminUncompleteGame, RoomOverview } from "@grs/shared";

export async function getRoomList(): Promise<string[]> {
  const res = await fetch("/api/room");
  return res.json();
}

export async function getRoom(roomName: string): Promise<RoomOverview> {
  const res = await fetch("/api/room/" + roomName);
  return res.json();
}

export async function createRoom(data: CreateRoomRequest): Promise<{ adminKey: string } | false> {
  return fetch("/api/room", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(async res => {
      if (res.ok) {
        return res.json();
      }
      else {
        throw await res.text();
      }
    })
    .then(res => {
      if (res && typeof res === "object" && 'adminKey' in res) {
        return res;
      }
      return false;
    })
    .catch(ex => {
      alert(ex);
      return false;
    });
}

export async function changePhase(data: RaceAdminChangeRacePhase): Promise<boolean> {
  return apiCall("/admin-set-phase", "POST", data);
}

export async function swapGame(data: RaceAdminAction): Promise<boolean> {
  return apiCall("/admin-shuffle-game", "POST", data);
}

export async function setGame(data: RaceAdminSwapToGame): Promise<boolean> {
  return apiCall("/admin-set-game", "POST", data);
}

export async function completeGame(data: RaceAdminCompleteGame): Promise<boolean> {
  return apiCall("/admin-complete-game", "POST", data);
}

export async function uncompleteGame(data: RaceAdminUncompleteGame): Promise<boolean> {
  return apiCall("/admin-uncomplete-game", "POST", data);
}

export async function archiveRoom(data: DeleteRoomRequest): Promise<boolean> {
  return apiCall("/", "DELETE", data);
}

export async function clearSwapQueue(data: RaceAdminAction): Promise<boolean> {
  return apiCall("/admin-clear-swap-queue", "POST", data);
}

export async function clearBlockTimer(data: RaceAdminAction): Promise<boolean> {
  return apiCall("/admin-clear-block-timer", "POST", data);
}

export async function setBlockTimer(data: RaceAdminAction): Promise<boolean> {
  return apiCall("/admin-set-block-timer", "POST", data);
}

async function apiCall<T extends RaceAdminAction>(apiPath: string, method: "GET"|"POST"|"DELETE", data: T): Promise<boolean> {
  const reqPath = `/api/room/${data.roomName}${apiPath}`;
  return fetch(reqPath, {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(res => {
      if(res.ok) {
        return true;
      }
      else {
        console.warn(`Call to ${reqPath} returned status ${res.status} and message:`);
        console.warn(res.body);
        return false;
      }
    })
    .catch(ex => {
      console.warn(`Call to ${reqPath} failed:`);
      console.warn(ex);
      return false;
    });
}
