/**
 * Seed the database with sample data (POC-style CS programme).
 * Run from api folder: node scripts/seed.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const seedPath = path.join(__dirname, '..', '..', 'poc', 'data', 'seed.json');
const raw = fs.readFileSync(seedPath, 'utf8');
const { skills: skillList, modules: modulesList } = JSON.parse(raw);

const university = { name: 'Example University', country: 'UK', url: 'https://example.ac.uk' };
const programme = { name: 'BSc Computer Science', award: 'BSc', durationYears: 3 };
const catalogue = { academicYear: '2025/26', isActive: true };

const modules = modulesList.map((m) => ({
  code: m.code,
  title: m.title,
  part: m.part,
  credits: m.credits ?? 15,
  required: false,
  skills: m.skills ? m.skills.map((sid) => skillList.find((s) => s.id === sid)?.name).filter(Boolean) : [],
  prerequisites: (m.prerequisites || []).map((code) => ({ code })),
}));

const skills = skillList.map((s) => ({ name: s.name, category: null }));

async function main() {
  const uni = await prisma.university.upsert({
    where: { name_country: { name: university.name, country: university.country || null } },
    update: { url: university.url },
    create: { name: university.name, country: university.country, url: university.url },
  });
  const prog = await prisma.programme.upsert({
    where: { universityId_name: { universityId: uni.id, name: programme.name } },
    update: { award: programme.award, durationYears: programme.durationYears },
    create: {
      universityId: uni.id,
      name: programme.name,
      award: programme.award,
      durationYears: programme.durationYears,
    },
  });
  const cat = await prisma.catalogueVersion.upsert({
    where: { programmeId_academicYear: { programmeId: prog.id, academicYear: catalogue.academicYear } },
    update: { isActive: catalogue.isActive },
    create: {
      programmeId: prog.id,
      academicYear: catalogue.academicYear,
      isActive: catalogue.isActive,
    },
  });

  const skillNameToId = {};
  for (const s of skills) {
    const skill = await prisma.skill.upsert({
      where: { programmeId_name: { programmeId: prog.id, name: s.name } },
      update: { category: s.category },
      create: { programmeId: prog.id, name: s.name, category: s.category },
    });
    skillNameToId[s.name] = skill.id;
  }

  const codeToModuleId = {};
  for (const m of modules) {
    const created = await prisma.module.upsert({
      where: { catalogueVersionId_code: { catalogueVersionId: cat.id, code: m.code } },
      update: {
        title: m.title,
        part: m.part,
        credits: m.credits,
        required: !!m.required,
      },
      create: {
        catalogueVersionId: cat.id,
        code: m.code,
        title: m.title,
        part: m.part,
        credits: m.credits,
        required: !!m.required,
      },
    });
    codeToModuleId[m.code] = created.id;
    for (const skillName of m.skills || []) {
      if (!skillNameToId[skillName]) {
        const skill = await prisma.skill.upsert({
          where: { programmeId_name: { programmeId: prog.id, name: skillName } },
          update: {},
          create: { programmeId: prog.id, name: skillName },
        });
        skillNameToId[skillName] = skill.id;
      }
      await prisma.moduleSkill.upsert({
        where: { moduleId_skillId: { moduleId: created.id, skillId: skillNameToId[skillName] } },
        update: {},
        create: { moduleId: created.id, skillId: skillNameToId[skillName] },
      });
    }
  }

  for (const m of modules) {
    if (!m.prerequisites?.length) continue;
    const moduleId = codeToModuleId[m.code];
    for (const p of m.prerequisites) {
      const prereqId = codeToModuleId[p.code];
      if (!prereqId) continue;
      await prisma.prerequisite.upsert({
        where: {
          moduleId_prereqModuleId_type: {
            moduleId,
            prereqModuleId: prereqId,
            type: 'PREREQUISITE',
          },
        },
        update: {},
        create: { moduleId, prereqModuleId: prereqId, type: 'PREREQUISITE' },
      });
    }
  }

  console.log('Seed done. Catalogue ID:', cat.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
