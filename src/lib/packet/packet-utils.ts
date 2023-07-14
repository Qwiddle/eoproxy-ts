export const prettifyPacket = (buffer: Buffer) => {
  return Uint8Array
    .from(buffer)
    .reduce((a, c, i) => a + (i > 0 ? '_' : '') + (c == null ? '' : c), '');
}