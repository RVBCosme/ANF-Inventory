# ANF Inventory System — User Manual

A simple, no-login inventory program that runs entirely on **one Windows computer**.
You manage products, add stock (backed by a receipt), place orders that draw down
stock and print a PDF, and review a plain-language history of everything you did.

There is **no internet, no cloud, and no account** — your data stays on this machine.

---

## Table of contents

1. [Quick start (daily use)](#1-quick-start-daily-use)
2. [What you need (first time only)](#2-what-you-need-first-time-only)
3. [First-time setup](#3-first-time-setup)
4. [Starting and stopping the system](#4-starting-and-stopping-the-system)
5. [Using the app](#5-using-the-app)
   - [Products tab](#products-tab)
   - [Receive Stock tab](#receive-stock-tab)
   - [New Order tab](#new-order-tab)
   - [History tab](#history-tab)
6. [Where your data lives & backups](#6-where-your-data-lives--backups)
7. [Automatic 1-year cleanup](#7-automatic-1-year-cleanup)
8. [Troubleshooting](#8-troubleshooting)
9. [For maintainers (developer reference)](#9-for-maintainers-developer-reference)

---

## 1. Quick start (daily use)

> **Double-click `system\Start ANF Inventory.bat`.**

Your web browser opens to ANF Inventory automatically.

**The very first time** (and after an update), a **"Setting up for first use…"** page appears for **a few minutes** while it installs and prepares everything — this is normal. ANF Inventory then opens by itself; you can close the setup page once it does. After that first time, it opens in seconds.

A small **"ANF Inventory - keep this open"** window stays minimized while you work. **To stop the system, close that window** (or double-click `Stop ANF Inventory.bat`).

💡 Make it easy: right-click `Start ANF Inventory.bat` → **Send to → Desktop (create shortcut)**, then rename the shortcut **"ANF Inventory"**.

---

## 2. What you need (first time only)

| Requirement | Notes |
|-------------|-------|
| **Windows** | Built and tested on Windows 11. |
| **Node.js 20 or newer** | This is the engine that runs the program. Verified on Node **22**. Download the **LTS** installer from <https://nodejs.org> and run it with the default options. |

`npm` (the installer tool) comes bundled with Node.js — you don't install it separately.

To confirm Node is installed, open **PowerShell** and run:

```powershell
node -v
npm -v
```

You should see version numbers (for example `v22.22.2` and `10.9.7`).

---

## 3. First-time setup

**There's nothing to set up by hand.** The first time you run the launcher it automatically installs and builds everything — that's the "Setting up for first use…" page. You just wait a few minutes.

The one requirement is **Node.js** (see [section 2](#2-what-you-need-first-time-only)). If it isn't installed, the launcher opens a page telling you exactly how to get it. Whoever sets up the computer installs Node.js once; after that the launcher handles the rest forever.

---

## 4. Starting and stopping the system

**Start:** double-click `system\Start ANF Inventory.bat`. The browser opens automatically (a short wait the first time — see [Quick start](#1-quick-start-daily-use)).

**Stop:** close the minimized **"ANF Inventory - keep this open"** window, or double-click **`system\Stop ANF Inventory.bat`**.

**Maintainer alternative:** from `system\`, `npm start` (after a build) still works and serves at http://localhost:4000.

---

## 5. Using the app

The app has four tabs across the top: **Products**, **Receive Stock**, **New Order**, and **History**.
Buttons and text are large and touch-friendly.

> 💵 **About prices:** Type prices in pesos, e.g. `12.50`. The app displays them
> formatted as **₱** automatically.

### Products tab

This is your catalog and stock list. Each row shows the ID, name, **category**, unit price,
and current stock. A stock of **0** is highlighted in red (**‼ 0**) so it's easy to spot.

| Action | How |
|--------|-----|
| **Find a product** | Type in the **"Find a product…"** box; the list filters as you type by **name, category, or ID**. |
| **Add a product** | Click **+ Add Product**, enter a name, unit price, and (optionally) a **category** — start typing to reuse an existing one — then **Save** and **Confirm**. |
| **Edit a product** | Click **Edit** on its row, change the name, price, or **category**, **Save**, then **Confirm**. |
| **Receive stock** | Go to the **Receive Stock** tab to add stock (see [Receive Stock tab](#receive-stock-tab)). |
| **Delete a product** | Click **Delete** and confirm. The product is hidden from your list, but **past orders that include it are kept**. |

### Receive Stock tab

This is where stock goes **up** — by receiving a delivery against a receipt.

**Receiving stock requires a receipt.** Stock can only go **up** through a receipt-backed
addition. Open the **Receive Stock** tab. Then:

- **Add each product** you received (search or filter by category, then click **Add**),
  and type the **quantity** for each.
- Attach **one receipt file** — a **JPG, PNG, or PDF**, up to **10 MB** — that covers the
  whole delivery.

Click **Receive Stock**, then **Yes, receive**. The receipt is saved, and **History**
shows one entry ("Stock added to N products …") with an **Open receipt** button.

### New Order tab

This is where stock goes **down** — by placing an order.

1. The page opens with **all your products listed** — just scroll and pick. To narrow the
   list, choose a **category** from the dropdown and/or type in the **search** box (it
   filters instantly by name or ID). The two combine — pick "Flags" and type "pole" to find
   just that.
2. Click **Add** next to a product to put it in the order. Out-of-stock items are shown
   but **cannot be added**.
3. In the order table, adjust quantities with the **−** and **+** buttons. You cannot set
   a quantity higher than the available stock. Use **Remove** to take an item out.
4. The **TOTAL** updates automatically.
5. Click **Place Order**, then **Confirm**. Stock is reduced accordingly.
6. A green **"Order #… placed"** banner appears with an **Open / Print PDF** button —
   click it to view and print the order receipt.

### History tab

A plain-language log of activity, newest first — products added or edited, stock
additions, orders placed, and deletions. Each entry shows the date/time and a short
description. Two dropdowns at the top filter the list:

- **Type** — show everything, or just one kind: Orders, New Product, Stock Added,
  Edited, or Deleted.
- **Time range** — Last 24 hours, 3 days, week, month, 3 months, 6 months, or All time.
  Ranges are rolling: "Last month" means the last 30 days; "All time" covers the last
  year (the length the app keeps history).

- Order entries have an **Open PDF** button (the printable order).
- Stock-addition entries have an **Open receipt** button (the file you uploaded).

If a filter still matches a lot, only the latest 100 entries show, with a note to
narrow the time range to see more.

---

## 6. Where your data lives & backups

All of your data is stored **on this computer**, inside:

```
system\server\data\
├─ anf.db          ← the database (products, stock, orders, history)
├─ receipts\       ← receipt files you uploaded when adding stock
└─ orders\         ← generated order PDFs
```

This `data` folder is created automatically the first time you run the program.

**To back up:** stop the system (close the minimized **"ANF Inventory - keep this open"** window, or double-click `Stop ANF Inventory.bat`), then copy the entire
`system\server\data` folder to a USB drive or another location. **To restore:** copy it
back to the same place. That folder is everything; nothing is stored online.

---

## 7. Automatic 1-year cleanup

To keep the system tidy, **activity older than 1 year (365 days) is removed automatically**:

- Old **orders**, **stock-addition records**, and **history log entries**, plus their
  associated **receipt and PDF files**, are deleted.
- Cleanup runs **when the program starts** and then **once a day** while it's running.

**What is kept:** your **products** and their **current stock** are never auto-deleted —
only the older *activity history* and its files are cleared. If you need to keep an order
PDF or receipt beyond 1 year, open it from the History tab and save or print a copy
before it ages out.

---

## 8. Troubleshooting

| Problem | What to do |
|---------|-----------|
| **Browser says "can't connect" / page won't load** | Make sure the minimized "ANF Inventory" window is still open. If it just started, wait a moment and **refresh**. If there's no window, run `Start ANF Inventory.bat` again. |
| **`'node' is not recognized`** when starting | Node.js isn't installed (or needs a restart). Install it from <https://nodejs.org> (see [section 2](#2-what-you-need-first-time-only)) and try again. |
| **The browser shows a "Setup couldn't finish" page** | Open the minimized "ANF Inventory" window, read the messages, and send them to your helper; then run `Start ANF Inventory.bat` again. |
| **"Receipt must be a JPG, PNG, or PDF file."** | Choose a supported file type when adding stock. |
| **"Receipt is too large (max 10 MB)."** | Use a smaller file (scan/photo under 10 MB). |
| **A product won't add to an order** | It's **out of stock**. Receive stock first from the **Receive Stock** tab. |
| **Port 4000 is already in use** | Another program (or a second copy of this one) is using the port. Close it, or start with a different port — see the maintainer section. |
| **Is the server actually running?** | Visit <http://localhost:4000/api/health>; it should show `{"ok":true}`. |

---

## 9. For maintainers (developer reference)

**Stack:** TypeScript everywhere — Express + better-sqlite3 (server), React + Tailwind +
Vite (web), with a shared package for types/schemas/money helpers. Money is stored as
integer **centavos** and only formatted as pesos at display.

### Project layout

```
ANF - Inventory System\        ← repo root (run git here)
├─ system\                     ← npm workspace root (run npm here)
│  ├─ Start ANF Inventory.bat  ← double-click launcher (auto-installs, builds, starts)
│  ├─ Stop ANF Inventory.bat   ← stops the running app (frees port 4000)
│  ├─ launcher\                ← launch.mjs, setup-check.mjs, health.mjs, and the splash/message HTML
│  ├─ start-anf.bat            ← back-compat shim → delegates to Start ANF Inventory.bat
│  ├─ package.json             ← workspace scripts (build, dev, start, test)
│  ├─ shared\                  ← shared types, Zod schemas, money helpers
│  ├─ server\                  ← Express API + SQLite + PDF generation
│  │  └─ data\                 ← runtime data (gitignored, auto-created)
│  └─ web\                     ← React UI (built into web\dist, served by the server)
├─ docs\                       ← spec & plan
├─ memory\                     ← ADRs, PRDs, sessions, learnings
└─ CLAUDE.md, *-CLAUDE.md      ← project & workflow instructions
```

### Commands (run from `system\`)

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies for all three packages. |
| `npm run build` | Build `shared` → `web` → `server` (required before `npm start`; the launcher `.bat` builds automatically). |
| `npm start` | Rebuild `shared`, then run the server at <http://localhost:4000> (serves the built UI). |
| `npm run dev` | Live-reload dev mode: server on **:4000** (tsx watch) and Vite UI on **http://localhost:5173** (proxies `/api` to :4000). Use this URL while developing. |
| `npm test` | Run all test suites (`shared`, `server`, `web`). Run before declaring work done. |

### Configuration

- **Port:** ANF uses **4000** when it's free, otherwise the next free port up to **4009** — so it
  coexists with another program already on 4000. The launcher opens the right one automatically.
  (Advanced: force a specific port with the `PORT` environment variable, e.g. in PowerShell:
  `$env:PORT = 4100; npm start`.)
- **Production serving:** when `web\dist` exists, the server serves the built UI and
  routes all non-`/api` paths to the single-page app — so one server at port 4000 serves
  both the API and the website.

### Data model & rules (at a glance)

- **Stock up** only via receipt-backed additions; **stock down** only via orders.
- **Products are soft-deleted** (hidden, `deleted_at` set) — historical orders keep the
  product name and price.
- All multi-step database writes run inside `better-sqlite3` **transactions**.
- **1-year (365-day) retention** (`server/src/services/retention.ts`) purges old orders,
  stock additions, and logs plus their files on startup and daily, and sweeps orphaned files.

### API endpoints

| Method & path | Purpose |
|---------------|---------|
| `GET /api/health` | Health check (`{ ok: true, app: "anf-inventory" }`). |
| `GET /api/products?query=` | List/search products (matches name, category, or ID). |
| `GET /api/products/categories` | Distinct non-empty categories, sorted. |
| `POST /api/products` | Create a product (optional `category`). |
| `PATCH /api/products/:id` | Edit name / unit price / category. |
| `DELETE /api/products/:id` | Soft-delete a product. |
| `POST /api/stock-receipts` | Receive stock for one or more products against a single receipt (multipart: `lines` JSON `[{product_id, quantity}]` + `receipt` file). |
| `POST /api/orders` | Place an order (`{ items: [{ product_id, quantity }] }`). |
| `GET /api/orders/:id/pdf` | Download an order's PDF. |
| `GET /api/receipts/:filename` | Download a stock receipt. |
| `GET /api/history?action=&range=&limit=` | Recent activity log. Optional `action` (`place_order`, `add_item`, `add_stock`, `edit_item`, `delete_item`) and `range` (`1d`, `3d`, `1w`, `1m`, `3m`, `6m`, `all`) filters; bad values fall back to all. |

### Publishing a release & installing on another PC (maintainers)

The end user never receives the development files (`docs/`, `memory/`, `*-CLAUDE.md`). They
clone a separate **public** repo that contains only the app. To publish the current code there:

> From the repo root: **`node scripts/make-release.mjs`**

This copies only `system/`, `User-Manual.MD`, and `LICENSE` from the last **commit** (not your
working tree) into the public repo `https://github.com/RVBCosme/ANF-Inventory` as one new commit.
A built-in guard aborts the publish if any development file would leak. If nothing changed since
the last release it prints "Nothing to publish." On a publish with real changes it automatically
bumps the patch version (e.g. `1.0.0` → `1.0.1`) and commits that bump to your dev repo; if you
want a larger jump, bump first yourself (`npm version minor` or `major`, run in `system\`).

**Install on a client PC (first time):**
1. Install **Node.js 20+** (see [section 2](#2-what-you-need-first-time-only)) and **Git**.
2. Open PowerShell and clone the public repo into a per-user folder (no admin rights needed):
   ```powershell
   git clone https://github.com/RVBCosme/ANF-Inventory.git "$env:LOCALAPPDATA\ANF-Inventory"
   ```
3. Double-click `system\Start ANF Inventory.bat` inside that folder. The first run installs and
   builds automatically (the "Setting up for first use…" page), then opens the app.

**Update a client PC:** in that folder, run `git pull`, then double-click
`system\Start ANF Inventory.bat` again (it rebuilds automatically). Do **not** install into
`Program Files` — the app writes its data, build output, and database inside its own folder, which
a standard user cannot do there.
