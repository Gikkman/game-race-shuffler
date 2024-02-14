export function sleep(timeoutMs: number) {
  return new Promise<void>(res => {
    setTimeout(() => {
      res();
    }, timeoutMs);
  });
}
