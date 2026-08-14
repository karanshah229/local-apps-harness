import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../stock.db');
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

sqlite3.verbose();
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    // Categories table
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'Package',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subcategories table
    db.run(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        custom_fields TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
      )
    `);

    // Items table
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category_id INTEGER,
        subcategory_id INTEGER,
        weight REAL DEFAULT 0,
        weight_unit TEXT DEFAULT 'g',
        purity TEXT DEFAULT 'N/A',
        length REAL DEFAULT 0,
        width REAL DEFAULT 0,
        height REAL DEFAULT 0,
        dimension_unit TEXT DEFAULT 'mm',
        quantity INTEGER DEFAULT 1,
        purchase_price REAL DEFAULT 0,
        selling_price REAL DEFAULT 0,
        notes TEXT,
        image_path TEXT,
        extra_attributes TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (subcategory_id) REFERENCES subcategories (id)
      )
    `, (err) => {
      if (!err) {
        seedInitialData();
      }
    });
  });
}

function seedInitialData() {
  db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
    if (err || row.count > 0) return; // already seeded

    console.log('Seeding initial categories and sample items...');

    // Seed Categories
    const stmtCat = db.prepare('INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)');
    stmtCat.run('Precious Jewelry', 'Gold, Platinum, and Diamond finished items', 'Gem');
    stmtCat.run('Bullion & Coins', 'Investment grade bars, coins, and raw metal', 'Coins');
    stmtCat.run('Silver & Gems', 'Sterling silver, gemstones, and custom ornaments', 'Sparkles');
    stmtCat.finalize(() => {

      // Seed Subcategories
      const stmtSub = db.prepare('INSERT INTO subcategories (category_id, name, description, custom_fields) VALUES (?, ?, ?, ?)');
      
      // Cat 1: Precious Jewelry
      stmtSub.run(
        1,
        'Gold Necklaces & Chains',
        'Gold chains, pendants, and chokers',
        JSON.stringify([
          { name: 'Karat Purity', type: 'select', options: ['24K', '22K', '18K', '14K'], required: true },
          { name: 'Hallmark BIS Code', type: 'text', placeholder: 'e.g. HUID-88421' },
          { name: 'Clasp Type', type: 'select', options: ['Lobster Claw', 'Spring Ring', 'S-Hook', 'Box Lock'] }
        ])
      );
      stmtSub.run(
        1,
        'Rings & Bands',
        'Statement rings, wedding bands, and solitaires',
        JSON.stringify([
          { name: 'Ring Size (US/IN)', type: 'number', placeholder: 'e.g. 7' },
          { name: 'Gemstone Type', type: 'text', placeholder: 'e.g. Diamond, Ruby, Emerald' },
          { name: 'Stone Carat Weight', type: 'number', placeholder: 'e.g. 0.75' }
        ])
      );

      // Cat 2: Bullion & Coins
      stmtSub.run(
        2,
        'Gold Coins & Bars',
        'Certified mint bars and gold coins',
        JSON.stringify([
          { name: 'Mint Brand', type: 'text', placeholder: 'e.g. PAMP Suisse, MMTC-PAMP, Perth Mint' },
          { name: 'Serial Number', type: 'text', placeholder: 'e.g. BAR-994821' },
          { name: 'Certificate Enclosed', type: 'select', options: ['Yes', 'No'] }
        ])
      );

      // Cat 3: Silver & Gems
      stmtSub.run(
        3,
        'Sterling Silverware',
        'Silver articles, bowls, and silver ornaments',
        JSON.stringify([
          { name: 'Silver Grade', type: 'select', options: ['925 Sterling', '999 Fine Silver', '800 Silver'] },
          { name: 'Item Finish', type: 'select', options: ['Polished Antique', 'High Gloss Mirror', 'Matte Satin'] }
        ])
      );

      stmtSub.finalize(() => {

        // Seed Sample Items
        const stmtItem = db.prepare(`
          INSERT INTO items (
            item_code, name, category_id, subcategory_id, weight, weight_unit,
            purity, length, width, height, dimension_unit, quantity, purchase_price,
            selling_price, notes, image_path, extra_attributes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmtItem.run(
          'SKU-G-101',
          'Royal 22K Gold Temple Necklace',
          1, 1,
          48.5, 'g',
          '22K (91.6%)',
          450, 25, 4, 'mm',
          1,
          265000, 298000,
          'Exquisite antique finish temple design necklace with certified BIS hallmark.',
          '/sample_necklace.svg',
          JSON.stringify({ 'Karat Purity': '22K', 'Hallmark BIS Code': 'HUID-948271', 'Clasp Type': 'S-Hook' })
        );

        stmtItem.run(
          'SKU-B-204',
          '100g 999.9 Fine Gold Bar',
          2, 3,
          100, 'g',
          '24K (99.9%)',
          50, 28, 5, 'mm',
          3,
          680000, 715000,
          'Swiss mint certified 999.9 pure gold investment bar with tamper-proof blister pack.',
          '/sample_goldbar.svg',
          JSON.stringify({ 'Mint Brand': 'PAMP Suisse', 'Serial Number': 'AU-9918234', 'Certificate Enclosed': 'Yes' })
        );

        stmtItem.run(
          'SKU-R-302',
          '18K Diamond Solitaire Engagement Ring',
          1, 2,
          6.2, 'g',
          '18K (75.0%)',
          20, 20, 8, 'mm',
          2,
          85000, 110000,
          'VVS1 Grade 0.8ct solitaire diamond set in 18K white gold.',
          '/sample_ring.svg',
          JSON.stringify({ 'Ring Size (US/IN)': 7, 'Gemstone Type': 'Diamond VVS1', 'Stone Carat Weight': 0.8 })
        );

        stmtItem.finalize(() => {
          console.log('Sample stock items successfully seeded into SQLite.');
        });
      });
    });
  });
}

export default db;
