import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { requireAuth, requireGM } from './middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads');
const VALID_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const SHEET_BG_FOLDER = 'pc-sheet-bg';
const RASTER_OPTIMIZE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const EXCLUDED_SHEET_BG_BASES = new Set(['bw-forested-mtn']);
const SHEET_BG_CURATED_LABELS = {
  'bw-forested': 'Forested (Original)',
  dragon1: 'Dragon',
  'snow-mtn': 'Snow Mountain',
};
const SHEET_BG_ORDER = ['bw-forested', 'dragon1', 'snow-mtn'];

export function formatSheetBgLabel(baseName) {
  if (SHEET_BG_CURATED_LABELS[baseName]) {
    return SHEET_BG_CURATED_LABELS[baseName];
  }
  const spaced = String(baseName || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spaced) return 'Custom Background';
  return spaced.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export async function optimizeSheetBgImage(sourcePath, targetDir, originalName, { removeSource = true } = {}) {
  const ext = path.extname(sourcePath).toLowerCase();
  if (!RASTER_OPTIMIZE_EXTENSIONS.has(ext)) {
    return sourcePath;
  }

  const rawBase = path.parse(originalName || path.basename(sourcePath)).name;
  const cleanBase = rawBase
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `sheet-bg-${Date.now()}`;

  let finalPath = path.join(targetDir, `${cleanBase}.webp`);
  if (removeSource && finalPath !== sourcePath && fs.existsSync(finalPath)) {
    finalPath = path.join(targetDir, `${cleanBase}-${Date.now()}.webp`);
  }

  const tempOutPath = path.join(targetDir, `.${cleanBase}-${Date.now()}-${Math.round(Math.random() * 1e6)}.tmp.webp`);
  try {
    await sharp(sourcePath)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(tempOutPath);

    fs.renameSync(tempOutPath, finalPath);
    if (removeSource && sourcePath !== finalPath && fs.existsSync(sourcePath)) {
      fs.unlinkSync(sourcePath);
    }
    return finalPath;
  } catch (err) {
    if (fs.existsSync(tempOutPath)) {
      try {
        fs.unlinkSync(tempOutPath);
      } catch {
        // ignore cleanup error
      }
    }
    throw err;
  }
}

export async function listSheetBackgrounds(uploadDir) {
  const bgDir = path.join(uploadDir, SHEET_BG_FOLDER);
  if (!fs.existsSync(bgDir)) {
    return [];
  }

  let entries = fs.readdirSync(bgDir, { withFileTypes: true });
  const existingWebpBases = new Set(
    entries
      .filter((e) => e.isFile() && !e.name.startsWith('.') && path.extname(e.name).toLowerCase() === '.webp')
      .map((e) => path.parse(e.name).name)
  );

  let optimizedAny = false;
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const baseName = path.parse(entry.name).name;
    if (EXCLUDED_SHEET_BG_BASES.has(baseName)) continue;
    if (RASTER_OPTIMIZE_EXTENSIONS.has(ext) && ext !== '.webp' && !existingWebpBases.has(baseName)) {
      try {
        await optimizeSheetBgImage(path.join(bgDir, entry.name), bgDir, entry.name, { removeSource: false });
        existingWebpBases.add(baseName);
        optimizedAny = true;
      } catch {
        // Ignore unprocessable image files and continue scanning
      }
    }
  }

  if (optimizedAny) {
    entries = fs.readdirSync(bgDir, { withFileTypes: true });
  }

  const byBase = new Map();
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!VALID_IMAGE_EXTENSIONS.has(ext)) continue;
    const baseName = path.parse(entry.name).name;
    if (EXCLUDED_SHEET_BG_BASES.has(baseName)) continue;

    const existing = byBase.get(baseName);
    if (!existing || (ext === '.webp' && existing.ext !== '.webp')) {
      byBase.set(baseName, { name: entry.name, ext });
    }
  }

  return Array.from(byBase.entries())
    .map(([baseName, fileInfo]) => ({
      id: baseName,
      label: formatSheetBgLabel(baseName),
      url: `/uploads/${SHEET_BG_FOLDER}/${fileInfo.name}`,
    }))
    .sort((a, b) => {
      const idxA = SHEET_BG_ORDER.indexOf(a.id);
      const idxB = SHEET_BG_ORDER.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
}

const ASSET_TABLE_COLUMNS = [
  ['adversary_templates', 'token_image_path'],
  ['tokens', 'avatar_url'],
  ['maps', 'background_url'],
  ['character_sheets', 'avatar_url'],
  ['world_markers', 'avatar_url'],
  ['vehicle_templates', 'avatar_url'],
];

function escapeLike(str) {
  return (str || '').replace(/([%_\\])/g, '\\$1');
}

function cascadeUpdateAssetUrl(db, newUrl, oldUrl) {
  const escapedOld = escapeLike(oldUrl);
  for (const [table, col] of ASSET_TABLE_COLUMNS) {
    db.prepare(`
      UPDATE ${table}
      SET ${col} = ? || substr(${col}, length(?) + 1)
      WHERE ${col} = ? OR ${col} LIKE (? || '?%') ESCAPE '\\'
    `).run(newUrl, oldUrl, oldUrl, escapedOld);
  }
}

function cascadeClearAssetUrl(db, targetUrl) {
  const escapedTarget = escapeLike(targetUrl);
  for (const [table, col] of ASSET_TABLE_COLUMNS) {
    db.prepare(`
      UPDATE ${table}
      SET ${col} = ''
      WHERE ${col} = ? OR ${col} LIKE (? || '?%') ESCAPE '\\'
    `).run(targetUrl, escapedTarget);
  }
}

export function sanitizeFolder(folder) {
  if (!folder || typeof folder !== 'string') return '';
  const trimmed = folder.trim().replace(/\\/g, '/');
  const clean = trimmed.replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  const parts = clean.split('/').filter(Boolean);
  if (parts.some((p) => p === '..' || p === '.')) {
    throw new Error('Invalid folder path');
  }
  return parts.join('/');
}

export function sanitizeUploadPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;
  const cleanPath = inputPath.split('?')[0].split('#')[0];
  let clean = cleanPath.trim().replace(/\\/g, '/');
  if (clean.startsWith('/uploads/')) {
    clean = clean.slice('/uploads/'.length);
  } else if (clean.startsWith('uploads/')) {
    clean = clean.slice('uploads/'.length);
  }
  clean = clean.replace(/^\/+|\/+$/g, '');
  if (!clean) return null;
  const parts = clean.split('/').filter(Boolean);
  if (parts.some((p) => p === '..' || p === '.')) {
    return null;
  }
  return parts.join('/');
}

export function scanUploads(dir, baseDir = dir) {
  const files = [];
  const folders = new Set(['']);

  if (!fs.existsSync(dir)) {
    return { files, folders: Array.from(folders) };
  }

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        folders.add(relPath);
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VALID_IMAGE_EXTENSIONS.has(ext)) {
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch {
            continue;
          }
          const relDir = path.dirname(relPath).split(path.sep).join('/');
          const folder = relDir === '.' || relDir === '' ? '' : relDir;
          if (folder) {
            folders.add(folder);
          }
          files.push({
            name: entry.name,
            relativePath: relPath,
            folder: folder,
            url: `/uploads/${relPath}`,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
          });
        }
      }
    }
  }

  walk(dir);

  const sortedFolders = Array.from(folders).sort((a, b) => {
    if (a === '') return -1;
    if (b === '') return 1;
    return a.localeCompare(b);
  });

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return { files, folders: sortedFolders };
}

export function createUploadRouter(customUploadDir, db, io) {
  const uploadDir = customUploadDir || DEFAULT_UPLOADS_DIR;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const gmGuard = db
    ? requireGM(db)
    : (req, res, next) => {
        if (!req.session || !req.session.userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        return res.status(403).json({ error: 'GameMaster access required' });
      };

  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        const rawFolder = req.body?.folder || req.query?.folder || '';
        const targetSubfolder = sanitizeFolder(rawFolder);
        const targetDir = targetSubfolder ? path.resolve(uploadDir, targetSubfolder) : uploadDir;
        const relativeToRoot = path.relative(uploadDir, targetDir);
        if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
          return cb(new Error('Invalid folder path'));
        }
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        cb(null, targetDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!VALID_IMAGE_EXTENSIONS.has(ext)) {
        return cb(new Error(`Invalid file type: ${ext}. Only image files (${Array.from(VALID_IMAGE_EXTENSIONS).join(', ')}) are allowed.`));
      }
      cb(null, true);
    },
  });

  const router = Router();
  router.use(requireAuth);

  router.get('/files', (_req, res) => {
    try {
      const result = scanUploads(uploadDir);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/pc-sheet-bg', async (_req, res) => {
    try {
      const backgrounds = await listSheetBackgrounds(uploadDir);
      res.json({ backgrounds });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/', gmGuard, (req, res) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (path.extname(file.path).toLowerCase() === '.svg') {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          const decoded = content
            .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(dec))
            .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
          
          const dangerousPatterns = [
            /<\s*[a-zA-Z0-9_:-]*script\b/i,
            /<\s*[a-zA-Z0-9_:-]*animate\b/i,
            /<\s*[a-zA-Z0-9_:-]*set\b/i,
            /<\s*[a-zA-Z0-9_:-]*foreignObject\b/i,
            /<\s*[a-zA-Z0-9_:-]*handler\b/i,
            /<\s*[a-zA-Z0-9_:-]*use\b[^>]*href\s*=\s*['"]?javascript:/i,
            /xmlns:[a-zA-Z0-9_.-]+\s*=\s*['"][^'"]*(script|ecmascript|javascript)/i,
            /<!ENTITY\b/i,
            /\bon\w+\s*=/i,
            /javascript\s*:/i,
            /data\s*:/i,
            /&#/
          ];

          const isMalicious = dangerousPatterns.some(pat => pat.test(content) || pat.test(decoded));

          if (isMalicious) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'SVG contains malicious scripts or event handlers' });
          }
        } catch {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(400).json({ error: 'Failed to process SVG file' });
        }
      }

      try {
        const rawFolder = req.body?.folder || req.query?.folder || '';
        const targetSubfolder = sanitizeFolder(rawFolder);
        const targetDir = targetSubfolder ? path.resolve(uploadDir, targetSubfolder) : uploadDir;
        const relativeToRoot = path.relative(uploadDir, targetDir);
        if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(400).json({ error: 'Invalid folder path' });
        }
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const targetPath = path.join(targetDir, path.basename(file.path));
        if (file.path !== targetPath) {
          fs.renameSync(file.path, targetPath);
          file.path = targetPath;
        }
        if (targetSubfolder.toLowerCase() === SHEET_BG_FOLDER) {
          try {
            file.path = await optimizeSheetBgImage(file.path, targetDir, file.originalname, { removeSource: true });
          } catch (optErr) {
            console.warn('[upload] Could not optimize pc-sheet-bg image:', optErr.message);
          }
        }
      } catch (folderErr) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: folderErr.message });
      }

      const relPath = path.relative(uploadDir, file.path).split(path.sep).join('/');
      const publicUrl = `/uploads/${relPath}`;
      res.json({ url: publicUrl });
    });
  });

  router.put('/rename', gmGuard, (req, res) => {
    try {
      const oldPath = req.body?.oldPath || req.body?.oldUrl;
      const newName = req.body?.newName;

      const relSource = sanitizeUploadPath(oldPath);
      if (!relSource) {
        return res.status(400).json({ error: 'Invalid or missing oldPath' });
      }

      if (!newName || typeof newName !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing newName' });
      }

      const trimmedNewName = newName.trim();
      if (
        trimmedNewName.includes('/') ||
        trimmedNewName.includes('\\') ||
        trimmedNewName.includes('..') ||
        trimmedNewName === '.'
      ) {
        return res.status(400).json({ error: 'Invalid newName' });
      }

      const ext = path.extname(trimmedNewName).toLowerCase();
      if (!VALID_IMAGE_EXTENSIONS.has(ext)) {
        return res.status(400).json({ error: 'Invalid file extension' });
      }

      const sourcePath = path.resolve(uploadDir, relSource);
      const relativeSource = path.relative(uploadDir, sourcePath);
      if (relativeSource.startsWith('..') || path.isAbsolute(relativeSource)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      const targetPath = path.join(path.dirname(sourcePath), trimmedNewName);
      const relativeTarget = path.relative(uploadDir, targetPath);
      if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        return res.status(404).json({ error: 'Source file not found' });
      }

      if (fs.existsSync(targetPath)) {
        return res.status(409).json({ error: 'Target file already exists' });
      }

      fs.renameSync(sourcePath, targetPath);

      const oldRel = path.relative(uploadDir, sourcePath).split(path.sep).join('/');
      const newRel = path.relative(uploadDir, targetPath).split(path.sep).join('/');
      const oldUrl = `/uploads/${oldRel}`;
      const newUrl = `/uploads/${newRel}`;

      if (db) {
        const cascadeRename = db.transaction((toUrl, fromUrl) => {
          cascadeUpdateAssetUrl(db, toUrl, fromUrl);
        });
        cascadeRename(newUrl, oldUrl);
      }

      if (io) {
        io.emit('token:asset-renamed', { oldUrl, newUrl });
        io.emit('map:asset-renamed', { oldUrl, newUrl });
      }

      res.json({ success: true, oldUrl, newUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/move', gmGuard, (req, res) => {
    try {
      const rawSource = req.body?.sourcePath || req.body?.sourceUrl || req.body?.oldPath || req.body?.oldUrl;
      const relSource = sanitizeUploadPath(rawSource);
      if (!relSource) {
        return res.status(400).json({ error: 'Invalid or missing sourcePath' });
      }

      const sourceFullPath = path.resolve(uploadDir, relSource);
      const relativeSource = path.relative(uploadDir, sourceFullPath);
      if (relativeSource.startsWith('..') || path.isAbsolute(relativeSource)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      const rawDestFolder = req.body?.destinationFolder ?? req.body?.destinationPath ?? req.body?.targetFolder ?? '';
      let targetDestFolder;
      try {
        targetDestFolder = sanitizeFolder(rawDestFolder);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      const destDir = targetDestFolder ? path.resolve(uploadDir, targetDestFolder) : uploadDir;
      const relativeDest = path.relative(uploadDir, destDir);
      if (relativeDest.startsWith('..') || path.isAbsolute(relativeDest)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      if (!fs.existsSync(sourceFullPath) || !fs.statSync(sourceFullPath).isFile()) {
        return res.status(404).json({ error: 'Source file not found' });
      }

      const targetFilename = path.basename(sourceFullPath);
      const destFullPath = path.join(destDir, targetFilename);
      const relativeTarget = path.relative(uploadDir, destFullPath);
      if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fs.existsSync(destFullPath)) {
        return res.status(409).json({ error: 'Target file already exists' });
      }

      fs.renameSync(sourceFullPath, destFullPath);

      const oldRel = path.relative(uploadDir, sourceFullPath).split(path.sep).join('/');
      const newRel = path.relative(uploadDir, destFullPath).split(path.sep).join('/');
      const oldUrl = `/uploads/${oldRel}`;
      const newUrl = `/uploads/${newRel}`;

      if (db) {
        const cascadeMove = db.transaction((toUrl, fromUrl) => {
          cascadeUpdateAssetUrl(db, toUrl, fromUrl);
        });
        cascadeMove(newUrl, oldUrl);
      }

      if (io) {
        io.emit('token:asset-renamed', { oldUrl, newUrl });
        io.emit('map:asset-renamed', { oldUrl, newUrl });
      }

      return res.json({ success: true, oldUrl, newUrl });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/folder', gmGuard, (req, res) => {
    try {
      const rawFolder = req.body?.folder;
      if (rawFolder === undefined || rawFolder === null || typeof rawFolder !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing folder name' });
      }

      let sanitizedFolder;
      try {
        sanitizedFolder = sanitizeFolder(rawFolder);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!sanitizedFolder) {
        return res.status(400).json({ error: 'Invalid or missing folder name' });
      }

      const targetDir = path.resolve(uploadDir, sanitizedFolder);
      const relativeToRoot = path.relative(uploadDir, targetDir);
      if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        return res.status(400).json({ error: 'Invalid folder path' });
      }

      if (fs.existsSync(targetDir)) {
        return res.status(409).json({ error: 'Folder already exists' });
      }

      fs.mkdirSync(targetDir, { recursive: true });
      return res.status(201).json({ success: true, folder: sanitizedFolder });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.delete('/folder', gmGuard, (req, res) => {
    try {
      const rawFolder = req.query?.folder !== undefined ? req.query.folder : req.body?.folder;
      if (rawFolder === undefined || rawFolder === null || typeof rawFolder !== 'string') {
        return res.status(400).json({ error: 'Cannot delete root folder' });
      }

      let sanitizedFolder;
      try {
        sanitizedFolder = sanitizeFolder(rawFolder);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!sanitizedFolder) {
        return res.status(400).json({ error: 'Cannot delete root folder' });
      }

      const targetDir = path.resolve(uploadDir, sanitizedFolder);
      const relativeToRoot = path.relative(uploadDir, targetDir);
      if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        return res.status(400).json({ error: 'Invalid folder path' });
      }

      if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const entries = fs.readdirSync(targetDir);
      const nonHidden = entries.filter((e) => !e.startsWith('.'));
      if (nonHidden.length > 0) {
        return res.status(400).json({ error: 'Folder is not empty' });
      }

      fs.rmSync(targetDir, { recursive: true, force: true });
      return res.json({ success: true, folder: sanitizedFolder });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.delete('/file', gmGuard, (req, res) => {
    try {
      const rawPath = req.query?.path || req.body?.path || req.body?.url;
      const relPath = sanitizeUploadPath(rawPath);
      if (!relPath) {
        return res.status(400).json({ error: 'Invalid or missing file path' });
      }

      const filePath = path.resolve(uploadDir, relPath);
      const relativePath = path.relative(uploadDir, filePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(400).json({ error: 'Invalid file path' });
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return res.status(404).json({ error: 'File not found' });
      }

      fs.unlinkSync(filePath);

      const targetRel = path.relative(uploadDir, filePath).split(path.sep).join('/');
      const targetUrl = `/uploads/${targetRel}`;

      if (db) {
        const cascadeDelete = db.transaction((toClear) => {
          cascadeClearAssetUrl(db, toClear);
        });
        cascadeDelete(targetUrl);
      }

      if (io) {
        io.emit('token:asset-deleted', { url: targetUrl });
        io.emit('map:asset-deleted', { url: targetUrl });
      }

      res.json({ success: true, url: targetUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
