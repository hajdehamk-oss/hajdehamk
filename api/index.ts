import { createServer } from "http";
import app from "../server/index.js";

const server = createServer(app);

export default server;
