type AdminKeyFormat = {
  adminKey: string,
  storeUntil: number,
}

export function getAdminKey(roomName: string): string|undefined {
  const stored = localStorage.getItem(roomName);
  if(stored) {
    const json: AdminKeyFormat = JSON.parse(stored);
    return json.storeUntil > Date.now() ? json.adminKey : undefined;
  }
  return undefined;
}

export function storeAdminKey(roomName: string, adminKey: string) {
  const storeUntil = Date.now() + (24 * 60 * 60 * 1000);
  const data: AdminKeyFormat = {adminKey, storeUntil};
  localStorage.setItem(roomName, JSON.stringify(data));
}
