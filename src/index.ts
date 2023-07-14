import net from 'node:net';
import { config } from 'dotenv';
import { EOProxy } from './lib/eo-proxy';

config();

const eoProxy = new EOProxy();
eoProxy.start();