import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const FIXTURE_VCF = `BEGIN:VCARD
VERSION:3.0
FN:Bank of india
TEL;TYPE=CELL:09015135135
EMAIL:boi1@bankofindia.co.in
EMAIL:boi2@bankofindia.co.in
EMAIL:boi3@bankofindia.co.in
EMAIL:boi4@bankofindia.co.in
EMAIL:boi5@bankofindia.co.in
EMAIL:boi6@bankofindia.co.in
EMAIL:boi7@bankofindia.co.in
EMAIL:boi8@bankofindia.co.in
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Bank
TEL;TYPE=CELL:09015135135
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Starconnect
EMAIL:boi.starconnect@bankofindia.co.in
TEL;TYPE=CELL:09015135135
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Ankush Bank Of India
TEL;TYPE=CELL:09015135135
EMAIL:ankush@bankofindia.co.in
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Unnamed Contact
TEL;TYPE=CELL:09015135135
EMAIL:zo.mumbaisouthzone@bankofindia.co.in
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Unnamed contact
TEL;TYPE=CELL:09015135135
EMAIL:ho.customerservice@bankofindia.co.in
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Alex Sharma
TEL;TYPE=CELL:+91 98765 43210
EMAIL:alex.sharma@example.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Alex S
TEL;TYPE=CELL:+91 98765 43210
EMAIL:alex.work@example.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Clean Contact One
TEL;TYPE=CELL:+91 90000 11111
EMAIL:clean1@example.com
END:VCARD
`;

const OUTPUT_DIR = path.resolve("./screenshots/redesign-verification");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function run() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const profileDir = `/tmp/chrome-profile-redesign-${Date.now()}`;
  const port = 9222 + Math.floor(Math.random() * 50);
  console.log("Starting vite preview server...");
  const previewProc = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", "4175"], {
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
    "--force-dark-mode",
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

    if (!wsUrl) throw new Error("Could not connect to Chrome CDP page target");

    console.log("Connecting to:", wsUrl);
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
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

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

    let pageCount = 0;
    async function setupPage() {
      pageCount++;
      await send("Page.navigate", { url: `http://127.0.0.1:4175/?step=${pageCount}_${Date.now()}` });
      await new Promise((r) => setTimeout(r, 1200));
      await evaluate(`
        (() => {
          document.documentElement.classList.add("dark");
          localStorage.setItem("tidy-contacts-theme", "dark");
          const input = document.querySelector('[data-testid="vcf-file-input"]');
          if (input) {
            const vcfContent = ${JSON.stringify(FIXTURE_VCF)};
            const file = new File([vcfContent], "Bank_Of_India_Contacts.vcf", { type: "text/vcard" });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 1000));
    }

    async function resetModals() {
      await evaluate(`
        (() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          window.__resetTestState?.();
        })()
      `);
      await new Promise((r) => setTimeout(r, 300));
    }

    // Initial setup
    console.log("Setting up initial page...");
    await setupPage();

    // 1. Mobile Duplicate View (Matching User Image 1)
    await resetModals();
    await capture("01_mobile_duplicate_review.png");

    // 2. Selection Behavior: Select Card 1 -> Card 1 is Selected, Card 2 is Deleted with trash icon (Behavior note 6)
    await resetModals();
    await evaluate(`
      const selectBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Select');
      selectBtns[0]?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    // Navigate back to pair 1 to view the Selected and Deleted states
    await evaluate(`
      const prevBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Previous'));
      prevBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await capture("03_card1_selected_card2_deleted.png");

    // 3. Accordion for N > 2 contacts expanded (Matching User Image 2 & Behavior note 7)
    await resetModals();
    await evaluate(`
      const accordionBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Contacts in this group'));
      accordionBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate(`window.scrollTo({ top: 380, behavior: 'instant' })`);
    await new Promise((r) => setTimeout(r, 400));
    await capture("04_accordion_contacts_in_group_expanded.png");

    // 4. Contact Details Modal (Behavior note 3)
    await resetModals();
    await evaluate(`
      const detailBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View all contact details'));
      detailBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await capture("05_contact_details_modal_editable.png");

    // 5. Merge & Edit Modal (Behavior note 4)
    await resetModals();
    await evaluate(`
      const mergeEditBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Merge & Edit'));
      mergeEditBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await capture("06_merge_and_edit_modal.png");

    // 6. Select & Keep Modal (Behavior note 5)
    await resetModals();
    await evaluate(`
      const selectKeepBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Select & keep'));
      selectKeepBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await capture("07_select_and_keep_modal.png");

    // 7. Export Confirmation Modal (Behavior note 8)
    await resetModals();
    await evaluate(`
      const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Export'));
      exportBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await capture("08_export_confirmation_modal.png");

    // 8. Dropdown Menu Open (Behavior note 1 & User Image 3)
    await resetModals();
    await evaluate(`
      const btn = document.querySelector('[data-testid="mode-dropdown-trigger"]');
      btn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await capture("02_dropdown_menu_open.png");

    // 9. Landscape Duplicate View (1280x800 desktop)
    await resetModals();
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 600));
    await capture("09_landscape_duplicate_review.png");

    // 10. Landscape Select & Keep Modal
    await evaluate(`
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Select & keep'));
      const visibleBtn = btns.find(b => b.offsetParent !== null) || btns[btns.length - 1];
      visibleBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 500));
    await capture("10_landscape_select_and_keep_modal.png");

    ws.close();
    console.log("All screenshots captured successfully!");
  } finally {
    chromeProc.kill();
    previewProc.kill();
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

run().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
