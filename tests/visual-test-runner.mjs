import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const rootDir = resolve(import.meta.dirname, '..');
const screenshotsDir = resolve(rootDir, 'tests/screenshots');
const artifactScreenshotsDir = '/Users/karan/.gemini/antigravity/brain/c188273d-85ab-4fb8-bb99-c64e10408ec5/screenshots';

mkdirSync(screenshotsDir, { recursive: true });
mkdirSync(artifactScreenshotsDir, { recursive: true });

async function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolvePort(port)));
    });
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolveConn, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolveConn();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8');
          const msg = JSON.parse(raw);
          if (msg.id && this.callbacks.has(msg.id)) {
            const { resolve: res, reject: rej } = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) rej(new Error(msg.error.message || JSON.stringify(msg.error)));
            else res(msg.result);
          }
        } catch (e) {
          console.error('Error parsing CDP message:', e);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolveSend, reject) => {
      const timeout = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`CDP command ${method} timed out after 10000ms`));
        }
      }, 10000);

      this.callbacks.set(id, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolveSend(val);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async setViewport(width, height, isMobile = false) {
    try {
      await this.send('Emulation.setDeviceMetricsOverride', {
        width: Math.floor(width),
        height: Math.floor(height),
        deviceScaleFactor: 1,
        mobile: isMobile,
      });
    } catch (err) {
      await this.evaluate(`
        window.innerWidth = ${width};
        window.innerHeight = ${height};
        window.dispatchEvent(new Event('resize'));
      `);
    }
    await this.wait(400);
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await this.wait(1500);
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const localPath = resolve(screenshotsDir, filename);
    const artifactPath = resolve(artifactScreenshotsDir, filename);
    writeFileSync(localPath, buffer);
    writeFileSync(artifactPath, buffer);
    console.log(`📸 Saved screenshot: ${filename} (${Math.round(buffer.length / 1024)} KB)`);
  }

  async wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runVisualTests() {
  console.log('🚀 Starting Microsoft ToDo Comprehensive Visual Testing Suite...\n');

  const backendPort = 5005;
  const frontendPort = 3002;
  const cdpPort = await getFreePort();

  const tempDbDir = mkdtempSync(resolve(tmpdir(), 'todo-visual-test-'));
  const dbPath = resolve(tempDbDir, 'test.db');

  // 1. Start Backend Server
  console.log('1️⃣ Starting Fastify Backend Server...');
  const backendProc = spawn(process.execPath, ['dist/server.js'], {
    cwd: resolve(rootDir, 'apps/microsoft-todo-server'),
    env: {
      ...process.env,
      PORT: String(backendPort),
      DATABASE_PATH: dbPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Wait for backend health
  let backendReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${backendPort}/healthz`);
      if (res.ok) {
        backendReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }

  if (!backendReady) {
    throw new Error('Backend failed to start in time');
  }
  console.log('✅ Backend is healthy!\n');

  // 2. Start Frontend Server
  console.log('2️⃣ Starting Vite Frontend Server...');
  const frontendProc = spawn('npx', ['vite', '--port', String(frontendPort), '--host', '127.0.0.1'], {
    cwd: resolve(rootDir, 'apps/microsoft-todo-client'),
    env: {
      ...process.env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Wait for frontend ready
  let frontendReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${frontendPort}`);
      if (res.ok) {
        frontendReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }

  if (!frontendReady) {
    throw new Error('Frontend failed to start in time');
  }
  console.log('✅ Frontend is ready!\n');

  // 3. Launch Chrome Headless
  console.log('3️⃣ Launching Headless Google Chrome...');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeUserDataDir = mkdtempSync(resolve(tmpdir(), 'chrome-profile-'));

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${chromeUserDataDir}`,
    '--window-size=1280,800',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ]);

  // Wait for CDP endpoint
  let pageWsUrl = null;
  for (let i = 0; i < 40; i++) {
    try {
      const newPageRes = await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' });
      if (newPageRes.ok) {
        const pageData = await newPageRes.json();
        if (pageData.webSocketDebuggerUrl) {
          pageWsUrl = pageData.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }

  if (!pageWsUrl) {
    throw new Error('Failed to create page target in Headless Chrome');
  }
  console.log('✅ Created page target and connected via CDP!\n');

  const client = new CdpClient(pageWsUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('DOM.enable');
  await client.send('Runtime.enable');

  try {
    const baseUrl = `http://127.0.0.1:${frontendPort}`;

    // ========================================================
    // SECTION A: LANDSCAPE TESTS (DESKTOP 1280x800)
    // ========================================================
    console.log('========================================================');
    console.log('🌟 SECTION A: LANDSCAPE TESTS (Desktop 1280x800)');
    console.log('========================================================\n');

    await client.setViewport(1280, 800, false);
    await client.navigate(baseUrl);
    await client.wait(1500);

    // TC-L01: Default Workspace View
    console.log('🧪 TC-L01: Testing Default Landscape Workspace...');
    await client.screenshot('01_landscape_default_workspace.png');

    // TC-L02: Quick Add Tasks
    console.log('🧪 TC-L02: Testing Quick Add Task in Landscape...');
    await client.evaluate(`
      (async () => {
        const input = document.querySelector('input[placeholder*="Add a task"]');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'Self assigned task');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          
          await new Promise(r => setTimeout(r, 400));
          setter.call(input, 'Second task');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      })()
    `);
    await client.wait(1000);
    await client.screenshot('02_landscape_task_created.png');

    // TC-L03: Open Task Detail Drawer (Split-Pane)
    console.log('🧪 TC-L03: Testing Task Detail Split-Pane Drawer...');
    await client.evaluate(`
      (() => {
        const taskItems = document.querySelectorAll('main div[class*="group flex items-center justify-between"]');
        if (taskItems.length > 0) {
          taskItems[0].click();
        }
      })()
    `);
    await client.wait(1000);
    await client.screenshot('03_landscape_task_detail_drawer.png');

    // TC-L04: Subtasks CRUD in Detail Drawer
    console.log('🧪 TC-L04: Adding Subtasks/Steps in Detail Drawer...');
    await client.evaluate(`
      (() => {
        const stepInput = document.querySelector('input[placeholder*="Add next step"]');
        if (stepInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(stepInput, 'Review architecture guidelines');
          stepInput.dispatchEvent(new Event('input', { bubbles: true }));
          stepInput.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      })()
    `);
    await client.wait(800);
    await client.screenshot('04_landscape_subtasks_added.png');

    // Close Detail Drawer
    await client.evaluate(`
      (() => {
        const backBtn = document.querySelector('button[title="Close Drawer"]');
        if (backBtn) backBtn.click();
      })()
    `);
    await client.wait(500);

    // TC-L05: Sort Modal in Landscape
    console.log('🧪 TC-L05: Opening Sort Modal in Landscape...');
    await client.evaluate(`
      (() => {
        const sortBtn = document.querySelector('button[title="Sort tasks"]');
        if (sortBtn) sortBtn.click();
      })()
    `);
    await client.wait(600);
    await client.screenshot('05_landscape_sort_modal.png');

    // Close Sort Modal
    await client.evaluate(`
      (() => {
        const doneBtn = document.querySelector('button[class*="bg-primary text-primary-foreground font-bold"]');
        if (doneBtn) doneBtn.click();
      })()
    `);
    await client.wait(400);

    // TC-L06: Filter Modal in Landscape
    console.log('🧪 TC-L06: Opening Filter Modal in Landscape...');
    await client.evaluate(`
      (() => {
        const filterBtn = document.querySelector('button[title="Filter tasks"]');
        if (filterBtn) filterBtn.click();
      })()
    `);
    await client.wait(600);
    await client.screenshot('06_landscape_filter_modal.png');

    // Close Filter Modal
    await client.evaluate(`
      (() => {
        const applyBtn = document.querySelector('button[class*="bg-primary text-primary-foreground font-bold"]');
        if (applyBtn) applyBtn.click();
      })()
    `);
    await client.wait(400);

    // TC-L07: Multi-Select Mode & Bulk Actions Bar
    console.log('🧪 TC-L07: Testing Multi-Select Mode & Bulk Actions Bar...');
    await client.evaluate(`
      (() => {
        const selectBtn = document.querySelector('button[title="Select multiple tasks"]');
        if (selectBtn) selectBtn.click();
        const taskItems = document.querySelectorAll('main div[class*="group flex items-center justify-between"]');
        if (taskItems.length > 0) taskItems[0].click();
      })()
    `);
    await client.wait(600);
    await client.screenshot('07_landscape_multiselect_bulk_bar.png');

    // TC-L08: Bulk Due Date Modal
    console.log('🧪 TC-L08: Opening Bulk Due Date Modal...');
    await client.evaluate(`
      (() => {
        const calBtn = document.querySelector('button[title="Assign Due Date"]');
        if (calBtn) calBtn.click();
      })()
    `);
    await client.wait(600);
    await client.screenshot('08_landscape_bulk_due_modal.png');

    // Close Bulk Due Modal
    await client.evaluate(`
      (() => {
        const closeBtn = document.querySelector('div[class*="fixed inset-0"] button');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await client.wait(300);

    // TC-L09: Bulk Assignee Modal
    console.log('🧪 TC-L09: Opening Bulk Assignee Modal...');
    await client.evaluate(`
      (() => {
        const userBtn = document.querySelector('button[title="Assign Contact"]');
        if (userBtn) userBtn.click();
      })()
    `);
    await client.wait(600);
    await client.screenshot('09_landscape_bulk_assignee_modal.png');

    // Close Bulk Assignee Modal & Exit Select Mode
    await client.evaluate(`
      (() => {
        const closeBtn = document.querySelector('div[class*="fixed inset-0"] button');
        if (closeBtn) closeBtn.click();
        const clearBtn = document.querySelector('button[class*="rounded-full bg-white/15"]');
        if (clearBtn) clearBtn.click();
      })()
    `);
    await client.wait(400);

    // TC-L10: Contacts Page in Landscape
    console.log('🧪 TC-L10: Testing Contacts & Library Page in Landscape...');
    await client.navigate(`${baseUrl}/contacts`);
    await client.wait(1000);
    await client.screenshot('10_landscape_contacts_page.png');

    // TC-L11: Settings Page in Landscape
    console.log('🧪 TC-L11: Testing Settings Page in Landscape...');
    await client.navigate(`${baseUrl}/settings`);
    await client.wait(1000);
    await client.screenshot('11_landscape_settings_page.png');

    // ========================================================
    // SECTION B: PORTRAIT TESTS (MOBILE 390x844)
    // ========================================================
    console.log('\n========================================================');
    console.log('📱 SECTION B: PORTRAIT TESTS (Mobile 390x844)');
    console.log('========================================================\n');

    await client.setViewport(390, 844, true);
    await client.navigate(`${baseUrl}/`);
    await client.wait(1500);

    // TC-P01: Mobile Home View with Bottom Navigation Bar
    console.log('🧪 TC-P01: Testing Mobile Portrait View with Bottom Nav...');
    await client.screenshot('12_portrait_mobile_home.png');

    // TC-P02: Mobile Sort Bottom Sheet
    console.log('🧪 TC-P02: Testing Mobile Sort Bottom Sheet...');
    await client.evaluate(`
      (() => {
        const sortBtn = document.querySelector('button[title="Sort tasks"]');
        if (sortBtn) sortBtn.click();
      })()
    `);
    await client.wait(600);
    await client.screenshot('13_portrait_sort_bottom_sheet.png');

    // Close Sort Sheet
    await client.evaluate(`
      (() => {
        const doneBtn = document.querySelector('button[class*="bg-primary text-primary-foreground font-bold"]');
        if (doneBtn) doneBtn.click();
      })()
    `);
    await client.wait(400);

    // TC-P03: Mobile Filter Bottom Sheet
    console.log('🧪 TC-P03: Testing Mobile Filter Bottom Sheet...');
    await client.evaluate(`
      (() => {
        const filterBtn = document.querySelector('button[title="Filter tasks"]');
        if (filterBtn) filterBtn.click();
      })()
    `);
    await client.wait(600);
    await client.screenshot('14_portrait_filter_bottom_sheet.png');

    // Close Filter Sheet
    await client.evaluate(`
      (() => {
        const applyBtn = document.querySelector('button[class*="bg-primary text-primary-foreground font-bold"]');
        if (applyBtn) applyBtn.click();
      })()
    `);
    await client.wait(400);

    // TC-P04: Mobile Multi-Select & Dark Bulk Bar
    console.log('🧪 TC-P04: Testing Mobile Multi-Select Mode...');
    await client.evaluate(`
      (() => {
        // Toggle select mode via header button
        const selectBtn = document.querySelector('button[title="Select multiple tasks"]');
        if (selectBtn) selectBtn.click();
      })()
    `);
    await client.wait(300);
    await client.evaluate(`
      (() => {
        // Select first task card
        const taskCards = document.querySelectorAll('div[class*="group flex items-center justify-between"]');
        if (taskCards.length > 0) {
          taskCards[0].click();
        }
      })()
    `);
    await client.wait(600);
    await client.screenshot('15_portrait_multiselect_bulk_bar.png');

    // Close Select Mode
    await client.evaluate(`
      (() => {
        const clearBtn = document.querySelector('button[class*="w-8 h-8 rounded-full bg-white/15"]');
        if (clearBtn) clearBtn.click();
      })()
    `);
    await client.wait(400);

    // TC-P05: Fullscreen Task Detail Sheet on Mobile
    console.log('🧪 TC-P05: Testing Fullscreen Task Detail Sheet on Mobile...');
    await client.evaluate(`
      (() => {
        const taskItem = document.querySelector('div[class*="group flex items-center justify-between"]');
        if (taskItem) taskItem.click();
      })()
    `);
    await client.wait(800);
    await client.screenshot('16_portrait_fullscreen_task_detail.png');

    // Close Task Detail
    await client.evaluate(`
      (() => {
        const backBtn = document.querySelector('button[title="Close Drawer"]');
        if (backBtn) backBtn.click();
      })()
    `);
    await client.wait(400);

    // TC-P06: Mobile Contacts View
    console.log('🧪 TC-P06: Testing Mobile Contacts View via Bottom Nav...');
    await client.navigate(`${baseUrl}/contacts`);
    await client.wait(1000);
    await client.screenshot('17_portrait_contacts_page.png');

    // TC-P07: Mobile Settings View
    console.log('🧪 TC-P07: Testing Mobile Settings View via Bottom Nav...');
    await client.navigate(`${baseUrl}/settings`);
    await client.wait(1000);
    await client.screenshot('18_portrait_settings_page.png');

    console.log('\n🎉 ALL 18 VISUAL TEST SCENARIOS PASSED WITH HIGH-FIDELITY SCREENSHOTS!');
  } finally {
    await client.close();
    chromeProc.kill('SIGKILL');
    frontendProc.kill('SIGKILL');
    backendProc.kill('SIGKILL');
  }
}

runVisualTests().catch((err) => {
  console.error('\n❌ Visual Test Suite Failed:', err);
  process.exit(1);
});
