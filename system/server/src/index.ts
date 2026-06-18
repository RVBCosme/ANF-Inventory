import path from "node:path";
import { openDb } from "./db";
import { ensureDataDirs } from "./lib/files";
import { createApp } from "./app";
import { purgeOldRecords } from "./services/retention";
import { loadCatalogue, seedProducts } from "./seed";

const PORT = Number(process.env.PORT ?? 4000);
const dataDir = path.resolve(__dirname, "..", "data");

ensureDataDirs(dataDir);
const db = openDb(path.join(dataDir, "anf.db"));

// First run only: populate an empty database with the shipped product list
// (names + categories, no price or stock). Existing installs are untouched.
const seeded = seedProducts(db, loadCatalogue(), new Date().toISOString());
if (seeded > 0) console.log(`Seeded ${seeded} products from the catalogue.`);

// Purge on startup, then once a day while running.
purgeOldRecords(db, dataDir);
setInterval(() => purgeOldRecords(db, dataDir), 24 * 60 * 60 * 1000);

const app = createApp(db, dataDir);
app.listen(PORT, () => {
  console.log(`ANF Inventory running at http://localhost:${PORT}`);
});
