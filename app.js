/* ================================================================
   Chicago L Eats — app.js
   ================================================================ */

const LINE_COLORS = {
  Red:'#C8102E', Blue:'#00A1DE', Brown:'#62361B', Green:'#009B3A',
  Orange:'#F9461C', Purple:'#522398', Pink:'#E27EA6', Yellow:'#F9E300'
};
const ALL_LINES = ['Red','Blue','Brown','Green','Orange','Purple','Pink','Yellow'];
const CONNECTOR_PATTERNS = {
  Amtrak: /amtrak/i,
  Metra: /metra/i,
  'South Shore': /south\s*shore/i
};
const CONNECTOR_STYLES = {
  Amtrak:        { bg:'#1a4fa3', text:'#fff' },
  Metra:         { bg:'#006747', text:'#fff' },
  'South Shore': { bg:'#8B0000', text:'#fff' }
};

let restaurants = [];
let activeLines = new Set(ALL_LINES);
let currentSort = 'rating';
let surpriseCurrent = null;

// ================================================================
// DATA LOADING
// ================================================================
async function loadData() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '<div class="no-results" style="display:block;grid-column:1/-1;">Loading restaurants…</div>';
  try {
    const res = await fetch('./combined_restaurants.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    restaurants = raw.filter(r => (r['Restaurants'] || '').trim() !== '');
    initApp();
  } catch(e) {
    console.error(e);
    grid.innerHTML = '<div class="no-results" style="display:block;grid-column:1/-1;">Could not load <code>combined_restaurants.json</code>. Make sure it\'s in the same folder.</div>';
  }
}

function initApp() {
  updateStats();
  populateFilters();
  buildLegend();
  buildCTAPills();
  render();
}

// ================================================================
// STATS
// ================================================================
function updateStats() {
  const cuisineSet = new Set(restaurants.flatMap(r => getCuisines(r['Cuisine'])));
  document.getElementById('stat-total').textContent = restaurants.length;
  document.getElementById('stat-5star').textContent = restaurants.filter(r => getRatingValue(r['Ratings (/5)']) === 5).length;
  document.getElementById('stat-cuisines').textContent = cuisineSet.size;
}

// ================================================================
// HELPERS
// ================================================================
function getLines(str) {
  if (!str || str === 'Varies') return [];
  return ALL_LINES.filter(l => String(str).includes(l));
}

 

function getConnectors(str) {
  if (!str) return [];
  return Object.keys(CONNECTOR_PATTERNS).filter(k => CONNECTOR_PATTERNS[k].test(str));
}

function getCuisines(str) {
  if (!str) return [];
  return String(str).split(',').map(c => c.trim()).filter(Boolean);
}

function getRatingValue(v) {
  const n = parseFloat(v); return isNaN(n) ? -1 : n;
}

function getRatingColor(r) {
  if (r >= 5) return '#F9E300';
  if (r >= 4) return '#009B3A';
  if (r >= 3) return '#00A1DE';
  return '#888';
}

function getPriceValue(p) { const n = parseFloat(p); return isNaN(n) ? null : n; }

function getPriceLabel(p) {
  const n = getPriceValue(p);
  if (n === null) return '—';
  if (n < 20) return '$';
  if (n < 35) return '$$';
  if (n < 55) return '$$$';
  return '$$$$';
}

function buildAccentGradient(lineStr) {
  const lines = getLines(lineStr);
  if (!lines.length) return '#444';
  if (lines.length === 1) return LINE_COLORS[lines[0]];
  const stops = lines.map((l, i) => `${LINE_COLORS[l]} ${Math.round(i*100/(lines.length-1))}%`).join(', ');
  return `linear-gradient(90deg, ${stops})`;
}

// ================================================================
// LEGEND & FILTERS
// ================================================================
function buildCTAPills() {
  const wrap = document.getElementById('ctaPills');
  ALL_LINES.forEach(l => {
    const pill = document.createElement('div');
    pill.className = 'transit-pill';
    pill.style.cssText = `background:${LINE_COLORS[l]}22; color:${l==='Yellow'?'#b8a000':LINE_COLORS[l]}; border-color:${LINE_COLORS[l]}44`;
    pill.innerHTML = `<div class="transit-dot" style="background:${LINE_COLORS[l]}"></div>${l}`;
    wrap.appendChild(pill);
  });
}

function buildLegend() {
  const legend = document.getElementById('linesLegend');
  legend.innerHTML = '';
  ALL_LINES.forEach(l => {
    const b = document.createElement('div');
    b.className = 'line-badge active'; b.dataset.line = l;
    b.style.background = LINE_COLORS[l] + '22';
    b.style.color = l === 'Yellow' ? '#b8a000' : LINE_COLORS[l];
    b.innerHTML = `<div class="line-dot" style="background:${LINE_COLORS[l]}"></div>${l} Line`;
    b.addEventListener('click', () => toggleLine(l));
    legend.appendChild(b);
  });
}

function toggleLine(line) {
  activeLines.has(line) ? activeLines.delete(line) : activeLines.add(line);
  document.querySelectorAll('.line-badge').forEach(b => {
    b.classList.toggle('active', activeLines.has(b.dataset.line));
    b.classList.toggle('inactive', !activeLines.has(b.dataset.line));
  });
  render();
}

function populateFilters() {
  const cEl = document.getElementById('cuisineFilter');
  const nEl = document.getElementById('neighborhoodFilter');
  cEl.innerHTML = '<option value="">All cuisines</option>';
  nEl.innerHTML = '<option value="">All neighborhoods</option>';
  [...new Set(restaurants.flatMap(r => getCuisines(r['Cuisine'])))].sort().forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c; cEl.appendChild(o);
  });
  [...new Set(restaurants.map(r => r['Neighborhood']).filter(Boolean))].sort().forEach(n => {
    const o = document.createElement('option'); o.value = n; o.textContent = n; nEl.appendChild(o);
  });
}

function setSort(type) {
  currentSort = type;
  ['sortRating','sortPrice','sortName'].forEach(id => document.getElementById(id).classList.remove('active'));
  const map = { rating:'sortRating', price:'sortPrice', name:'sortName' };
  document.getElementById(map[type]).classList.add('active');
  render();
}

// ================================================================
// FILTERING & SORTING
// ================================================================
function getFiltered() {
  const q  = document.getElementById('searchInput').value.toLowerCase().trim();
  const cf = document.getElementById('cuisineFilter').value;
  const nf = document.getElementById('neighborhoodFilter').value;
  const mf = document.getElementById('mealFilter').value;

  return restaurants.filter(r => {
    const lines = getLines(r['L Line [Train]']);
    if (lines.length && !lines.some(l => activeLines.has(l))) return false;
    if (cf && !getCuisines(r['Cuisine']).includes(cf)) return false;
    if (nf && r['Neighborhood'] !== nf) return false;
    if (mf && !String(r['Meals']||'').includes(mf)) return false;
    if (q) {
      const hay = [r['Restaurants'],r['Cuisine'],r['Neighborhood'],r['Nearest CTA L Stop [Train Station]'],r['Comments by Louis Sungwoo Cho']].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (currentSort === 'rating') return getRatingValue(b['Ratings (/5)']) - getRatingValue(a['Ratings (/5)']);
    if (currentSort === 'price') {
      const av = getPriceValue(a['Price $']), bv = getPriceValue(b['Price $']);
      if (av===null && bv===null) return 0;
      if (av===null) return 1; if (bv===null) return -1;
      return av - bv;
    }
    return String(a['Restaurants']||'').localeCompare(String(b['Restaurants']||''));
  });
}

// ================================================================
// RENDER CARDS
// ================================================================
function render() {
  const filtered = getFiltered();
  const grid = document.getElementById('grid');
  const noResults = document.getElementById('noResults');
  document.getElementById('countBadge').textContent = `${filtered.length} spot${filtered.length!==1?'s':''}`;

  if (!filtered.length) {
    grid.innerHTML = ''; noResults.style.display = 'block'; return;
  }
  noResults.style.display = 'none';

  grid.innerHTML = filtered.map((r, idx) => {
    const rating      = getRatingValue(r['Ratings (/5)']);
    const lines       = getLines(r['L Line [Train]']);
    const connectors  = getConnectors(r['L Line [Train]']);
    const cuisineTags = getCuisines(r['Cuisine']).map(c => `<span class="meta-tag cuisine">${c}</span>`).join('');
    const linePills   = lines.map(l => `<div class="line-pill" title="${l} Line" style="background:${LINE_COLORS[l]}"></div>`).join('');
    const connBadges  = connectors.map(c => {
      const key = c.replace(' ','').toLowerCase();
      return `<span class="connector-badge badge-${key}" title="Connects to ${c}">${c}</span>`;
    }).join('');
    const comment     = r['Comments by Louis Sungwoo Cho'] || '';
    const showComment = comment && comment !== 'TBD' && comment.length > 3;

    return `<div class="card" data-idx="${idx}">
      <div class="card-accent-bar" style="background:${buildAccentGradient(r['L Line [Train]'])}"></div>
      <div class="card-header">
        <div class="card-name">${r['Restaurants']||'Untitled'}</div>
        <div class="card-rating">
          <div class="rating-num" style="color:${getRatingColor(rating)}">${rating<0?'—':r['Ratings (/5)']}</div>
          <div class="rating-stars">/5</div>
        </div>
      </div>
      <div class="card-meta">${cuisineTags}<span class="meta-tag price">${getPriceLabel(r['Price $'])}</span></div>
      <div class="card-station">
        <div class="station-icon">CTA</div>
        <div class="station-name">${r['Nearest CTA L Stop [Train Station]']||'—'}</div>
      </div>
      <div class="card-lines">${linePills}${connBadges}</div>
      ${showComment ? `<div class="card-comment">${comment}</div>` : ''}
      <div class="card-footer">
        <span class="card-hood">${r['Neighborhood']||''}</span>
        ${r['Menu/Website'] ? `<a class="card-link" href="${r['Menu/Website']}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Menu →</a>` : ''}
      </div>
    </div>`;
  }).join('');

  document.querySelectorAll('.card').forEach((card, idx) => {
    card.addEventListener('click', () => openModal(filtered[idx]));
  });
}

// ================================================================
// DETAIL MODAL
// ================================================================
function openModal(r) {
  const lines      = getLines(r['L Line [Train]']);
  const connectors = getConnectors(r['L Line [Train]']);
  const rating     = getRatingValue(r['Ratings (/5)']);

  document.getElementById('modalBar').style.background = buildAccentGradient(r['L Line [Train]']);
  document.getElementById('modalTitle').textContent = r['Restaurants']||'';

  const linePills = lines.map(l => `
    <div class="modal-line-pill" style="background:${LINE_COLORS[l]}22;color:${l==='Yellow'?'#b8a000':LINE_COLORS[l]};border:1px solid ${LINE_COLORS[l]}44">
      <div class="line-dot" style="background:${LINE_COLORS[l]}"></div>${l}
    </div>`).join('');

  const connPills = connectors.map(c => {
    const s = CONNECTOR_STYLES[c];
    return `<div class="modal-connector-pill" style="background:${s.bg}22;color:${s.bg};border:1px solid ${s.bg}44">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.bg};margin-right:6px;vertical-align:middle"></span>${c}
    </div>`;
  }).join('');

  const cuisineTags = getCuisines(r['Cuisine']).map(c => `<span class="meta-tag cuisine" style="font-size:0.75rem">${c}</span>`).join('');

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-row">
      <div class="modal-field"><div class="modal-label">Cuisine</div><div class="modal-value" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:2px">${cuisineTags||r['Cuisine']||'—'}</div></div>
      <div class="modal-field"><div class="modal-label">Price</div><div class="modal-value">${getPriceLabel(r['Price $'])} ${r['Price $']?`<span style="color:var(--muted);font-size:0.8rem">avg $${parseFloat(r['Price $'])||'—'}</span>`:''}</div></div>
    </div>
    <div class="modal-row">
      <div class="modal-field"><div class="modal-label">Neighborhood</div><div class="modal-value">${r['Neighborhood']||'—'}</div></div>
      <div class="modal-field"><div class="modal-label">Rating</div><div class="modal-value" style="font-family:'Space Mono',monospace;font-size:1.2rem;font-weight:700;color:${getRatingColor(rating)}">${rating<0?'TBD':r['Ratings (/5)']+' / 5'}</div></div>
    </div>
    <div><div class="modal-label">Nearest CTA Stop</div><div class="modal-value" style="margin-top:3px">${r['Nearest CTA L Stop [Train Station]']||'—'}</div></div>
    <div>
      <div class="modal-label">L Lines</div>
      <div class="modal-lines">${linePills||'<span class="modal-value">—</span>'}</div>
    </div>
    ${connectors.length ? `<div><div class="modal-label">Regional Rail Connections</div><div class="modal-connectors">${connPills}</div></div>` : ''}
    <div><div class="modal-label">Meals</div><div class="modal-value" style="margin-top:3px">${r['Meals']||'—'}</div></div>
    ${r['Address'] && r['Address']!=='Varies' ? `<div><div class="modal-label">Address</div><div class="modal-value" style="font-size:0.85rem;margin-top:3px">${r['Address']}</div></div>` : ''}
    ${r['Comments by Louis Sungwoo Cho'] && r['Comments by Louis Sungwoo Cho']!=='TBD' ? `<div class="modal-comment-box">"${r['Comments by Louis Sungwoo Cho']}"<br><small style="color:var(--muted);margin-top:6px;display:block">— Louis Sungwoo Cho</small></div>` : ''}
    ${r['Menu/Website'] ? `<a href="${r['Menu/Website']}" target="_blank" rel="noopener" class="modal-cta">View Menu / Website →</a>` : ''}
  `;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) { if (e.target===document.getElementById('modalOverlay')) closeModalDirect(); }
function closeModalDirect() { document.getElementById('modalOverlay').classList.remove('open'); }

// ================================================================
// SURPRISE ME
// ================================================================
function openSurprise() {
  rollSurprise();
  document.getElementById('surpriseOverlay').classList.add('open');
}

function rollSurprise() {
  const eligible = restaurants.filter(r => getRatingValue(r['Ratings (/5)']) >= 3.5);
  const pool = eligible.length ? eligible : restaurants;
  surpriseCurrent = pool[Math.floor(Math.random() * pool.length)];
  const r = surpriseCurrent;
  const rating     = getRatingValue(r['Ratings (/5)']);
  const lines      = getLines(r['L Line [Train]']);
  const connectors = getConnectors(r['L Line [Train]']);

  document.getElementById('surpriseName').textContent = r['Restaurants']||'';
  document.getElementById('surpriseSubtitle').textContent = `${r['Neighborhood']||''} · ${r['Nearest CTA L Stop [Train Station]']||''}`;
  document.getElementById('surpriseComment').textContent = (r['Comments by Louis Sungwoo Cho'] && r['Comments by Louis Sungwoo Cho']!=='TBD')
    ? r['Comments by Louis Sungwoo Cho']
    : "A recommended spot on Louis's list.";

  document.getElementById('surpriseMeta').innerHTML = [
    `<span class="meta-tag cuisine">${r['Cuisine']||'—'}</span>`,
    `<span class="meta-tag price">${getPriceLabel(r['Price $'])}</span>`,
    rating>=0 ? `<span class="meta-tag" style="border-color:${getRatingColor(rating)};color:${getRatingColor(rating)}">★ ${r['Ratings (/5)']}</span>` : '',
    ...lines.map(l => `<span class="meta-tag" style="border-color:${LINE_COLORS[l]}55;color:${LINE_COLORS[l]}">${l}</span>`),
    ...connectors.map(c => `<span class="meta-tag" style="border-color:${CONNECTOR_STYLES[c].bg}55;color:${CONNECTOR_STYLES[c].bg}">${c}</span>`)
  ].join('');
}

function viewSurprise() {
  closeSurpriseDirectly();
  if (surpriseCurrent) openModal(surpriseCurrent);
}

function closeSurprise(e) { if (e.target===document.getElementById('surpriseOverlay')) closeSurpriseDirectly(); }
function closeSurpriseDirectly() { document.getElementById('surpriseOverlay').classList.remove('open'); }

// ================================================================
// GALLERY
// ================================================================

// Add your own photos by updating src values below.
// If src is blank or fails to load, a styled placeholder is shown.

  // { src: './photos/gene_georgetti4.jpg', name: 'Gene & Georgetti', caption: 'Fresh sorbet to finish off!', neighborhood: 'River North', line: 'Brown', cuisine: 'Italian' },
  

  // Only Display 5 Star Items otherwise it's going to be too much

const GALLERY_SLIDES = [
  { src: './photos/gene_georgetti1.jpg', name: 'Gene & Georgetti', caption: 'The perfect steak meal — a Chicago institution since 1941. Fresh bread to kick off a legendary dinner.', neighborhood: 'River North', line: 'Brown', cuisine: 'Italian' },
  { src: './photos/gene_georgetti2.jpg', name: 'Gene & Georgetti', caption: 'Classic Italian antipasto — simple, fresh, perfect salad!', neighborhood: 'River North', line: 'Brown', cuisine: 'Italian' },
  { src: './photos/gene_georgetti3.jpg', name: 'Gene & Georgetti', caption: 'The steak itself. Worth every single penny.', neighborhood: 'River North', line: 'Brown', cuisine: 'Italian' },
  { src: './photos/gene_georgetti4.jpg', name: 'Gene & Georgetti', caption: 'Fresh sorbet to finish off!', neighborhood: 'River North', line: 'Brown', cuisine: 'Italian' },

  { src: './photos/sweetwater1.jpg', name: 'Sweet Water Tavern and Grill', caption: 'Devouring dishes you want to order every item', neighborhood: 'Loop', line: 'Brown', cuisine: 'Italian' },



  { src: './photos/carmines1.jpg', name: 'Carmines', caption: 'Fresh authentic Italian pasta!', neighborhood: 'River North', line: 'Red', cuisine: 'Italian' },
  { src: './photos/luxbar1.jpg', name: 'Luxbar', caption: 'Steak and Eggs brunch you will never forget!', neighborhood: 'Near North Side', line: 'Red', cuisine: 'American' },
  { src: './photos/tavern_rush1.jpg', name: 'Tavern on Rush', caption: 'Crispy Steak Frites!', neighborhood: 'Near North Side', line: 'Red', cuisine: 'American' },
  
  { src: './photos/charlie_martin1.jpg', name: 'Charlie Martin', caption: 'Cool Shrimp Cocktail!', neighborhood: 'River North', line: 'Red', cuisine: 'American' },
  { src: './photos/charlie_martin2.jpg', name: 'Charlie Martin', caption: 'Crispy Steak Frites!', neighborhood: 'River North', line: 'Red', cuisine: 'American' },

  { src: './photos/roanoke1.jpg', name: 'Roanoke',     caption: 'Steak and Eggs is a great way to finish off your business meeting!', neighborhood: 'Loop',  line: 'Red',   cuisine: 'American' },
  { src: './photos/roanoke2.jpg', name: 'Roanoke',     caption: 'Steak and Eggs is a great way to finish off your business meeting!', neighborhood: 'Loop',  line: 'Blue',   cuisine: 'American' },
  { src: './photos/roanoke3.jpg', name: 'Roanoke',     caption: 'Fresh salads are nice too!', neighborhood: 'Loop',  line: 'Brown',   cuisine: 'American' },
  { src: './photos/roanoke4.jpg', name: 'Roanoke',     caption: 'Sorbet at last!', neighborhood: 'Loop',  line: 'Orange',   cuisine: 'American' },
  
  { src: './photos/exchequer1.jpg', name: 'Exchequer',     caption: '$31.00 Filet Mignon? That is dope!', neighborhood: 'Loop',  line: 'Red',   cuisine: 'American' },

  
  { src: './photos/brunchery1.jpg', name: 'The Brunchery',     caption: 'Amazing Steak & Eggs Brunch on Clark Street.', neighborhood: 'Lincoln Park',  line: 'Red',   cuisine: 'American' },



  { src: './photos/eataly_pizza1.jpg', name: 'Eataly Chicago',    caption: 'Authentic Neopolitan-style pizza? You definitely should be here!',   neighborhood: 'River North',   line: 'Red',   cuisine: 'Italian' },
  { src: './photos/eataly_pizza2.jpg', name: 'Eataly Chicago',    caption: 'Authentic Neopolitan-style pizza? You definitely should be here!',   neighborhood: 'River North',   line: 'Red',   cuisine: 'Italian' },
  { src: './photos/eataly_pizza3.jpg', name: 'Eataly Chicago',    caption: 'Authentic Neopolitan-style pizza? You definitely should be here!',   neighborhood: 'River North',   line: 'Red',   cuisine: 'Italian' },
  { src: './photos/eataly_pizza4.jpg', name: 'Eataly Chicago',    caption: 'Authentic Neopolitan-style pizza? You definitely should be here!',   neighborhood: 'River North',   line: 'Red',   cuisine: 'Italian' },
  { src: './photos/eataly_gel1.jpg', name: 'Eataly Chicago',    caption: 'Finish off with cool gelato or sorbetto!',   neighborhood: 'River North',   line: 'Red',   cuisine: 'Italian' },
  
  { src: './photos/hawksmoor1.jpg', name: 'Hawksmoor Chicago', caption: 'Steak Frites on Tuesday–Saturday nights. Unmissable.',          neighborhood: 'River North',   line: 'Brown', cuisine: 'British' },


  { src: './photos/vu_rooftop1.jpg', name: 'VU Rooftop',        caption: 'Korean-style skirt steak with a view of the South Loop.',        neighborhood: 'South Loop',    line: 'Green', cuisine: 'American' },


  { src: './photos/chosun1.jpg',         name: 'Cho Sun Ok',       caption: 'Most traditional Korean restaurant in Chicago. Reminding Seoul and Korean BBQ!', neighborhood: 'Lincoln Square', line: 'Brown', cuisine: 'Korean' },
  { src: './photos/chosun2.jpg',         name: 'Cho Sun Ok',       caption: 'Finish your meal with Cold Noodles (냉면)!', neighborhood: 'Lincoln Square', line: 'Brown', cuisine: 'Korean' },


  { src: './photos/daebak1.jpg',         name: 'Daebak Korean BBQ', caption: 'Best authentic Korean BBQ in Chicago. Worth every penny.', neighborhood: 'Wicker Park', line: 'Blue', cuisine: 'Korean' },
  { src: './photos/daebak2.jpg',         name: 'Daebak Korean BBQ', caption: 'Devouring Chadol Bagi (차돌박이).', neighborhood: 'Wicker Park', line: 'Blue', cuisine: 'Korean' },
  { src: './photos/daebak3.jpg',         name: 'Daebak Korean BBQ', caption: 'Your mouth cannot wait for Korean BBQ', neighborhood: 'Wicker Park', line: 'Blue', cuisine: 'Korean' },
  { src: './photos/daebak4.jpg',         name: 'Daebak Korean BBQ', caption: 'Finish off with marinated Galbi (양념갈비).', neighborhood: 'Wicker Park', line: 'Blue', cuisine: 'Korean' },
  
   
  { src: './photos/perilla1.jpg', name: 'Perilla',     caption: '$Fusion Korean American Steakhouse you do not want to miss!', neighborhood: 'Loop',  line: 'Brown',   cuisine: 'American' },


];

const LINE_COLORS_GALLERY = {
  Red:'#C8102E', Blue:'#00A1DE', Brown:'#62361B', Green:'#009B3A',
  Orange:'#F9461C', Purple:'#522398', Pink:'#E27EA6', Yellow:'#F9E300'
};

let galleryCurrent = 0;
let galleryTimer   = null;
let galleryPaused  = false;
const GALLERY_INTERVAL = 5000;
const GALLERY_FADE     = 700;

function buildGallery() {
  const stage  = document.getElementById('galleryStage');
  const dotsEl = document.getElementById('galleryDots');
  stage.innerHTML  = '';
  dotsEl.innerHTML = '';

  GALLERY_SLIDES.forEach((slide, i) => {
    const lineColor = LINE_COLORS_GALLERY[slide.line] || '#888';
    const div = document.createElement('div');
    div.className = 'gallery-slide' + (i === 0 ? ' active' : '');
    div.id = `gslide-${i}`;

    const captionHTML = `
      <div class="gallery-caption">
        <div class="gallery-caption-bar" style="background:${lineColor}"></div>
        <div class="gallery-caption-line">
          <span class="gallery-caption-name">${slide.name}</span>
          <span class="gallery-caption-tag" style="background:${lineColor}33;border:1px solid ${lineColor}55">${slide.line} Line</span>
          <span class="gallery-caption-tag">${slide.cuisine}</span>
        </div>
        <div class="gallery-caption-sub">
          <span>${slide.neighborhood}</span>
          <span style="opacity:0.4">·</span>
          <span style="font-style:italic">${slide.caption}</span>
        </div>
      </div>`;

    if (slide.src) {
      div.innerHTML = `
        <img class="gallery-slide-img" src="${slide.src}" alt="${slide.name}"
             onerror="this.style.display='none';this.parentElement.querySelector('.gallery-placeholder').style.display='flex'">
        <div class="gallery-placeholder" style="display:none">
          <div class="gallery-placeholder-icon">📸</div>
          <div>Add photo: <code style="color:var(--accent)">${slide.src}</code></div>
        </div>
        ${captionHTML}`;
    } else {
      div.innerHTML = `
        <div class="gallery-placeholder">
          <div class="gallery-placeholder-icon">📸</div>
          <div style="text-align:center;max-width:280px">
            <div style="color:var(--text);font-weight:700;margin-bottom:6px">${slide.name}</div>
            <div style="color:var(--muted);font-size:0.75rem">Add a photo and update the <code style="color:var(--accent)">GALLERY_SLIDES</code> array in app.js.</div>
          </div>
        </div>
        ${captionHTML}`;
    }

    stage.appendChild(div);

    const dot = document.createElement('button');
    dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
    dot.style.background = i === 0 ? lineColor : '';
    dot.title = slide.name;
    dot.addEventListener('click', () => galleryGoTo(i));
    dotsEl.appendChild(dot);
  });

  startGalleryTimer();
}

function galleryGoTo(next) {
  const slides = document.querySelectorAll('.gallery-slide');
  const dots   = document.querySelectorAll('.gallery-dot');

  slides[galleryCurrent].classList.remove('active');
  slides[galleryCurrent].classList.add('prev');
  dots[galleryCurrent].classList.remove('active');
  dots[galleryCurrent].style.background = '';

  const prevIdx = galleryCurrent;
  setTimeout(() => { slides[prevIdx].classList.remove('prev'); }, GALLERY_FADE);

  galleryCurrent = (next + GALLERY_SLIDES.length) % GALLERY_SLIDES.length;
  slides[galleryCurrent].classList.add('active');
  dots[galleryCurrent].classList.add('active');
  dots[galleryCurrent].style.background = LINE_COLORS_GALLERY[GALLERY_SLIDES[galleryCurrent].line] || '#888';
}

function galleryStep(dir) {
  clearGalleryTimer();
  galleryGoTo(galleryCurrent + dir);
  if (!galleryPaused) startGalleryTimer();
}

function startGalleryTimer() {
  clearGalleryTimer();
  galleryTimer = setInterval(() => galleryGoTo(galleryCurrent + 1), GALLERY_INTERVAL);
}

function clearGalleryTimer() {
  if (galleryTimer) { clearInterval(galleryTimer); galleryTimer = null; }
}

function toggleGalleryPause() {
  galleryPaused = !galleryPaused;
  const btn = document.getElementById('galleryPauseBtn');
  if (galleryPaused) {
    clearGalleryTimer();
    btn.textContent = '▶ Play';
  } else {
    startGalleryTimer();
    btn.textContent = '⏸ Pause';
  }
}

// ================================================================
// EVENT LISTENERS
// ================================================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModalDirect(); closeSurpriseDirectly(); }
});
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('cuisineFilter').addEventListener('change', render);
document.getElementById('neighborhoodFilter').addEventListener('change', render);
document.getElementById('mealFilter').addEventListener('change', render);

document.addEventListener('DOMContentLoaded', () => {
  const stage = document.getElementById('galleryStage');
  if (stage) {
    stage.addEventListener('mouseenter', () => { if (!galleryPaused) clearGalleryTimer(); });
    stage.addEventListener('mouseleave', () => { if (!galleryPaused) startGalleryTimer(); });
  }
});

// ================================================================
// INIT
// ================================================================
loadData();
buildGallery();
