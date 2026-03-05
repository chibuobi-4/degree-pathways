require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.use(cors());
app.use(express.json());

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = payload;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role && ['VIEWER', 'CURATOR', 'ADMIN'].includes(role) ? role : 'CURATOR',
      },
    });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/universities', async (_req, res) => {
  const universities = await prisma.university.findMany();
  res.json(universities);
});

app.get('/programmes', async (req, res) => {
  const { universityId } = req.query;
  const programmes = await prisma.programme.findMany({
    where: universityId ? { universityId: String(universityId) } : undefined,
  });
  res.json(programmes);
});

app.get('/catalogues', async (req, res) => {
  const { programmeId } = req.query;
  if (!programmeId) return res.status(400).json({ error: 'programmeId required' });
  const cats = await prisma.catalogueVersion.findMany({
    where: { programmeId: String(programmeId) },
  });
  res.json(cats);
});

app.get('/modules', async (req, res) => {
  const { catalogueVersionId } = req.query;
  if (!catalogueVersionId) {
    return res.status(400).json({ error: 'catalogueVersionId required' });
  }
  const modules = await prisma.module.findMany({
    where: { catalogueVersionId: String(catalogueVersionId) },
    include: { moduleSkills: { include: { skill: true } } },
  });
  res.json(modules);
});

app.get('/skills', async (req, res) => {
  const { programmeId } = req.query;
  if (!programmeId) return res.status(400).json({ error: 'programmeId required' });
  const skills = await prisma.skill.findMany({
    where: { programmeId: String(programmeId) },
  });
  res.json(skills);
});

app.get('/graph', async (req, res) => {
  const { catalogueVersionId } = req.query;
  if (!catalogueVersionId) {
    return res.status(400).json({ error: 'catalogueVersionId required' });
  }
  const modules = await prisma.module.findMany({
    where: { catalogueVersionId: String(catalogueVersionId) },
    include: { prerequisites: true, moduleSkills: { include: { skill: true } } },
  });
  const nodes = modules.map((m) => ({
    id: m.id,
    code: m.code,
    title: m.title,
    part: m.part,
    skills: m.moduleSkills.map((ms) => ms.skill.name),
  }));
  const edges = [];
  modules.forEach((m) => {
    m.prerequisites.forEach((p) => {
      edges.push({ from: p.prereqModuleId, to: p.moduleId, type: p.type });
    });
  });
  res.json({ nodes, edges });
});

async function getPrereqChain(moduleId, visited = new Set()) {
  if (visited.has(moduleId)) return [];
  const preqs = await prisma.prerequisite.findMany({ where: { moduleId } });
  visited.add(moduleId);
  const ids = preqs.map((p) => p.prereqModuleId);
  for (const p of preqs) {
    const nested = await getPrereqChain(p.prereqModuleId, visited);
    ids.push(...nested);
  }
  return [...new Set(ids)];
}

app.get('/pathways/from-module/:id', async (req, res) => {
  try {
    const module = await prisma.module.findUnique({
      where: { id: req.params.id },
      include: { moduleSkills: { include: { skill: true } } },
    });
    if (!module) return res.status(404).json({ error: 'Module not found' });
    const chainIds = await getPrereqChain(module.id);
    const allIds = [...new Set([...chainIds, module.id])];
    const partsOrder = { A: 1, B: 2, C: 3 };
    const pathway = await prisma.module.findMany({
      where: { id: { in: allIds } },
      include: { moduleSkills: { include: { skill: true } } },
    });
    pathway.sort((a, b) => (partsOrder[a.part] || 0) - (partsOrder[b.part] || 0));
    res.json({ module, pathway });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load pathway' });
  }
});

app.post('/import/catalogue', auth(['CURATOR', 'ADMIN']), async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.university || !payload.programme || !payload.catalogue || !Array.isArray(payload.modules)) {
    return res.status(400).json({ error: 'Invalid import payload' });
  }
  const { university, programme, catalogue, modules } = payload;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const uni = await tx.university.upsert({
        where: { name_country: { name: university.name, country: university.country || null } },
        update: { url: university.url || undefined },
        create: {
          name: university.name,
          country: university.country,
          url: university.url,
        },
      });
      const prog = await tx.programme.upsert({
        where: { universityId_name: { universityId: uni.id, name: programme.name } },
        update: {
          award: programme.award,
          durationYears: programme.durationYears,
        },
        create: {
          universityId: uni.id,
          name: programme.name,
          award: programme.award,
          durationYears: programme.durationYears,
        },
      });
      const cat = await tx.catalogueVersion.upsert({
        where: { programmeId_academicYear: { programmeId: prog.id, academicYear: catalogue.academicYear } },
        update: { isActive: catalogue.isActive ?? false },
        create: {
          programmeId: prog.id,
          academicYear: catalogue.academicYear,
          isActive: catalogue.isActive ?? false,
        },
      });

      const skillNameToId = {};
      if (Array.isArray(payload.skills)) {
        for (const s of payload.skills) {
          const skill = await tx.skill.upsert({
            where: { programmeId_name: { programmeId: prog.id, name: s.name } },
            update: { category: s.category },
            create: { programmeId: prog.id, name: s.name, category: s.category },
          });
          skillNameToId[s.name] = skill.id;
        }
      }

      const codeToModuleId = {};
      for (const m of modules) {
        const created = await tx.module.upsert({
          where: { catalogueVersionId_code: { catalogueVersionId: cat.id, code: m.code } },
          update: {
            title: m.title,
            part: m.part,
            credits: m.credits,
            description: m.description,
            required: !!m.required,
          },
          create: {
            catalogueVersionId: cat.id,
            code: m.code,
            title: m.title,
            part: m.part,
            credits: m.credits,
            description: m.description,
            required: !!m.required,
          },
        });
        codeToModuleId[m.code] = created.id;
        if (Array.isArray(m.skills)) {
          for (const skillName of m.skills) {
            if (!skillNameToId[skillName]) {
              const skill = await tx.skill.upsert({
                where: { programmeId_name: { programmeId: prog.id, name: skillName } },
                update: {},
                create: { programmeId: prog.id, name: skillName },
              });
              skillNameToId[skillName] = skill.id;
            }
            await tx.moduleSkill.upsert({
              where: { moduleId_skillId: { moduleId: created.id, skillId: skillNameToId[skillName] } },
              update: {},
              create: { moduleId: created.id, skillId: skillNameToId[skillName] },
            });
          }
        }
      }

      for (const m of modules) {
        if (!Array.isArray(m.prerequisites)) continue;
        const moduleId = codeToModuleId[m.code];
        for (const p of m.prerequisites) {
          const prereqId = codeToModuleId[p.code];
          if (!prereqId) continue;
          await tx.prerequisite.upsert({
            where: {
              moduleId_prereqModuleId_type: {
                moduleId,
                prereqModuleId: prereqId,
                type: p.type && ['PREREQUISITE', 'COREQUISITE', 'RECOMMENDED'].includes(p.type) ? p.type : 'PREREQUISITE',
              },
            },
            update: {},
            create: {
              moduleId,
              prereqModuleId: prereqId,
              type: p.type && ['PREREQUISITE', 'COREQUISITE', 'RECOMMENDED'].includes(p.type) ? p.type : 'PREREQUISITE',
            },
          });
        }
      }

      return { universityId: uni.id, programmeId: prog.id, catalogueId: cat.id };
    });

    res.status(201).json({ message: 'Catalogue imported', ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to import catalogue' });
  }
});

app.get('/', (_req, res) => {
  res.json({ ok: true, message: 'Degree pathways API' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
