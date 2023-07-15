import { encodeNumber } from "./packet-utils";

export class PacketProcessor {
  #challenge = -1;
  #serverEncVal = -1;
  #clientEncVal = -1;
  #sequence = 0;
  #sequenceCounter = 1;

  hasEncryption() {
    return this.#clientEncVal >= 0 && this.#serverEncVal >= 0;
  }

  setChallenge(challenge: number) {
    this.#challenge = challenge;
  }

  setClientEncryption(n: number) {
    this.#clientEncVal += n;
    console.log('client encryption set,', this.#clientEncVal);
  }

  setServerEncryption(n: number) {
    this.#serverEncVal += n + this.#clientEncVal % 50;
    console.log('server encryption set,', this.#serverEncVal);
  }

  setEncryptionFromInit(serverEncVal: number, clientEncVal: number) {
    if(this.#challenge < 0) {
      throw new Error('Challenge has not been set');
    }

    this.#serverEncVal = serverEncVal;
    this.#clientEncVal = clientEncVal += this.#challenge % 11;
  }

  setSequence(sequenceStart: number) {
    this.#sequence = sequenceStart;
    //this.#sequenceCounter = 1;
  }

  nextSequence() {
    if(++this.#sequenceCounter > 10) {
      this.#sequenceCounter = 1;
    }
    return this.#sequence + this.#sequenceCounter;
  }

  decode(packet: Buffer, isClient: boolean) {
    let data: Uint8Array = Uint8Array.from(packet);

    if(data[0] == 255 && data[1] == 255) {
      return packet;
    }

    if(!this.hasEncryption()) {
      throw new Error('Encryption parameters not set');
    }

    const decVal = isClient ? this.#clientEncVal : this.#serverEncVal;

    const decKeyTable = [
      (i: number) => + (i + 0x74),
      () => -Math.floor(decVal / 253),
      () => +((decVal - 1) % 253),
    ];

    for (let i = 1; i < data.length; i++) {
      let val = data[i - 1];
      val = (val + decKeyTable[i % 3](i)) & 0xFF;
      data[i - 1] = val;
    }

    return Buffer.from(data);
  }

  encode(packet: Buffer, isClient: boolean) {
    let data: Uint8Array = Uint8Array.from(packet);

    const packetHeader = data.slice(0, 2);
    const packetData = data.slice(2, data.length);
    const packetWithLength = Uint8Array.from([...encodeNumber(packet.length), ...packet]);

    if(data[0] == 255 && data[1] == 255) {
      return Buffer.from(packetWithLength);
    }

    if(!this.hasEncryption()) {
      throw new Error('Encryption parameters not set');
    }

    const packetWithoutSequence = packetData.slice(1, packetData.length);
    const newPacket = isClient ? Uint8Array.from([...packetHeader, this.nextSequence(), ...packetWithoutSequence])
      : Uint8Array.from([...packetHeader, ...packetData]);

    data = newPacket;

    const encVal = isClient ? this.#clientEncVal : this.#serverEncVal;

    const encKeyTable = [
      (i: number) => -(i + 0x74),
      () => +Math.floor(encVal / 253),
      () => -((encVal - 1) % 253),
    ];

    for (let i = 1; i < data.length; i++) {
      let val = data[i - 1];
      val = (val + encKeyTable[i % 3](i)) & 0xFF;
      data[i - 1] = val;
    }

    return Buffer.from([...encodeNumber(data.length), ...data]);
  }
}