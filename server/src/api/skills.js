import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';
import { extractPdfText } from '../lib/pdfExtract.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '../../skills');
const OFFICIAL_DIR = path.join(SKILLS_DIR, 'official');

// Lazy-load multer
let upload;
try {
  const { default: multer } = await import('multer');
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
} catch { upload = null; }

// ── Revision helpers ─────────────────────────────────────────────────────────
// Every committed state (create/edit/revert) of a custom skill is snapshotted
// into `custom_skill_revisions`. We do this best-effort — a snapshot failure
// is logged but does not fail the parent write, since a missing audit row
// is far less harmful than a lost user edit. Run sql/custom_skill_revisions.sql
// once on each Supabase project to enable.

const nextRevisionVersion = async (skillId) => {
  const { data, error } = await supabase
    .from('custom_skill_revisions')
    .select('version')
    .eq('skill_id', skillId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[skills] nextRevisionVersion error:', error.message);
    return 1;
  }
  return (data?.version || 0) + 1;
};

const writeRevision = async (skillRow, { source = 'edit', revertedFrom = null } = {}) => {
  if (!supabase) return null;
  try {
    const version = await nextRevisionVersion(skillRow.id);
    const { error } = await supabase.from('custom_skill_revisions').insert({
      skill_id: skillRow.id,
      fb_user_id: skillRow.fb_user_id,
      version,
      name: skillRow.name,
      description: skillRow.description || '',
      content: skillRow.content || '',
      icon: skillRow.icon || 'sparkles',
      type: skillRow.type || 'strategy',
      preview: skillRow.preview || '',
      source,
      reverted_from: revertedFrom,
    });
    if (error) {
      console.warn('[skills] writeRevision insert error:', error.message);
      return null;
    }
    return version;
  } catch (e) {
    console.warn('[skills] writeRevision threw:', e?.message || e);
    return null;
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseMd = (content, filename) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { id: filename.replace('.md', ''), name: filename.replace('.md', ''), description: '', content, icon: 'sparkles' };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  });
  return {
    id: filename.replace('.md', ''),
    name: meta.name || filename.replace('.md', ''),
    description: meta.description || '',
    icon: meta.icon || 'sparkles',
    type: meta.type || 'workflow',
    preview: meta.preview || '',
    starterPrompt: meta.starter_prompt || '',
    content: match[2].trim(),
  };
};

// Read all .md skills from a directory, optionally recursing into subfolders.
// When recursive, each file's id is prefixed with its subfolder ("meta/campaigns").
const readSkillsFrom = async (dir, extraProps = {}, { recursive = false, prefix = '' } = {}) => {
  const skills = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && recursive) {
        const subSkills = await readSkillsFrom(fullPath, extraProps, { recursive: true, prefix: prefix ? `${prefix}/${entry.name}` : entry.name });
        skills.push(...subSkills);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const content = await fs.readFile(fullPath, 'utf-8');
      const skill = parseMd(content, entry.name);
      if (prefix) skill.id = `${prefix}/${skill.id}`;
      const stat = await fs.stat(fullPath);
      Object.assign(skill, { updatedAt: stat.mtime.toISOString(), ...extraProps });
      skills.push(skill);
    }
  } catch {}
  return skills;
};

// User resolution comes from the shared middleware — same logic everywhere
// (cookie session preferred, Bearer fallback).
import { resolveUser } from '../middleware/resolveUser.js';
router.use(resolveUser);

// ── Routes ───────────────────────────────────────────────────────────────────

// POST /api/skills/generate
router.post('/generate', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI generation not configured' });
    const genAI = new GoogleGenAI({ apiKey });
    const raw = (req.body.rawText || '').slice(0, 8000);
    if (!raw.trim()) return res.status(400).json({ error: 'No text provided' });

    const result = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert at creating AI analysis strategies for Facebook ad data. Convert the following text into a structured analysis strategy.\n\nReturn ONLY valid JSON with these fields:\n- name (string, 2-5 words)\n- description (string, one sentence)\n- preview (string, 2-3 lines showing sample output)\n- content (string, full markdown instructions for the AI)\n\nText:\n${raw}`,
      config: { responseMimeType: 'application/json', responseSchema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, preview: { type: 'string' }, content: { type: 'string' } }, required: ['name', 'description', 'content'] } },
    });

    const parsed = JSON.parse(result.text);
    if (!parsed?.name || !parsed?.content) return res.status(500).json({ error: 'AI returned invalid structure' });
    res.json({ name: parsed.name, description: parsed.description, preview: parsed.preview || '', content: parsed.content });
  } catch (err) {
    console.error('[skills/generate] error:', err.message);
    res.status(500).json({ error: 'Failed to generate skill: ' + err.message });
  }
});

// POST /api/skills/enrich — generate description + preview for an existing skill (keeps content)
router.post('/enrich', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI not configured' });
    const { name, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Given this AI skill named "${name || 'Unnamed'}", write a short description and a 2-3 line sample output preview.\n\nReturn JSON:\n- description (string, one sentence explaining what the skill does)\n- preview (string, 2-3 lines of example output the AI would produce)\n\nSkill content:\n${content.slice(0, 6000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: { description: { type: 'string' }, preview: { type: 'string' } },
          required: ['description', 'preview'],
        },
      },
    });

    const parsed = JSON.parse(result.text);
    res.json({ description: parsed.description || '', preview: parsed.preview || '' });
  } catch (err) {
    console.error('[skills/enrich] error:', err.message);
    res.status(500).json({ error: 'Failed to enrich: ' + err.message });
  }
});

// GET /api/skills — official (from files) + user's custom (from Supabase)
router.get('/', async (req, res) => {
  try {
    const skills = [];

    // 1. Official skills (from filesystem)
    const officialSkills = await readSkillsFrom(OFFICIAL_DIR, { isDefault: true, visibility: 'official' });
    skills.push(...officialSkills);

    // 2. User's custom skills (from Supabase)
    if (supabase && req.fbUserId) {
      const { data, error } = await supabase
        .from('custom_skills')
        .select('*')
        .eq('fb_user_id', req.fbUserId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        // Fetch latest revision version per skill in one round-trip. Postgres
        // doesn't expose a clean GROUP BY through PostgREST, so we pull just
        // (skill_id, version), order by version desc, and keep the first
        // hit per skill. N is small (= number of revisions for this user)
        // so a JS reduce is fine.
        const versionMap = {};
        try {
          const { data: revs } = await supabase
            .from('custom_skill_revisions')
            .select('skill_id, version')
            .eq('fb_user_id', req.fbUserId)
            .order('version', { ascending: false });
          for (const r of revs || []) {
            if (versionMap[r.skill_id] === undefined) versionMap[r.skill_id] = r.version;
          }
        } catch (e) {
          console.warn('[skills] failed to load versions for list:', e?.message || e);
        }

        for (const row of data) {
          skills.push({
            id: row.id,
            name: row.name,
            description: row.description || '',
            content: row.content || '',
            icon: row.icon || 'sparkles',
            type: row.type || 'strategy',
            preview: row.preview || '',
            isDefault: false,
            visibility: 'custom',
            version: versionMap[row.id] || null,
            updatedAt: row.updated_at,
          });
        }
      }
    }

    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check Supabase first (custom skills)
    if (supabase && req.fbUserId) {
      const { data } = await supabase
        .from('custom_skills')
        .select('*')
        .eq('id', id)
        .eq('fb_user_id', req.fbUserId)
        .single();

      if (data) {
        return res.json({
          id: data.id, name: data.name, description: data.description || '',
          content: data.content || '', icon: data.icon || 'sparkles',
          isDefault: false, visibility: 'custom', updatedAt: data.updated_at,
        });
      }
    }

    // Check official (flat) + system (subfolder-organized) files
    const SYSTEM_DIR = path.join(SKILLS_DIR, 'system');
    // Official: flat filename
    try {
      const content = await fs.readFile(path.join(OFFICIAL_DIR, `${id}.md`), 'utf-8');
      const skill = parseMd(content, `${id}.md`);
      Object.assign(skill, { isDefault: true, visibility: 'official' });
      return res.json(skill);
    } catch {}
    // System: support "meta/campaigns" (namespaced) or bare "campaigns" (search shared/meta/google)
    const systemCandidates = id.includes('/')
      ? [path.join(SYSTEM_DIR, `${id}.md`)]
      : ['shared', 'meta', 'google'].map(sub => path.join(SYSTEM_DIR, sub, `${id}.md`));
    for (const fp of systemCandidates) {
      try {
        const content = await fs.readFile(fp, 'utf-8');
        const skill = parseMd(content, `${id}.md`);
        Object.assign(skill, { isDefault: false, visibility: 'system', id });
        return res.json(skill);
      } catch {}
    }

    res.status(404).json({ error: 'Skill not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills — create custom skill (Supabase)
router.post('/', async (req, res) => {
  try {
    const { name, description, content, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    // Check if exists
    const { data: existing } = await supabase
      .from('custom_skills')
      .select('id')
      .eq('id', id)
      .eq('fb_user_id', fbUserId)
      .single();

    if (existing) return res.status(409).json({ error: 'A skill with this name already exists' });

    const row = {
      id,
      fb_user_id: fbUserId,
      name,
      description: description || '',
      content: content || '',
      icon: icon || 'sparkles',
      type: req.body.type || 'strategy',
      preview: req.body.preview || '',
    };

    const { error } = await supabase.from('custom_skills').insert(row);
    if (error) {
      console.error('[skills] POST / insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Snapshot v1 — fire-and-forget but await so we surface errors in dev.
    const version = await writeRevision(row, { source: 'create' });

    console.log('[skills] Created skill:', row.id, row.name);
    res.json({ ...row, isDefault: false, visibility: 'custom', version: version || 1, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[skills] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/skills/:id — update custom skill
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, content, icon } = req.body;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const updates = {
      name: name || id,
      description: description || '',
      content: content || '',
      icon: icon || 'sparkles',
      type: req.body.type || 'strategy',
      preview: req.body.preview || '',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('custom_skills')
      .update(updates)
      .eq('id', id)
      .eq('fb_user_id', fbUserId);

    if (error) return res.status(500).json({ error: error.message });

    // Snapshot the new committed state. We pass the post-update row so each
    // revision answers the question "what did v3 look like?" rather than
    // "what changed at v3?". Diff UI can compute the delta from neighbours.
    const version = await writeRevision({ id, fb_user_id: fbUserId, ...updates }, { source: 'edit' });

    res.json({ id, ...updates, isDefault: false, visibility: 'custom', version, updatedAt: updates.updated_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/:id/revisions — list version history (newest first)
//
// Returns the stored snapshots in descending version order. We trim
// `content` to a 240-char preview in the list payload so a skill with a
// 50KB instruction blob doesn't ship the full body N times. The single-
// revision endpoint below returns full content for diff/restore.
router.get('/:id/revisions', async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });
    const { id } = req.params;
    const fbUserId = req.fbUserId || '_anonymous';

    const { data, error } = await supabase
      .from('custom_skill_revisions')
      .select('id, version, name, description, content, icon, type, preview, source, reverted_from, created_at')
      .eq('skill_id', id)
      .eq('fb_user_id', fbUserId)
      .order('version', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const revisions = (data || []).map(r => ({
      id: r.id,
      version: r.version,
      name: r.name,
      description: r.description,
      icon: r.icon,
      type: r.type,
      preview: r.preview,
      source: r.source,
      revertedFrom: r.reverted_from,
      createdAt: r.created_at,
      contentPreview: (r.content || '').slice(0, 240),
      contentLength: (r.content || '').length,
    }));
    res.json({ revisions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/:id/revisions/:version — fetch one full snapshot
router.get('/:id/revisions/:version', async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });
    const { id, version } = req.params;
    const fbUserId = req.fbUserId || '_anonymous';

    const { data, error } = await supabase
      .from('custom_skill_revisions')
      .select('*')
      .eq('skill_id', id)
      .eq('fb_user_id', fbUserId)
      .eq('version', Number(version))
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Revision not found' });
    res.json({ revision: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills/:id/revert — restore a previous version
//
// Restoring v3 doesn't rewrite history: it copies v3's payload onto the
// live row and writes a brand-new revision (vN+1, source='revert',
// reverted_from=3). That way the audit trail stays append-only and the
// user can always undo the undo.
router.post('/:id/revert', async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });
    const { id } = req.params;
    const { version } = req.body || {};
    if (!version) return res.status(400).json({ error: 'version is required' });
    const fbUserId = req.fbUserId || '_anonymous';

    const { data: rev, error: revErr } = await supabase
      .from('custom_skill_revisions')
      .select('*')
      .eq('skill_id', id)
      .eq('fb_user_id', fbUserId)
      .eq('version', Number(version))
      .maybeSingle();
    if (revErr) return res.status(500).json({ error: revErr.message });
    if (!rev) return res.status(404).json({ error: 'Revision not found' });

    const updates = {
      name: rev.name,
      description: rev.description || '',
      content: rev.content || '',
      icon: rev.icon || 'sparkles',
      type: rev.type || 'strategy',
      preview: rev.preview || '',
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from('custom_skills')
      .update(updates)
      .eq('id', id)
      .eq('fb_user_id', fbUserId);
    if (upErr) return res.status(500).json({ error: upErr.message });

    const newVersion = await writeRevision({ id, fb_user_id: fbUserId, ...updates }, { source: 'revert', revertedFrom: rev.version });

    res.json({
      id,
      ...updates,
      isDefault: false,
      visibility: 'custom',
      version: newVersion,
      updatedAt: updates.updated_at,
      revertedFrom: rev.version,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/skills/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const { error } = await supabase
      .from('custom_skills')
      .delete()
      .eq('id', id)
      .eq('fb_user_id', fbUserId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills/upload-doc — extract text from PDF/DOC/XLS then generate skill via AI
if (upload) {
  router.post('/upload-doc', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const { originalname, mimetype, buffer } = req.file;
      let text = '';

      if (mimetype === 'application/pdf') {
        text = await extractPdfText(buffer);
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'application/vnd.ms-excel'
      ) {
        // Excel: lazy-load xlsx
        try {
          const { createRequire } = await import('module');
          const req2 = createRequire(import.meta.url);
          const XLSX = req2('xlsx');
          const wb = XLSX.read(buffer, { type: 'buffer' });
          const lines = [];
          wb.SheetNames.forEach(name => {
            const sheet = wb.Sheets[name];
            lines.push(`## Sheet: ${name}`);
            lines.push(XLSX.utils.sheet_to_csv(sheet));
          });
          text = lines.join('\n');
        } catch {
          text = buffer.toString('utf-8');
        }
      } else {
        text = buffer.toString('utf-8');
      }

      text = text.replace(/\s+/g, ' ').trim().slice(0, 12000);
      if (!text) return res.status(400).json({ error: 'Could not extract text from file' });

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'AI generation not configured' });

      const genAI = new GoogleGenAI({ apiKey });
      const result = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are an expert at creating AI analysis strategies for Facebook ad managers. The user has uploaded a document. Convert its content into a useful, reusable skill for an AI ad assistant.\n\nReturn ONLY valid JSON:\n- name (string, 2-5 words)\n- description (string, one sentence)\n- preview (string, 2-3 lines showing sample output)\n- content (string, full markdown instructions for the AI)\n\nDocument (from "${originalname}"):\n${text}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: { name: { type: 'string' }, description: { type: 'string' }, preview: { type: 'string' }, content: { type: 'string' } },
            required: ['name', 'description', 'content'],
          },
        },
      });

      const parsed = JSON.parse(result.text);
      if (!parsed?.name || !parsed?.content) return res.status(500).json({ error: 'AI returned invalid structure' });
      res.json({ name: parsed.name, description: parsed.description || '', preview: parsed.preview || '', content: parsed.content });
    } catch (err) {
      console.error('[skills/upload-doc] error:', err.message);
      res.status(500).json({ error: 'Failed to process file: ' + err.message });
    }
  });
}

export default router;
