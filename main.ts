import { Actor } from "apify";
import { setupAndStartServer } from "./src/server.js";

await Actor.init();

setupAndStartServer();

await new Promise((res) => setTimeout(res, 999999)); // Keep the server running for a while

await Actor.exit();

