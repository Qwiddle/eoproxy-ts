import { Socket } from 'node:net';
import { Packet } from './packet/packet';
import { PacketProcessor } from './packet/packet-processor';
import { prettifyPacket } from './packet/packet-utils';
import { PacketAction } from './packet/packet-action';
import { PacketFamily } from './packet/packet-family';

export class EOClient {
  client: Socket
  host: string
  port: number
  packetProcessor: PacketProcessor
  socket: Socket

  constructor(packetProcessor: PacketProcessor) {
    this.client = new Socket();
    this.socket = new Socket();
    this.packetProcessor = packetProcessor;
    this.port = Number(process.env.CLIENT_PORT) ?? 8078;
    this.host = process.env.CLIENT_HOST ?? 'game.endless-online.com';
  }

  connect() {
    this.client.connect(this.port, this.host, () => {
      console.log(`Connected to: ${this.host}.`);
    });

    this.client.on('data', (buffer: Buffer) => {
      this.handlePacket(buffer);
    })
  };

  scrapePacket = (packet: Packet) => {
    if (
      !this.packetProcessor.hasEncryption()
      && packet.buffer[0] === PacketAction.Init
      && packet.buffer[1] === PacketFamily.Init
    ) {
      const slicedPacket = new Packet(packet.buffer.slice(2, packet.buffer.length));
      const initReply = slicedPacket.reader.getByte();
  
      if(initReply == 2) {
        const seq1 = slicedPacket.reader.getByte();
        const seq2 = slicedPacket.reader.getByte();
        const serverEncVal = slicedPacket.reader.getShort();
        const clientEncVal = slicedPacket.reader.getShort();
        const sequenceStart = seq1 * 7 + seq2 - 13;

        this.packetProcessor.setSequence(sequenceStart);
        this.packetProcessor.setEncryptionFromInit(serverEncVal, clientEncVal);
      }
    }
  
    if(
      this.packetProcessor.hasEncryption() 
      && packet.buffer[0] == PacketAction.Accept
      && packet.buffer[1] == PacketFamily.Welcome
    ) {
      const packetData = new Packet(packet.buffer.slice(2, packet.buffer.length));
      const encryptionValue = packetData.reader.getChar();
      this.packetProcessor.setServerEncryption(encryptionValue);
    }

    if (
      packet.buffer[0] === PacketAction.Player
      && packet.buffer[1] === PacketFamily.Connection
    ) {
      const packetData = new Packet(packet.buffer.slice(2, packet.buffer.length));
      const seq1 = packetData.reader.getShort();
      const seq2 = packetData.reader.getChar();

      const sequenceStart = seq1 - seq2;

      this.packetProcessor.setSequence(sequenceStart)
    }
  }

  handlePacket(buffer: Buffer) {
    const rawData = buffer.slice(2, buffer.length);
    const decodedPacket = new Packet(this.packetProcessor.decode(rawData, false));
    this.scrapePacket(decodedPacket);

    const prettyBytes = prettifyPacket(decodedPacket.buffer);
    console.log(`[Server] ${decodedPacket.getPacketType()}:\n${prettyBytes}`);

    this.socket.write(buffer);
  }
}