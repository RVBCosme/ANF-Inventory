import path from "node:path";
import { openDb } from "./db";
import { ensureDataDirs } from "./lib/files";
import { createApp } from "./app";
import { purgeOldRecords } from "./services/retention";

const PORT = Number(process.env.PORT ?? 4000);
const dataDir = path.resolve(__dirname, "..", "data");

ensureDataDirs(dataDir);
const db = openDb(path.join(dataDir, "anf.db"));

// Purge on startup, then once a day while running.
purgeOldRecords(db, dataDir);
setInterval(() => purgeOldRecords(db, dataDir), 24 * 60 * 60 * 1000);

const app = createApp(db, dataDir);
app.listen(PORT, () => {
  console.log(`ANF Inventory running at http://localhost:${PORT}`);
});
