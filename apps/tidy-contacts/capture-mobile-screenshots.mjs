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
FN:Rahul Verma
TEL;TYPE=CELL:+91 99887 76655
EMAIL:rahul.verma@example.com
ORG:Fintech Global
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Rahul V
TEL;TYPE=CELL:+91 99887 76655
ORG:Fintech Global
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:R Verma
TEL;TYPE=CELL:+91 99887 76655
TITLE:Product VP
END:VCARD
BEGIN:VCARD
VERSION:3.0
ORG:Tech Nova Systems
EMAIL:contact @technova.com
TEL:123
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Rohan Shah
TEL;TYPE=CELL:098
EMAIL:invalid-email-address
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

const OUTPUT_DIR = path.resolve("./screenshots/mobile-portrait");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function run() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const profileDir = `/tmp/chrome-profile-mobile-${Date.now()}`;
  const port = 9223;

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
        console.log("Targets:", list);
        const page = list.find((t) => t.type === "page");
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch (err) {
        // waiting
      }
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
    console.log("WebSocket open");

    function send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    console.log("Page enabled");

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

    console.log("Navigating...");
    await send("Page.navigate", { url: "http://localhost:4174/tidy-contacts/" });
    await new Promise((r) => setTimeout(r, 1200));

    // 1. Landing Screen (Mobile Portrait Viewport)
    await capture("01_mobile_landing.png");

    // Inject fixture VCF into file input
    console.log("Injecting fixture VCF...");
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
    await new Promise((r) => setTimeout(r, 1000));

    // 2. Duplicate Review Flow - Initial View (Header, stats, progress)
    await capture("02_mobile_duplicates_overview.png");

    // 3. Duplicate Review - Scrolled to show contact cards and action buttons
    await evaluate(`window.scrollTo({ top: 380, behavior: 'instant' })`);
    await new Promise((r) => setTimeout(r, 300));
    await capture("03_mobile_duplicates_cards_view.png");

    // 4. Make Decision: Keep Left
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Keep left'));
      btn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    // Go back to Pair 1 to see the "Kept left" badge & highlighted state!
    await evaluate(`
      const prevBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Previous'));
      prevBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 300));
    await capture("04_mobile_duplicates_decision_keep_left.png");

    // 5. Navigate to Pair 2 and choose "Merge both"
    await evaluate(`
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') && !b.disabled);
      nextBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 300));
    await evaluate(`
      const mergeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Merge both'));
      mergeBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    // Go back to Pair 2 to see "Merged both" state
    await evaluate(`
      const prevBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Previous'));
      prevBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 300));
    await capture("05_mobile_duplicates_decision_merge_both.png");

    // 6. Navigate to Pair 3 (3 contacts in group)
    await evaluate(`
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') && !b.disabled);
      nextBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 300));
    await capture("06_mobile_duplicates_pair3_multi_contact.png");

    // Choose "Keep right" on Pair 3
    await evaluate(`
      const rightBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Keep right'));
      rightBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));

    // 7. Switch tab to Quality / "Other issues"
    await evaluate(`
      const tab = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes('Other issues'));
      tab?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await new Promise((r) => setTimeout(r, 300));
    await capture("07_mobile_quality_overview.png");

    // 8. Quality Issue 1: Missing name / short phone / invalid email -> Scroll to card & actions
    await evaluate(`window.scrollTo({ top: 380, behavior: 'instant' })`);
    await new Promise((r) => setTimeout(r, 300));
    await capture("08_mobile_quality_issue1_card.png");

    // Test Safe Fix on Issue 1
    await evaluate(`
      const fixBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Safe fix') && !b.disabled);
      fixBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));
    // Go back to Issue 1 to see "Fix applied"
    await evaluate(`
      const prevBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Previous'));
      prevBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 300));
    await capture("09_mobile_quality_safe_fix_applied.png");

    // 9. Quality Issue 2: Short phone & invalid email (unrepairable) -> Test "Remove"
    await evaluate(`
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') && !b.disabled);
      nextBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 300));
    await capture("10_mobile_quality_issue2_unrepairable.png");

    await evaluate(`
      const removeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Remove'));
      removeBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));

    // 10. Quality Issue 3: Ghost Contact (no details) -> Test "Keep as-is"
    await capture("11_mobile_quality_issue3_ghost_contact.png");
    await evaluate(`
      const keepBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Keep as-is'));
      keepBtn?.click();
    `);
    await new Promise((r) => setTimeout(r, 400));

    // 11. Completion / All Reviewed State
    await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await new Promise((r) => setTimeout(r, 300));
    await capture("12_mobile_all_reviewed_completion.png");

    // 12. Bottom Sidebar / Actions View (File info card, Undo, Download, Read-only notice)
    await evaluate(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })`);
    await new Promise((r) => setTimeout(r, 300));
    await capture("13_mobile_bottom_sidebar_actions.png");

    ws.close();
    console.log("All 13 mobile screenshots captured successfully!");
  } finally {
    chromeProc.kill();
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error("Error capturing mobile screenshots:", err);
  process.exit(1);
});
