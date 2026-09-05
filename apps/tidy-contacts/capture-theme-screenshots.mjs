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
FN:Ghost Contact
ORG:Silent LLC
END:VCARD
`;

const OUTPUT_DIR = path.resolve("./screenshots/theme-toggle");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function run() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const profileDir = `/tmp/chrome-profile-theme-${Date.now()}`;
  const port = 9224;

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=390,844",
  ]);

  try {
    let wsUrl = "";
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        const list = await res.json();
        const page = list.find((t) => t.type === "page");
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) throw new Error("Could not connect to Chrome CDP");

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
      const res = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
      console.log(`Saved screenshot: ${filename}`);
    }

    await send("Page.navigate", { url: "http://localhost:4174/tidy-contacts/" });
    await new Promise((r) => setTimeout(r, 1200));

    // 1. Light Mode Landing
    await capture("01_landing_light_mode.png");

    // 2. Toggle to Dark Mode
    await evaluate(`
      const toggleBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label')?.includes('dark theme'));
      toggleBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await capture("02_landing_dark_mode.png");

    // 3. Inject file and review in Dark Mode
    await evaluate(`
      (() => {
        const input = document.querySelector('[data-testid="vcf-file-input"]');
        const vcfContent = ${JSON.stringify(FIXTURE_VCF)};
        const file = new File([vcfContent], "My_Contacts_Export.vcf", { type: "text/vcard" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      })()
    `);
    await new Promise((r) => setTimeout(r, 800));
    await capture("03_duplicates_dark_mode.png");

    // 4. Toggle back to Light Mode
    await evaluate(`
      const toggleBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label')?.includes('light theme'));
      toggleBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await capture("04_duplicates_light_mode.png");

    ws.close();
    console.log("Theme toggle screenshots captured successfully!");
  } finally {
    chromeProc.kill("SIGKILL");
    await new Promise((r) => setTimeout(r, 500));
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("Error capturing theme screenshots:", err);
  process.exit(1);
});
