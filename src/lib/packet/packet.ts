import { EoReader } from "eolib";
import { PacketAction } from "./packet-action";
import { PacketFamily } from "./packet-family";

export class Packet {
  action;
  family;
  buffer: Buffer;
  reader: EoReader;

  constructor(data: Buffer) {
    if(data.length < 2) {
      console.error('Received empty packet.');
    }

    this.buffer = data;
    this.action = PacketAction[this.buffer[0]];
    this.family = PacketFamily[this.buffer[1]];
    this.reader = new EoReader(data);
  }

  getPacketType() {
    return `${this.family}_${this.action}`
  }
}