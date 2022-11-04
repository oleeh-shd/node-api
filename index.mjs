import { createServer, prepare } from "./http-server.mjs";

const dir = await prepare();
await createServer(dir);
