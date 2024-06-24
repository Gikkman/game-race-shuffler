import { CreateRoomRequest, RaceAdminAction, RoomOverview } from "@grs/shared";

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

export async function startRace(data: {adminKey: string, roomName: string}): Promise<boolean> {
  const {adminKey, roomName} = data;
  const body: RaceAdminAction = {
    adminKey,
    roomName,
    command: {
      action: "changeRacePhase",
      phase: "ACTIVE"
    }
  };
  const res = await fetch(`/api/room/${roomName}/admin`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.ok;
}

export async function swapGame(data: {adminKey: string, roomName: string}): Promise<boolean> {
  const {adminKey, roomName} = data;
  const body: RaceAdminAction = {
    adminKey,
    roomName,
    command: {
      action: "swapRandomGame",
    }
  };
  const res = await fetch(`/api/room/${data.roomName}/admin`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.ok;
}
