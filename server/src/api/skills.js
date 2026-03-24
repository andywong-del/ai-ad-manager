import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '../../skills');
const DEFAULT_DIR = path.join(SKILLS_DIR, 'default');
const CUSTOM_DIR = path.join(SKILLS_DIR, 'custom');

// Parse .md frontmatter (---\nkey: value\n---) + body
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
    content: match[2].trim(),
  };
};

// Build .md file from data
const buildMd = (data) => {
  return `---\nname: ${data.name}\ndescription: ${data.description || ''}\nicon: ${data.icon || 'sparkles'}\n---\n\n${data.content || ''}`;
};

// Ensure custom dir exists
const ensureCustomDir = async () => {
  try { await fs.mkdir(CUSTOM_DIR, { recursive: true }); } catch {}
};

// GET /api/skills — list all skills (default + custom)
router.get('/', async (_req, res) => {
  try {
    const skills = [];

    // Read default skills
    try {
      const defaultFiles = await fs.readdir(DEFAULT_DIR);
      for (const file of defaultFiles.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(DEFAULT_DIR, file), 'utf-8');
        const skill = parseMd(content, file);
        skill.isDefault = true;
        skills.push(skill);
      }
    } catch {}

    // Read custom skills
    try {
      await ensureCustomDir();
      const customFiles = await fs.readdir(CUSTOM_DIR);
      for (const file of customFiles.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(CUSTOM_DIR, file), 'utf-8');
        const skill = parseMd(content, file);
        skill.isDefault = false;
        skills.push(skill);
      }
    } catch {}

    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/:id — get a single skill's full content
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filename = `${id}.md`;

    // Try default first, then custom
    for (const dir of [DEFAULT_DIR, CUSTOM_DIR]) {
      try {
        const content = await fs.readFile(path.join(dir, filename), 'utf-8');
        const skill = parseMd(content, filename);
        skill.isDefault = dir === DEFAULT_DIR;
        return res.json(skill);
      } catch {}
    }

    res.status(404).json({ error: 'Skill not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills — create a new custom skill
router.post('/', async (req, res) => {
  try {
    const { name, description, content, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    await ensureCustomDir();

    // Generate filename from name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const filename = `${id}.md`;
    const filepath = path.join(CUSTOM_DIR, filename);

    // Check if exists
    try {
      await fs.access(filepath);
      return res.status(409).json({ error: 'A skill with this name already exists' });
    } catch {} // File doesn't exist — good

    const md = buildMd({ name, description: description || '', content: content || '', icon: icon || 'sparkles' });
    await fs.writeFile(filepath, md, 'utf-8');

    res.json({ id, name, description: description || '', content: content || '', icon: icon || 'sparkles', isDefault: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/skills/:id — update a skill (default or custom)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, content, icon } = req.body;

    // Check if it's a default or custom skill
    let filepath = path.join(CUSTOM_DIR, `${id}.md`);
    let isDefault = false;
    try { await fs.access(filepath); } catch {
      // Not in custom — check default
      filepath = path.join(DEFAULT_DIR, `${id}.md`);
      try { await fs.access(filepath); isDefault = true; } catch {
        return res.status(404).json({ error: 'Skill not found' });
      }
    }

    const md = buildMd({ name: name || id, description: description || '', content: content || '', icon: icon || 'sparkles' });
    await fs.writeFile(filepath, md, 'utf-8');

    res.json({ id, name: name || id, description: description || '', content: content || '', icon: icon || 'sparkles', isDefault });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/skills/:id — delete a custom skill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filepath = path.join(CUSTOM_DIR, `${id}.md`);

    // Only allow deleting custom skills
    try { await fs.access(filepath); } catch {
      return res.status(403).json({ error: 'Cannot delete default skills' });
    }

    await fs.unlink(filepath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
