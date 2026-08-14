import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded image files
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve built frontend client if available
const clientDistDir = path.join(__dirname, '../../stock-manager-client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'stock-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Helper to run DB queries with Promises
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});

app.get('/healthz', async (req, res) => {
  try {
    await dbGet('SELECT 1 AS healthy');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'unavailable' });
  }
});

// ==================== ROUTES ====================

// 1. Photo Upload Endpoint (Handles both multipart file & base64 camera snap)
app.post('/api/upload', upload.single('photo'), (req, res) => {
  try {
    if (req.file) {
      return res.json({ success: true, url: `/uploads/${req.file.filename}` });
    }
    // Handle camera base64 data URL
    if (req.body.base64Image) {
      const base64Data = req.body.base64Image.replace(/^data:image\/\w+;base64,/, '');
      const filename = `stock-cam-${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
      return res.json({ success: true, url: `/uploads/${filename}` });
    }
    return res.status(400).json({ error: 'No image file or camera capture provided' });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

// 2. Categories & Subcategories Endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await dbAll('SELECT * FROM categories ORDER BY name ASC');
    const subcategories = await dbAll('SELECT * FROM subcategories ORDER BY name ASC');

    const result = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category_id === cat.id).map(s => ({
        ...s,
        custom_fields: JSON.parse(s.custom_fields || '[]')
      }))
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const result = await dbRun(
      'INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)',
      [name, description || '', icon || 'Package']
    );
    res.json({ id: result.lastID, name, description, icon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subcategories', async (req, res) => {
  try {
    const { category_id, name, description, custom_fields } = req.body;
    if (!category_id || !name) return res.status(400).json({ error: 'Category ID and Subcategory Name are required' });

    const fieldsJson = JSON.stringify(custom_fields || []);
    const result = await dbRun(
      'INSERT INTO subcategories (category_id, name, description, custom_fields) VALUES (?, ?, ?, ?)',
      [category_id, name, description || '', fieldsJson]
    );
    res.json({ id: result.lastID, category_id, name, description, custom_fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subcategories/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM subcategories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Stock Items Endpoints
app.get('/api/items', async (req, res) => {
  try {
    const { search, category_id, subcategory_id, purity, sort } = req.query;

    let query = `
      SELECT i.*, c.name as category_name, s.name as subcategory_name 
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories s ON i.subcategory_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (i.name LIKE ? OR i.item_code LIKE ? OR i.notes LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (category_id) {
      query += ` AND i.category_id = ?`;
      params.push(category_id);
    }
    if (subcategory_id) {
      query += ` AND i.subcategory_id = ?`;
      params.push(subcategory_id);
    }
    if (purity) {
      query += ` AND i.purity = ?`;
      params.push(purity);
    }

    if (sort === 'weight_desc') query += ` ORDER BY i.weight DESC`;
    else if (sort === 'weight_asc') query += ` ORDER BY i.weight ASC`;
    else if (sort === 'price_desc') query += ` ORDER BY i.selling_price DESC`;
    else if (sort === 'price_asc') query += ` ORDER BY i.selling_price ASC`;
    else if (sort === 'name_asc') query += ` ORDER BY i.name ASC`;
    else query += ` ORDER BY i.created_at DESC`;

    const items = await dbAll(query, params);

    const formattedItems = items.map(item => ({
      ...item,
      extra_attributes: JSON.parse(item.extra_attributes || '{}')
    }));

    res.json(formattedItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await dbGet(`
      SELECT i.*, c.name as category_name, s.name as subcategory_name 
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories s ON i.subcategory_id = s.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.extra_attributes = JSON.parse(item.extra_attributes || '{}');
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const {
      item_code, name, category_id, subcategory_id, weight, weight_unit,
      purity, length, width, height, dimension_unit, quantity,
      purchase_price, selling_price, notes, image_path, extra_attributes
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Item name is required' });

    const code = item_code || `SKU-${Date.now().toString().slice(-6)}`;
    const extraJson = JSON.stringify(extra_attributes || {});

    const result = await dbRun(`
      INSERT INTO items (
        item_code, name, category_id, subcategory_id, weight, weight_unit,
        purity, length, width, height, dimension_unit, quantity, purchase_price,
        selling_price, notes, image_path, extra_attributes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code, name, category_id || null, subcategory_id || null, weight || 0, weight_unit || 'g',
      purity || 'N/A', length || 0, width || 0, height || 0, dimension_unit || 'mm',
      quantity || 1, purchase_price || 0, selling_price || 0, notes || '',
      image_path || '', extraJson
    ]);

    res.json({ id: result.lastID, item_code: code, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    const {
      item_code, name, category_id, subcategory_id, weight, weight_unit,
      purity, length, width, height, dimension_unit, quantity,
      purchase_price, selling_price, notes, image_path, extra_attributes
    } = req.body;

    const extraJson = JSON.stringify(extra_attributes || {});

    await dbRun(`
      UPDATE items SET
        item_code = ?, name = ?, category_id = ?, subcategory_id = ?, weight = ?, weight_unit = ?,
        purity = ?, length = ?, width = ?, height = ?, dimension_unit = ?, quantity = ?,
        purchase_price = ?, selling_price = ?, notes = ?, image_path = ?, extra_attributes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      item_code, name, category_id, subcategory_id, weight, weight_unit,
      purity, length, width, height, dimension_unit, quantity,
      purchase_price, selling_price, notes, image_path, extraJson,
      req.params.id
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Reports & Analytics Summary Endpoint
app.get('/api/reports', async (req, res) => {
  try {
    const totalCount = await dbGet('SELECT COUNT(*) as count, SUM(quantity) as total_qty FROM items');
    const totalValuation = await dbGet('SELECT SUM(purchase_price * quantity) as cost_val, SUM(selling_price * quantity) as retail_val FROM items');
    const totalWeight = await dbGet('SELECT SUM(weight * quantity) as total_grams FROM items WHERE weight_unit = "g"');

    const byCategory = await dbAll(`
      SELECT c.name as category_name, COUNT(i.id) as item_count, SUM(i.selling_price * i.quantity) as total_value
      FROM categories c
      LEFT JOIN items i ON c.id = i.category_id
      GROUP BY c.id
    `);

    const byPurity = await dbAll(`
      SELECT purity, COUNT(*) as count, SUM(weight * quantity) as weight_sum
      FROM items
      GROUP BY purity
    `);

    const recentItems = await dbAll(`
      SELECT i.*, c.name as category_name 
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      ORDER BY i.created_at DESC LIMIT 5
    `);

    res.json({
      summary: {
        total_items: totalCount.count || 0,
        total_quantity: totalCount.total_qty || 0,
        total_cost_valuation: totalValuation.cost_val || 0,
        total_retail_valuation: totalValuation.retail_val || 0,
        total_weight_grams: totalWeight.total_grams || 0
      },
      byCategory,
      byPurity,
      recentItems: recentItems.map(item => ({ ...item, extra_attributes: JSON.parse(item.extra_attributes || '{}') }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA Fallback Route for non-API requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const clientIndex = path.join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(clientIndex)) {
    return res.sendFile(clientIndex);
  }
  res.send('Stock Manager API Server is running. Frontend build ready.');
});

app.listen(PORT, () => {
  console.log(`Stock Manager REST API listening on port ${PORT}`);
});
