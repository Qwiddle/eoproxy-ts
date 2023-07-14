import { EOClient } from "./eo-client";
import { PacketProcessor } from "./packet/packet-processor";
import { ProxyServer } from "./proxy-server";

export class EOProxy {
  #packetProcessor: PacketProcessor
  #server: ProxyServer
  #client: EOClient

  constructor() {
    this.#packetProcessor = new PacketProcessor();
    this.#server = new ProxyServer(this.#packetProcessor);
    this.#client = new EOClient(this.#packetProcessor);
  }

  start() {
    this.#server.listen(() => this.#client.connect(), this.#client);
  }
}