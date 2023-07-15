export const CHAR_MAX = 253;
export const SHORT_MAX = CHAR_MAX * CHAR_MAX;
export const THREE_MAX = CHAR_MAX * CHAR_MAX * CHAR_MAX;
export const INT_MAX = CHAR_MAX * CHAR_MAX * CHAR_MAX * CHAR_MAX;

export const prettifyPacket = (buffer: Buffer) => {
  return Uint8Array
    .from(buffer)
    .reduce((a, c, i) => a + (i > 0 ? '_' : '') + (c == null ? '' : c), '');
}

export const encodeNumber = (_number: number) => {
  let value = _number;
  let d = 0xfe;
  if (_number >= THREE_MAX) {
    d = Math.trunc(value / THREE_MAX) + 1;
    value = value % THREE_MAX;
  }

  let c = 0xfe;
  if (_number >= SHORT_MAX) {
    c = Math.trunc(value / SHORT_MAX) + 1;
    value = value % SHORT_MAX;
  }

  let b = 0xfe;
  if (_number >= CHAR_MAX) {
    b = Math.trunc(value / CHAR_MAX) + 1;
    value = value % CHAR_MAX;
  }

  let a = value + 1;

  return new Uint8Array([a, b]);
}