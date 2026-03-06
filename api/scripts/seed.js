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

// Rich content for each module: what you learn and how it links to skills
const MODULE_CONTENT = {
  CS101: {
    description: 'Build a solid foundation in programming: variables, control flow, functions, and basic problem-solving. You\'ll write and debug code in a modern language and understand how software is constructed.',
    learningOutcomes: 'Write clear, working code in a chosen programming language\nUnderstand variables, types, conditionals, and loops\nDesign and implement simple functions and programs\nRead and debug code with confidence',
  },
  CS102: {
    description: 'Learn how data is organised and stored in programs: arrays, lists, stacks, queues, and trees. Essential for writing efficient software and for later modules in algorithms and databases.',
    learningOutcomes: 'Use arrays, lists, and key data structures effectively\nExplain trade-offs between different structures\nImplement and use stacks, queues, and basic trees\nReason about time and space complexity',
  },
  CS103: {
    description: 'Develop the mathematical thinking needed for computer science: logic, sets, functions, and basic discrete maths. Directly supports algorithms, security, and machine learning later.',
    learningOutcomes: 'Apply propositional and predicate logic\nWork with sets, relations, and functions\nUse basic proof techniques and combinatorics\nApply maths to analyse simple algorithms',
  },
  CS104: {
    description: 'Introduction to storing and querying data with databases. You\'ll design tables, write SQL, and understand how applications connect to data — a core skill for almost every software role.',
    learningOutcomes: 'Design simple relational schemas and normalise data\nWrite SQL for queries, inserts, and updates\nConnect an application to a database\nExplain how databases support real applications',
  },
  CS201: {
    description: 'Study how to solve problems efficiently: sorting, searching, and graph algorithms. Builds on programming and maths to prepare you for advanced topics and technical interviews.',
    learningOutcomes: 'Analyse and compare algorithm efficiency\nImplement and use key sorting and searching algorithms\nApply graph and dynamic programming ideas\nReason about correctness and complexity',
  },
  CS202: {
    description: 'Learn how software is built in teams: requirements, design, testing, and version control. You\'ll work on a small project and see how individual code becomes a product.',
    learningOutcomes: 'Capture requirements and translate them into design\nUse version control and collaborative workflows\nWrite and run tests; handle bugs systematically\nExplain the software lifecycle and good practice',
  },
  CS203: {
    description: 'Go deeper into database systems: transactions, indexing, and optimisation. Essential for building reliable, scalable applications and for data-heavy roles.',
    learningOutcomes: 'Explain transactions, concurrency, and recovery\nDesign indexes and tune queries\nUnderstand how database systems work internally\nBuild applications that use databases correctly',
  },
  CS204: {
    description: 'Probability and statistics for computing: random variables, distributions, estimation, and basic inference. Directly supports machine learning, data science, and security.',
    learningOutcomes: 'Work with probability, random variables, and common distributions\nPerform estimation and basic hypothesis testing\nUse statistical thinking to interpret data\nApply statistics in computational contexts',
  },
  CS205: {
    description: 'How computers communicate: protocols, layers, and the internet. You\'ll understand how data moves across networks and how to build simple networked applications.',
    learningOutcomes: 'Explain network layers, TCP/IP, and key protocols\nDescribe how the internet and routing work\nBuild simple client–server or socket-based code\nReason about performance and security on networks',
  },
  CS301: {
    description: 'Introduction to machine learning: supervised and unsupervised learning, key algorithms, and evaluation. You\'ll train models and understand how they learn from data.',
    learningOutcomes: 'Explain key ML concepts (training, validation, overfitting)\nImplement and use common ML algorithms\nEvaluate and compare models fairly\nUnderstand limits and ethics of ML',
  },
  CS302: {
    description: 'Advanced software engineering: architecture, design patterns, and building larger systems. Prepares you for industry and for leading technical decisions.',
    learningOutcomes: 'Apply design patterns and architectural ideas\nDesign and evolve larger software systems\nUse tools for CI/CD, monitoring, and collaboration\nCommunicate technical decisions clearly',
  },
  CS303: {
    description: 'Security in networked systems: threats, cryptography, and defences. You\'ll understand how attacks work and how to design and deploy more secure systems.',
    learningOutcomes: 'Identify common threats and attack types\nUse cryptographic primitives appropriately\nDesign and evaluate security controls\nReason about trade-offs between security and usability',
  },
  CS304: {
    description: 'A substantial project that ties together machine learning, data, and software engineering. You\'ll define a problem, build a solution, and present your work — a showcase for employers and further study.',
    learningOutcomes: 'Plan and execute a substantial data-science or ML project\nIntegrate databases, ML, and software engineering practice\nEvaluate and communicate results clearly\nReflect on methodology and next steps',
  },
};

const modules = modulesList.map((m) => {
  const content = MODULE_CONTENT[m.code] || {};
  return {
    code: m.code,
    title: m.title,
    part: m.part,
    credits: m.credits ?? 15,
    required: false,
    description: content.description,
    learningOutcomes: content.learningOutcomes,
    skills: m.skills ? m.skills.map((sid) => skillList.find((s) => s.id === sid)?.name).filter(Boolean) : [],
    prerequisites: (m.prerequisites || []).map((code) => ({ code })),
  };
});

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
        description: m.description || null,
        learningOutcomes: m.learningOutcomes || null,
        required: !!m.required,
      },
      create: {
        catalogueVersionId: cat.id,
        code: m.code,
        title: m.title,
        part: m.part,
        credits: m.credits,
        description: m.description || null,
        learningOutcomes: m.learningOutcomes || null,
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
