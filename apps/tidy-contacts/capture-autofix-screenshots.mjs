import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const FIXTURE_VCF = `BEGIN:VCARD
VERSION:3.0
FN:Alex Sharma
TEL;TYPE=CELL:+91 98765 43210
EMAIL:alex.sharma@example.com
ORG:Acme Corp
TITLE:Senior Engineer
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Alex S.
TEL;TYPE=WORK:+919876543210
EMAIL:alex.work@example.com
ORG:Acme Corp
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Priya Patel
TEL;TYPE=CELL:+91 91234 56789
EMAIL:priya.patel@design.co
TITLE:Lead Designer
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:priya  patel
TEL;TYPE=HOME:+91 91234 50000
EMAIL:priya@personal.me
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Alice Smith
EMAIL:alice@gmial.com
TEL;TYPE=CELL:+91 98765 00001
ORG:Design Studio
END:VCARD
BEGIN:VCARD
VERSION:3.0
ORG:Tech Nova Systems
TEL;TYPE=WORK:+91 98765 00002
EMAIL:info@technova.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Bob Builder
TEL;TYPE=CELL:+91 98765 00003
TEL;TYPE=CELL:+91 98765 00003
EMAIL:bob@builder.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:David Jones
TEL;TYPE=CELL:+91 98765 00004
EMAIL:david.jones@example.com
ADR:;;;;;;
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Charlie Chaplin
TEL;TYPE=CELL:123
EMAIL:charlie@chaplin.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Ghost Contact
ORG:Silent LLC
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Clean Contact One
TEL;TYPE=CELL:+91 90000 11111
EMAIL:clean1@example.com
ORG:Standard Ltd
END:VCARD
`;

const OUTPUT_DIR = path.resolve("./screenshots/autofix-verification");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function run() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const profileDir = `/tmp/chrome-profile-autofix-${Date.now()}`;
  const port = 9222 + Math.floor(Math.random() * 50);

  console.log("Starting preview server on port 4176...");
  const previewProc = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", "4176"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  await new Promise((r) => setTimeout(r, 1500));

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1280,900",
    "about:blank",
  ]);

  try {
    let wsUrl = "";
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        const list = await res.json();
        const page = list.find((t) => t.type === "page");
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
        if (!page) {
          const newRes = await fetch(`http://127.0.0.1:${port}/json/new`, { method: "PUT" });
          const newTarget = await newRes.json();
          if (newTarget && newTarget.webSocketDebuggerUrl) {
            wsUrl = newTarget.webSocketDebuggerUrl;
            break;
          }
        }
      } catch (err) {}
    }

    if (!wsUrl) throw new Error("Could not connect to Chrome CDP target");

    console.log("Connected to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);

    let nextId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((r) => (ws.onopen = r));

    function send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      return res.result?.value;
    }

    async function capture(filename) {
      // Fetch layout metrics to capture complete scrolling page
      const metrics = await send("Page.getLayoutMetrics");
      const contentWidth = Math.ceil(metrics.contentSize.width);
      const contentHeight = Math.ceil(metrics.contentSize.height);

      const res = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        fromSurface: true,
        clip: {
          x: 0,
          y: 0,
          width: contentWidth,
          height: contentHeight,
          scale: 1,
        },
      });
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
      console.log(`Saved full-page scrolling screenshot: ${filename} (${contentWidth}x${contentHeight})`);
    }

    let pageCount = 0;
    async function setupPage(mobile = false) {
      pageCount++;
      if (mobile) {
        await send("Emulation.setDeviceMetricsOverride", {
          width: 390,
          height: 844,
          deviceScaleFactor: 2,
          mobile: true,
        });
      } else {
        await send("Emulation.setDeviceMetricsOverride", {
          width: 1280,
          height: 900,
          deviceScaleFactor: 2,
          mobile: false,
        });
      }

      await send("Page.navigate", { url: `http://127.0.0.1:4176/?step=${pageCount}_${Date.now()}` });
      await new Promise((r) => setTimeout(r, 800));

      await evaluate(`
        (async () => {
          document.documentElement.classList.add("dark");
          localStorage.setItem("tidy-contacts-theme", "dark");
          
          try {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
              if (db.name) window.indexedDB.deleteDatabase(db.name);
            }
          } catch (e) {}

          const input = document.querySelector('[data-testid="vcf-file-input"]');
          if (input) {
            const vcfContent = ${JSON.stringify(FIXTURE_VCF)};
            const blob = new Blob([vcfContent], { type: "text/vcard" });
            const file = new File([blob], "test-readiness-" + Date.now() + ".vcf", { type: "text/vcard" });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 1500));
      
      await evaluate(`
        (() => {
          const startNewBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Start New Session Instead"));
          if (startNewBtn) {
            startNewBtn.click();
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 600));
    }

    console.log("=== DESKTOP FLOW ===");
    console.log("1. Desktop: Initial state with 4 auto-fixes active and 4 pending items");
    await setupPage(false);
    await capture("01_desktop_01_initial_pending.png");

    console.log("2. Desktop: Resolve Duplicates (click Merge 2 twice)");
    await evaluate(`
      (() => {
        const mergeBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Merge 2"));
        if (mergeBtn) mergeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate(`
      (() => {
        const mergeBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Merge 2"));
        if (mergeBtn) mergeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("01_desktop_02_duplicates_resolved_auto_advanced.png");

    console.log("3. Desktop: Resolve Needs Review (click Keep as-is on Charlie Chaplin and Ghost Contact)");
    await evaluate(`
      (() => {
        const keepBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Keep as-is"));
        if (keepBtn) keepBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate(`
      (() => {
        const keepBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Keep as-is"));
        if (keepBtn) keepBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("01_desktop_03_export_ready_100_percent.png");

    console.log("4. Desktop: Click Export directly from completed view (without visiting auto-fixes)");
    await evaluate(`
      (() => {
        const exportBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Download cleaned VCF") || b.textContent.includes("Export contacts"));
        if (exportBtn) exportBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("01_desktop_04_export_modal_from_completion.png");

    console.log("5. Desktop: Optional Auto-fixes inspection view");
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('[aria-label="Close dialog"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        const autoFixTab = tabs.find(t => t.textContent.includes("Auto-fixes"));
        if (autoFixTab) autoFixTab.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("01_desktop_05_optional_autofixes_tab.png");

    console.log("=== MOBILE FLOW ===");
    console.log("6. Mobile: Initial state with 4 pending issues");
    await setupPage(true);
    await capture("02_mobile_01_initial_pending.png");

    console.log("7. Mobile: Resolve Duplicates (auto-advances to Needs Review)");
    await evaluate(`
      (() => {
        const mergeBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Merge 2"));
        if (mergeBtn) mergeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate(`
      (() => {
        const mergeBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Merge 2"));
        if (mergeBtn) mergeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("02_mobile_02_after_duplicates_merge.png");

    console.log("8. Mobile: Resolve Needs Review -> Export Readiness achieved (100% progress, 0 pending, full-width Export CTA)");
    await evaluate(`
      (() => {
        const keepBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Keep as-is"));
        if (keepBtn) keepBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate(`
      (() => {
        const keepBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Keep as-is"));
        if (keepBtn) keepBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("02_mobile_03_export_ready_100_percent.png");

    console.log("9. Mobile: Open Export Confirmation Modal");
    await evaluate(`
      (() => {
        const exportBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Download cleaned VCF") || b.textContent.includes("Export Contacts"));
        if (exportBtn) exportBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("02_mobile_04_export_modal.png");

    console.log("Done capturing all export readiness scrolling screenshots!");
  } finally {
    try { chromeProc.kill(); } catch {}
    try { previewProc.kill(); } catch {}
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
