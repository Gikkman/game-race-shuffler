export function sleep(timeoutMs: number) {
  return new Promise<void>(res => {
    setTimeout(() => {
      res();
    }, timeoutMs);
  });
}

export function calculateLogicalName(name: string): string {
  return name
    .toLocaleLowerCase()
    .replaceAll(/[0-9]+/g, (s) => numberToRoman(s))
    .replaceAll(/[^\d\w]/g, "");
}

function numberToRoman(s: string) {
  switch(s) {
  case '1': return 'i';
  case '2': return 'ii';
  case '3': return 'iii';
  case '4': return 'iv';
  case '5': return 'v';
  case '6': return 'vi';
  case '7': return 'vii';
  case '8': return 'viii';
  case '9': return 'ix';
  case '10': return 'x';
  case '11': return 'xi';
  case '12': return 'xii';
  case '13': return 'xiii';
  case '14': return 'xiv';
  case '15': return 'xv';
  case '16': return 'xvi';
  case '17': return 'xvii';
  case '18': return 'xviii';
  case '19': return 'xix';
  case '20': return 'xx';
  case '21': return 'xxi';
  case '22': return 'xxii';
  case '23': return 'xxiii';
  case '24': return 'xxiv';
  case '25': return 'xxv';
  default: return s;
  }
}

export function isSecureHost(host: string): boolean {
  return (host.startsWith("localhost") || host.startsWith("10.") || host.startsWith("172.") || host.startsWith("192.168.")) ? false : true;
}
