const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dataPath = path.join(__dirname, 'data', 'seed.json');
let data = null;
function loadData() {
  if (!data) data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return data;
}

app.get('/api/modules', (req, res) => { res.json(loadData().modules); });
app.get('/api/skills', (req, res) => { res.json(loadData().skills); });
app.get('/api/modules/:id', (req, res) => {
  const m = loadData().modules.find(m => m.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Module not found' });
  res.json(m);
});
app.get('/api/graph', (req, res) => {
  const store = loadData();
  const nodes = store.modules.map(m => ({ id: m.id, label: m.code, title: m.title, part: m.part, skills: m.skills || [] }));
  const edges = [];
  store.modules.forEach(m => { (m.prerequisites || []).forEach(prereqId => edges.push({ from: prereqId, to: m.id })); });
  res.json({ nodes, edges, skills: store.skills });
});

function getPrereqChain(modules, moduleId, visited = new Set()) {
  if (visited.has(moduleId)) return [];
  const mod = modules.find(m => m.id === moduleId);
  if (!mod || !mod.prerequisites?.length) return [];
  visited.add(moduleId);
  let chain = [];
  mod.prerequisites.forEach(prereqId => { chain.push(prereqId); chain = chain.concat(getPrereqChain(modules, prereqId, visited)); });
  return [...new Set(chain)];
}
app.get('/api/pathways/from-module/:id', (req, res) => {
  const store = loadData();
  const module = store.modules.find(m => m.id === req.params.id);
  if (!module) return res.status(404).json({ error: 'Module not found' });
  const chainIds = getPrereqChain(store.modules, module.id);
  const allIds = [...new Set([...chainIds, module.id])];
  const partsOrder = { A: 1, B: 2, C: 3 };
  const pathway = allIds.map(id => store.modules.find(m => m.id === id)).filter(Boolean).sort((a, b) => (partsOrder[a.part] || 0) - (partsOrder[b.part] || 0));
  res.json({ module, pathway });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`POC at http://localhost:${PORT}`));
