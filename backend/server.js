const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();



const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.get('/', (req, res) => {
  res.send('Markdown File Upload API');
});

// List uploaded .md files
app.get('/files', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ name: f }));
  res.json(files);
});

// Upload .md file
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const newName = req.file.originalname;
  const newPath = path.join(UPLOAD_DIR, newName);
  fs.renameSync(req.file.path, newPath);
  res.json({ file: newName });
});

// Get raw content of a file
app.get('/files/:name', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Type', 'text/plain');
  res.send(fs.readFileSync(filePath, 'utf-8'));
});

// Extract tables from markdown file
app.get('/files/:name/table', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const content = fs.readFileSync(filePath, 'utf-8');
  const tables = extractTablesFromMarkdown(content);

  res.json({ tables });
});

// Delete a file
app.delete('/files/:name', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Helper: Extract all tables from markdown as arrays of objects
function extractTablesFromMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Match table header
    if (/^\|.*\|$/.test(line)) {
      const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
      
      // Match alignment line like |---|---| or |:---|:---:|---:|
      if (/^\|?(\s*:?-+:?\s*\|)+\s*$/.test(nextLine)) {
        const headers = line.slice(1, -1).split('|').map(h => h.trim());
        const rows = [];
        i += 2;

        // Process subsequent table rows
        while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
          const rowCells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim());
          const rowObj = {};
          headers.forEach((header, idx) => {
            rowObj[header] = rowCells[idx] || '';
          });
          rows.push(rowObj);
          i++;
        }

        tables.push({ headers, rows });
        continue;
      }
    }

    i++;
  }

  return tables;
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
