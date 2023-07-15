import net from 'node:net';
import { Socket } from 'node:net';
import { EOClient } from './eo-client';
import { PacketProcessor } from './packet/packet-processor';
import { Packet } from './packet/packet';
import { encodeNumber, prettifyPacket } from './packet/packet-utils';
import { PacketAction } from './packet/packet-action';
import { PacketFamily } from './packet/packet-family'

export class ProxyServer {
  #server
  port: number
  host: string
  packetProcessor: PacketProcessor
  socket: Socket = new Socket()
  client: EOClient | null

  constructor(packetProcessor: PacketProcessor) {
    this.#server = new net.Server();
    this.port = Number(process.env.SERVER_PORT) ?? 8078;
    this.host = process.env.SERVER_HOST ?? '127.0.0.1';
    this.packetProcessor = packetProcessor;
    this.client = null;
  }

  listen(onConnect: () => void, client: EOClient) {
    this.#server.listen(this.port, this.host, () => {
      console.log(`eoproxy-ts is running on port ${this.port}`);
      onConnect();
    });
    
    this.#server.on('connection', (socket) => {
      console.log('successfully connected.');
      this.socket = socket;
      client.socket = socket;
      this.client = client;

      socket.on('data', (buffer: Buffer) => {
        this.handlePacket(buffer, client);
      });
    
      socket.on('close', () => {
        console.log(`Connection closed: ${socket.remoteAddress} ${socket.remotePort}`);
        client.client.destroy();
      });
    });
  }  
  
  handlePacket(buffer: Buffer, client: EOClient) {
    const rawData = buffer.slice(2, buffer.length);
    const decodedPacket = new Packet(this.packetProcessor.decode(rawData, true));
    const encodedPacket = this.packetProcessor.encode(decodedPacket.buffer, true);
    this.client.client.write(encodedPacket);

    this.scrapePacket(decodedPacket, client);

    const prettyBytes = prettifyPacket(decodedPacket.buffer);
    const prettyBytes2 = prettifyPacket(encodedPacket);
    console.log(`[Client] ${decodedPacket.getPacketType()}:\n${prettyBytes}`);
    console.log(`[Client]:\n${prettyBytes2}`);
  }

  scrapePacket = (packet: Packet, client: EOClient) => {
    if (
      !this.packetProcessor.hasEncryption()
      && packet.buffer[0] === PacketAction.Init
      && packet.buffer[1] === PacketFamily.Init
    ) {
      const packetData = new Packet(packet.buffer.slice(2, packet.buffer.length));
      const challenge = packetData.reader.getThree();
      this.packetProcessor.setChallenge(challenge);
    }
  
    if (
      this.packetProcessor.hasEncryption() 
      && packet.buffer[0] === PacketAction.Request
      && packet.buffer[1] === PacketFamily.Welcome
    ) {
      const packetData = new Packet(packet.buffer.slice(3, packet.buffer.length));
      packetData.reader.getInt();
      const encryptionValue = packetData.reader.getChar();
      this.packetProcessor.setClientEncryption(encryptionValue);
    }
  }
}
