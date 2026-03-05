const API = '/api';
async function get(path) { const res = await fetch(API + path); if (!res.ok) throw new Error(await res.text()); return res.json(); }
let allModules = [], allSkills = [];

function byPart(part) { const order = { A: 1, B: 2, C: 3 }; return (a, b) => (order[a.part] || 0) - (order[b.part] || 0); }

function renderSkillFilter() {
  const sel = document.getElementById('skill-filter');
  sel.innerHTML = '<option value="">All</option>';
  allSkills.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; sel.appendChild(o); });
  sel.addEventListener('change', renderModulesList);
}
function renderModulePick() {
  const sel = document.getElementById('module-pick');
  sel.innerHTML = '<option value="">Select module</option>';
  allModules.sort(byPart).forEach(m => { const o = document.createElement('option'); o.value = m.id; o.textContent = m.code + ' — ' + m.title; sel.appendChild(o); });
  sel.addEventListener('change', onModulePick);
}
function filterModules() {
  const skillId = document.getElementById('skill-filter').value;
  let list = skillId ? allModules.filter(m => m.skills && m.skills.includes(skillId)) : [...allModules];
  return list.sort(byPart);
}
function renderModulesList() {
  const list = filterModules();
  const container = document.getElementById('modules-list');
  container.innerHTML = list.map(m => {
    const skillNames = (m.skills || []).map(sid => allSkills.find(s => s.id === sid)?.name || sid).join(', ');
    return `<article class="module-card"><div class="code">${m.code}</div><div class="title">${m.title}</div><div class="meta">Part ${m.part} · ${m.credits} cr · ${skillNames || '-'}</div></article>`;
  }).join('');
}
async function onModulePick() {
  const id = document.getElementById('module-pick').value;
  const section = document.getElementById('pathway-section');
  if (!id) { section.classList.add('hidden'); return; }
  try {
    const { pathway } = await get('/pathways/from-module/' + id);
    document.getElementById('pathway-module-title').textContent = pathway.find(m => m.id === id)?.code || id;
    const chain = document.getElementById('pathway-chain');
    chain.innerHTML = pathway.map((m, i) => '<span class="pathway-node part-' + m.part + '">' + m.code + '</span>' + (i < pathway.length - 1 ? '<span class="pathway-arrow">→</span>' : '')).join('');
    section.classList.remove('hidden');
  } catch (e) { document.getElementById('pathway-chain').innerHTML = '<p class="error">' + e.message + '</p>'; section.classList.remove('hidden'); }
}

function renderGraph() {
  const byPart = { A: [], B: [], C: [] };
  window._graphNodes.forEach(n => { if (byPart[n.part]) byPart[n.part].push(n); });
  const inner = document.createElement('div');
  ['A','B','C'].forEach(part => {
    const partNodes = byPart[part] || [];
    if (!partNodes.length) return;
    const div = document.createElement('div'); div.className = 'graph-part';
    partNodes.forEach(n => { const node = document.createElement('div'); node.className = 'graph-node part-' + part; node.textContent = n.label; node.title = n.title; div.appendChild(node); });
    inner.appendChild(div);
  });
  document.getElementById('graph').innerHTML = ''; document.getElementById('graph').appendChild(inner);
}

async function init() {
  try {
    const [modules, skills, graph] = await Promise.all([get('/modules'), get('/skills'), get('/graph')]);
    allModules = modules; allSkills = skills; window._graphNodes = graph.nodes;
    renderSkillFilter(); renderModulePick(); renderModulesList(); renderGraph();
  } catch (e) { document.getElementById('modules-list').innerHTML = '<p class="error">' + e.message + '</p>'; }
}
init();
