// ──────────────────────────────
// Supabase Config
// ──────────────────────────────
const SUPABASE_URL = 'https://bgarkbbnfdrvtjrtkiam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// end of Supabase Config

// Button: Return to Home Page
document.getElementById('btn-home').addEventListener('click', () => {
  window.location.href = 'index.html';
});
// end of Button: Return to Home Page

// ──────────────────────────────
// Helpers: make a table editable, diff & save
// ──────────────────────────────
function setupEditableTable({
  tableId,
  editBtnId,
  saveBtnId,
  columns,         // [{ field, origKey, cellIndex }]
  supabaseTable,
  extraBeforeSave,
}) {
  const table = document.getElementById(tableId);
  const editBtn = document.getElementById(editBtnId);
  const saveBtn = document.getElementById(saveBtnId);
  const tbody = table?.querySelector('tbody');
  if (!table || !editBtn || !saveBtn || !tbody) return;
  saveBtn.disabled = true;

  editBtn.addEventListener('click', () => {
    table.classList.add('edit-mode');
    editBtn.disabled = true;
    saveBtn.disabled = false;
    document.querySelectorAll('.edit-btn').forEach(b => {
      if (b !== editBtn) b.disabled = true;
    });

    tbody.querySelectorAll('tr').forEach(row => {
      columns.forEach(col => {
        const td = row.children[col.cellIndex];

        // If there’s already a <select> in this cell (from loadSponsors), grab its value,
        // otherwise grab the plain-text
        const displayed = td.querySelector('select')
          ? td.querySelector('select').value
          : td.textContent.trim();

        // Figure out if this is a dropdown
        let opts = null;
        if (col.field === 'shirt_size') {
          opts = ['SMALL', 'MEDIUM', 'LARGE', 'X-LARGE', 'XX-LARGE'];
        } else if (col.field === 'payment_status' || col.field === 'pay_status') {
          opts = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED', 'CANCELLED'];
        }

        if (opts) {
          // build a new <select>, pre-selecting based on the *displayed* value
          const sel = document.createElement('select');
          opts.forEach(v => {
            const o = document.createElement('option');
            o.value = o.textContent = v;
            if (displayed.toUpperCase() === v) {
              o.selected = true;
            }
            sel.appendChild(o);
          });
          sel.classList.add('edit-mode');

          // replace whatever was in the cell
          td.innerHTML = '';
          td.appendChild(sel);

          // highlight if changed from the original data-* attribute
          const origVal = row.getAttribute(`data-${col.origKey}`) || '';
          sel.addEventListener('change', () => {
            td.classList.toggle(
              'edited-cell',
              sel.value.toUpperCase() !== origVal.toUpperCase()
            );
          });

        } else {
          // plain-text cell → make editable
          td.contentEditable = 'true';
          td.classList.add('edit-mode');
          td.addEventListener('input', () => {
            const origVal = row.getAttribute(`data-${col.origKey}`) || '';
            td.classList.toggle(
              'edited-cell',
              td.innerText.trim() !== origVal
            );
          });
        }
      });

      // “assign to team” selects get re-enabled
      const assignSel = row.querySelector('select[name="team_id"]');
      if (assignSel) {
        assignSel.disabled = false;
        assignSel.classList.add('edit-mode');
      }
    });
  });

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    const updates = [];

    // gather all changed rows
    tbody.querySelectorAll('tr').forEach(row => {
      const id = row.dataset.id;
      const changes = {};
      columns.forEach(col => {
        const cell = row.children[col.cellIndex];
        let newVal = cell.querySelector('select')
          ? cell.querySelector('select').value
          : cell.innerText.trim();

        // for pay_status we send lowercase to Supabase
        if (col.field === 'pay_status') {
          newVal = newVal.toLowerCase();
        }

        const orig = row.getAttribute(`data-${col.origKey}`) || '';
        if (newVal.toUpperCase() !== orig.toUpperCase()) {
          changes[col.field] = newVal;
        }
      });
      if (Object.keys(changes).length) {
        updates.push({ id, changes });
      }
    });

    console.log('🛠 Collected updates:', updates);

    if (extraBeforeSave) {
      await extraBeforeSave();
    }

    // send each update
    for (const { id, changes } of updates) {
      console.log(`➡️ Saving row ${id}:`, changes);
      const { data, error } = await supabase
        .from(supabaseTable)
        .update(changes)
        .eq('id', id);
      console.log(`🔄 Response for ${id}:`, { data, error });
      if (error) {
        console.error(`❌ Supabase error for ${id}:`, error);
        alert(`Failed to save row ${id}: ${error.message}`);
      }
    }

    // exit edit-mode
    table.classList.remove('edit-mode');
    document.querySelectorAll('.edit-btn').forEach(b => b.disabled = false);
    saveBtn.disabled = true;

    // re-fetch the fresh data
    await loadTeams();
    await loadSponsors();
  });
}

// ──────────────────────────────
// Teams Loading and Table Rendering
// ──────────────────────────────
async function loadTeams() {
  const { data, error } = await supabase
    .from('registrations')
    .select('id, first_name, last_name, email, phone, shirt_size, payment_status, team_id, teams(name)')
    .order('created_at', { ascending: true });
  if (error) return console.error(error);

  // split into full / partial / free
  const teams = {}, free = [];
  data.forEach(r => {
    const tn = r.teams?.name?.toLowerCase();
    if (!tn || tn.includes('__free_agent__')) free.push(r);
    else {
      teams[r.team_id] ??= { id: r.team_id, name: r.teams.name, golfers: [] };
      teams[r.team_id].golfers.push(r);
    }
  });
  const full = [], partial = [];
  Object.values(teams).forEach(t => (t.golfers.length === 4 ? full : partial).push(t));

  document.getElementById('full-teams-count').textContent = `(${full.length})`;
  document.getElementById('partial-teams-count').textContent = `(${partial.length})`;
  document.getElementById('free-agents-count').textContent = `(${free.length})`;
  document.getElementById('summary-total-teams').textContent = full.length + partial.length;
  document.getElementById('summary-full-teams').textContent = full.length;
  document.getElementById('summary-partial-teams').textContent = partial.length;
  document.getElementById('summary-free-agents').textContent = free.length;

  function renderList(list, tableId, rowBuilder) {
    const tbody = document.getElementById(tableId)?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    list.forEach(item => rowBuilder(item, tbody));
  }

  // Full Teams
  renderList(full, 'full-teams-table', (team, tbody) => {
    team.golfers.forEach(g => {
      const row = document.createElement('tr');

      // Iterate over each column key
      ['name', 'last_name', 'first_name', 'email', 'phone', 'shirt_size', 'payment_status']
        .forEach((key, i) => {
          const td = row.appendChild(document.createElement('td'));

          // Shirt Size dropdown (read-only)
          if (key === 'shirt_size') {
            const sel = document.createElement('select');
            ['SMALL', 'MEDIUM', 'LARGE', 'X-LARGE', 'XX-LARGE'].forEach(v => {
              const o = document.createElement('option');
              o.value = o.textContent = v;
              if (g.shirt_size?.toUpperCase() === v) o.selected = true;
              sel.appendChild(o);
            });
            sel.disabled = true;
            td.appendChild(sel);

            // Payment Status dropdown (read-only)
          } else if (key === 'payment_status') {
            const sel = document.createElement('select');
            ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED', 'CANCELLED'].forEach(v => {
              const o = document.createElement('option');
              o.value = o.textContent = v;
              if (g.payment_status.toUpperCase() === v) o.selected = true;
              sel.appendChild(o);
            });
            sel.disabled = true;
            td.appendChild(sel);

            // Plain text cell
          } else {
            td.textContent = key === 'name' ? team.name : (g[key] || '');
          }

          // Stash the original value on the <tr> for diffing later
          row.setAttribute(`data-original-${key}`, td.textContent.trim());
        });

      // Use the registration's UUID (g.id), not the team_id
      row.dataset.id = g.id;

      tbody.appendChild(row);
    });
  });


  // Partial Teams
  renderList(partial, 'partial-teams-table', (team, tbody) => {
    team.golfers.forEach(g => {
      const row = document.createElement('tr');

      ['name', 'first_name', 'last_name', 'email', 'phone', 'shirt_size', 'payment_status']
        .forEach((key, i) => {
          const td = row.appendChild(document.createElement('td'));

          // Shirt Size dropdown (read-only)
          if (key === 'shirt_size') {
            const sel = document.createElement('select');
            ['SMALL', 'MEDIUM', 'LARGE', 'X-LARGE', 'XX-LARGE'].forEach(v => {
              const o = document.createElement('option');
              o.value = o.textContent = v;
              if (g.shirt_size === v) o.selected = true;
              sel.appendChild(o);
            });
            sel.disabled = true;
            td.appendChild(sel);

            // Payment Status dropdown (read-only)
          } else if (key === 'payment_status') {
            const sel = document.createElement('select');
            ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED', 'CANCELLED'].forEach(v => {
              const o = document.createElement('option');
              o.value = o.textContent = v;
              if (g.payment_status.toUpperCase() === v) o.selected = true;
              sel.appendChild(o);
            });
            sel.disabled = true;
            td.appendChild(sel);

            // Plain text cell
          } else {
            td.textContent = key === 'name' ? team.name : (g[key] || '');
          }

          // Stash the original for diffing later
          row.setAttribute(`data-original-${key}`, td.textContent.trim());
        });

      // Use the registration ID for updates
      row.dataset.id = g.id;

      tbody.appendChild(row);
    });
  });


  // Free Agents
  renderList(free, 'free-agents-table', (g, tbody) => {
    const row = document.createElement('tr');

    // Render each field, swapping in dropdowns for shirt_size and payment_status
    ['first_name', 'last_name', 'email', 'phone', 'shirt_size', 'payment_status']
      .forEach((key, i) => {
        const td = row.appendChild(document.createElement('td'));

        if (key === 'shirt_size') {
          // Read-only shirt size select
          const sel = document.createElement('select');
          ['SMALL', 'MEDIUM', 'LARGE', 'X-LARGE', 'XX-LARGE'].forEach(v => {
            const o = document.createElement('option');
            o.value = o.textContent = v;
            if (g.shirt_size === v) o.selected = true;
            sel.appendChild(o);
          });
          sel.disabled = true;
          td.appendChild(sel);

        } else if (key === 'payment_status') {
          // Read-only payment status select
          const sel = document.createElement('select');
          ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED', 'CANCELLED'].forEach(v => {
            const o = document.createElement('option');
            o.value = o.textContent = v;
            if (g.payment_status.toUpperCase() === v) o.selected = true;
            sel.appendChild(o);
          });
          sel.disabled = true;
          td.appendChild(sel);

        } else {
          // Plain text cell
          td.textContent = g[key] || '';
        }

        // Store original value for diffing
        row.setAttribute(`data-original-${key}`, td.textContent.trim());
      });

    // Assign-to-team dropdown (pre-rendered)
    const tdAssign = row.appendChild(document.createElement('td'));
    const selAssign = document.createElement('select');
    selAssign.name = 'team_id';
    selAssign.disabled = partial.length === 0;
    selAssign.innerHTML = partial.length
      ? `<option value="">Select…</option>` +
      partial.map(t =>
        `<option value="${t.id}">${t.name} (${t.golfers.length}/4)</option>`
      ).join('')
      : `<option value="">No Teams Available</option>`;
    tdAssign.appendChild(selAssign);

    // Use registration id for updates
    row.dataset.id = g.id;

    tbody.appendChild(row);
  });
}

// ──────────────────────────────
// Sponsors Loading and Table Rendering
// ──────────────────────────────
async function loadSponsors() {
  const { data, error } = await supabase
    .from('sponsors')
    .select('id, company_name, first_name, last_name, email, phone, tier, tier_amount, pay_status')
    .order('created_at', { ascending: true });
  if (error) return console.error(error);

  const tbody = document.getElementById('sponsors-table')?.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  let totalTier = 0, totalPaid = 0;

  data.forEach(s => {
    const row = document.createElement('tr');
    row.dataset.id = s.id;
    ['company_name', 'first_name', 'last_name', 'email', 'phone', 'tier', 'pay_status']
      .forEach((key, i) => {
        const td = row.appendChild(document.createElement('td'));
        if (key === 'pay_status') {
          const sel = document.createElement('select');
          ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED', 'CANCELLED']
            .forEach(v => {
              const o = document.createElement('option');
              o.value = o.textContent = v;
              if (s.pay_status?.toUpperCase() === v) o.selected = true;
              sel.appendChild(o);
            });
          sel.disabled = true;
          td.appendChild(sel);
        } else {
          td.textContent = s[key] ?? '';
        }
        row.setAttribute(`data-${'original-' + key}`, td.textContent.trim());
      });

    const tierAmt = Number(s.tier_amount) || 0;
    totalTier += tierAmt;
    const paid = s.pay_status === 'paid' ? tierAmt : 0;
    totalPaid += paid;

    const t1 = row.appendChild(document.createElement('td'));
    t1.className = 'currency-cell';
    t1.textContent = `$ ${tierAmt.toFixed(2)}`;

    const t2 = row.appendChild(document.createElement('td'));
    t2.className = 'currency-cell';
    t2.textContent = `$ ${paid.toFixed(2)}`;

    tbody.appendChild(row);


  });

  // inject footer totals
  document.getElementById('total-tier-amount').textContent = `$ ${totalTier.toFixed(2)}`;
  document.getElementById('total-amount-paid').textContent = `$ ${totalPaid.toFixed(2)}`;

  // update summary cards
  document.getElementById('summary-sponsors').textContent = data.length;
  document.getElementById('summary-total-raised').textContent = `$ ${totalPaid.toFixed(2)}`;
}


function setupCancelButton({
  tableId,
  loadFn,
  editBtnId,
  saveBtnId,
  cancelBtnId
}) {
  const table = document.getElementById(tableId);
  const editBtn = document.getElementById(editBtnId);
  const saveBtn = document.getElementById(saveBtnId);
  const cancelBtn = document.getElementById(cancelBtnId);
  if (!table || !editBtn || !saveBtn || !cancelBtn) return;

  cancelBtn.hidden = true;
  editBtn.addEventListener('click', () => cancelBtn.hidden = false);
  saveBtn.addEventListener('click', () => cancelBtn.hidden = true);

  cancelBtn.addEventListener('click', async () => {
    // reload original data
    await loadFn();

    // exit edit-mode
    table.classList.remove('edit-mode');
    table.querySelectorAll('td.edit-mode, select.edit-mode').forEach(el => {
      el.classList.remove('edit-mode');
      if (el.tagName === 'TD') el.contentEditable = 'false';
      if (el.tagName === 'SELECT') el.disabled = true;
    });

    // reset buttons
    document.querySelectorAll('.edit-btn').forEach(btn => btn.disabled = false);
    saveBtn.disabled = true;
    cancelBtn.hidden = true;
  });
}

// ──────────────────────────────
// Check-In Loading and Table Rendering
// ──────────────────────────────
const checkinTbody = document.getElementById('checkin-table')?.querySelector('tbody');
let golfers = [];
async function loadGolfersForCheckin() {
  const { data, error } = await supabase
    .from('registrations')
    .select('id, first_name, last_name, shirt_size, checked_in, teams(name)')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  if (error) return alert(error.message);
  // sort only by last, first
  data.sort((a, b) => {
    const c = a.last_name.localeCompare(b.last_name);
    return c || a.first_name.localeCompare(b.first_name);
  });
  golfers = data;
  renderCheckinTable();
}
function renderCheckinTable() {
  if (!checkinTbody) return;
  checkinTbody.innerHTML = '';
  golfers.forEach(g => {
    const row = document.createElement('tr');
    row.dataset.id = g.id;
    if (g.checked_in) row.classList.add('checked-in-row');
    const tn = g.teams?.name?.toLowerCase() || '';
    const isFree = tn === '__free_agent__';
    const teamText = isFree ? 'NOT ASSIGNED' : g.teams?.name || '';
    if (isFree) row.classList.add('attention-reqd');

    row.innerHTML = `
      <td><input type="checkbox" class="checked-in-checkbox"
           ${g.checked_in ? 'checked' : ''} ${isFree ? 'disabled' : ''}></td>
      <td>${g.last_name}</td>
      <td>${g.first_name}</td>
      <td>${teamText}</td>
      <td>${g.shirt_size}</td>
    `;
    checkinTbody.appendChild(row);
  });
}
if (checkinTbody) {
  checkinTbody.addEventListener('change', async e => {
    if (!e.target.classList.contains('checked-in-checkbox')) return;
    const row = e.target.closest('tr');
    const id = row.dataset.id;
    const val = e.target.checked;
    const { error } = await supabase
      .from('registrations')
      .update({ checked_in: val })
      .eq('id', id);
    if (error) {
      alert(error.message);
      e.target.checked = !val;
    } else {
      row.classList.toggle('checked-in-row', val);
    }
  });
}

// ────────────────────────────────────────────────────
// Team Scores Loading & Table Rendering
// ────────────────────────────────────────────────────
async function loadTeamScores() {
  const { data, error } = await supabase
    .from('team_scores')
    .select(`team_id,teams(name),
      ${[...Array(18)].map((_, i) => `hole${i + 1}`).join(',')}`)
  if (error) return alert(error.message);
  data.sort((a, b) =>
    a.teams.name.localeCompare(b.teams.name)
  );
  renderTeamScoresTable(data);
}
function renderTeamScoresTable(rows) {
  const tbody = document.getElementById('team-scores-table')?.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.dataset.teamId = r.team_id;
    let html = `<td>${r.teams.name}</td>`;
    for (let i = 1; i <= 9; i++) html += `
      <td><input class="score-input" data-hole="${i}"
           inputmode="numeric" maxlength="2"
           value="${r['hole' + i] || ''}"></td>`;
    html += `<td class="front9-total">0</td>`;
    for (let i = 10; i <= 18; i++) html += `
      <td><input class="score-input" data-hole="${i}"
           inputmode="numeric" maxlength="2"
           value="${r['hole' + i] || ''}"></td>`;
    html += `<td class="back9-total">0</td>
             <td class="round-total">0</td>`;
    tr.innerHTML = html;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.score-input').forEach(i =>
    i.dispatchEvent(new Event('input'))
  );
}
document.getElementById('team-scores-table')?.addEventListener('input', async e => {
  if (!e.target.classList.contains('score-input')) return;

  const input = e.target;
  const row   = input.closest('tr');
  const teamId = row.dataset.teamId;
  const hole   = input.dataset.hole;
  const newVal = parseInt(input.value) || 0;

  // 1) recalc UI totals (you already have this)
  let f = 0, b = 0;
  row.querySelectorAll('.score-input').forEach(inp => {
    const h = +inp.dataset.hole;
    const v = parseInt(inp.value) || 0;
    if (h <= 9) f += v; else b += v;
  });
  row.querySelector('.front9-total').textContent = f;
  row.querySelector('.back9-total').textContent  = b;
  row.querySelector('.round-total').textContent  = f + b;

  // 2) persist to Supabase
  try {
    const { error } = await supabase
      .from('team_scores')
      .update({ [`hole${hole}`]: newVal })
      .eq('team_id', teamId);

    if (error) throw error;
    console.log(`✅ Saved hole${hole}=${newVal} for team ${teamId}`);
  } catch (err) {
    console.error('❌ Failed to save score:', err);
    alert(`Could not save score: ${err.message}`);
  }
});


// ──────────────────────────────
// T-shirt Summary Loading
// ──────────────────────────────
async function loadShirtSummary() {
  // Fetch all registrations
  const { data, error } = await supabase
    .from('registrations')
    .select('shirt_size');
  if (error) return console.error(error);

  // Initialize counts
  const sizes = ['SMALL', 'MEDIUM', 'LARGE', 'X-LARGE', 'XX-LARGE'];
  const counts = sizes.reduce((acc, s) => (acc[s] = 0, acc), {});

  // Tally
  data.forEach(r => {
    const sz = (r.shirt_size || '').toUpperCase();
    if (counts[sz] != null) counts[sz]++;
  });

  // Inject into the table
  sizes.forEach(s => {
    document.getElementById(`count-${s}`).textContent = counts[s];
  });
}

// ──────────────────────────────
// Tab Switching & Page Init
// ──────────────────────────────
function setupTabNavigation() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // clear out all “active” marks
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // show the one you clicked
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');

      // lazy-load data for the tab
      switch (tab.dataset.tab) {
        case 'registrations':
          loadTeams();
          break;
        case 'sponsors':
          loadSponsors();
          break;
        case 'checkin':
          loadGolfersForCheckin();
          break;
        case 'scores':
          loadTeamScores();
          break;
        case 'tshirts':
          loadShirtSummary();
          break;
      }
    });
  });

  document.querySelector('.tab')?.click();
}


function setFooterLastModified() {
  const el = document.getElementById('last-modified');
  if (!el) return;
  el.textContent = new Date(document.lastModified)
    .toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
}

document.addEventListener('DOMContentLoaded', () => {
  loadTeams();
  loadSponsors();
  setupTabNavigation();

  // wire up all four Edit/Save sets:
  setupEditableTable({
    tableId: 'partial-teams-table',
    editBtnId: 'edit-partial-teams',
    saveBtnId: 'save-partial-teams',
    supabaseTable: 'registrations',
    columns: [
      { field: 'name', origKey: 'original-name', cellIndex: 0 },
      { field: 'first_name', origKey: 'original-first_name', cellIndex: 1 },
      { field: 'last_name', origKey: 'original-last_name', cellIndex: 2 },
      { field: 'email', origKey: 'original-email', cellIndex: 3 },
      { field: 'phone', origKey: 'original-phone', cellIndex: 4 },
      { field: 'shirt_size', origKey: 'original-shirt_size', cellIndex: 5 },
      { field: 'payment_status', origKey: 'original-payment_status', cellIndex: 6 }
    ]
  });

  setupEditableTable({
    tableId: 'full-teams-table',
    editBtnId: 'edit-full-teams',
    saveBtnId: 'save-full-teams',
    supabaseTable: 'registrations',
    columns: [
      { field: 'name', origKey: 'original-name', cellIndex: 0 },
      { field: 'last_name', origKey: 'original-last_name', cellIndex: 1 },
      { field: 'first_name', origKey: 'original-first_name', cellIndex: 2 },
      { field: 'email', origKey: 'original-email', cellIndex: 3 },
      { field: 'phone', origKey: 'original-phone', cellIndex: 4 },
      { field: 'shirt_size', origKey: 'original-shirt_size', cellIndex: 5 },
      { field: 'payment_status', origKey: 'original-payment_status', cellIndex: 6 }
    ]
  });

  setupEditableTable({
    tableId: 'free-agents-table',
    editBtnId: 'edit-free-agents',
    saveBtnId: 'save-free-agents',
    supabaseTable: 'registrations',
    columns: [
      { field: 'first_name', origKey: 'original-first_name', cellIndex: 0 },
      { field: 'last_name', origKey: 'original-last_name', cellIndex: 1 },
      { field: 'email', origKey: 'original-email', cellIndex: 2 },
      { field: 'phone', origKey: 'original-phone', cellIndex: 3 },
      { field: 'shirt_size', origKey: 'original-shirt_size', cellIndex: 4 },
      { field: 'payment_status', origKey: 'original-payment_status', cellIndex: 5 }
    ]
  });

  setupEditableTable({
    tableId: 'sponsors-table',
    editBtnId: 'edit-sponsors',
    saveBtnId: 'save-sponsors',
    supabaseTable: 'sponsors',
    columns: [
      { field: 'company_name', origKey: 'original-company_name', cellIndex: 0 },
      { field: 'first_name', origKey: 'original-first_name', cellIndex: 1 },
      { field: 'last_name', origKey: 'original-last_name', cellIndex: 2 },
      { field: 'email', origKey: 'original-email', cellIndex: 3 },
      { field: 'phone', origKey: 'original-phone', cellIndex: 4 },
      { field: 'tier', origKey: 'original-tier', cellIndex: 5 },
      { field: 'pay_status', origKey: 'original-pay_status', cellIndex: 6 },
      // numeric columns already stashed but they are not made editable
    ]
  });

  // Free Agents
  setupCancelButton({
    tableId: 'free-agents-table',
    loadFn: loadTeams,
    editBtnId: 'edit-free-agents',
    saveBtnId: 'save-free-agents',
    cancelBtnId: 'cancel-free-agents'
  });

  // Partial Teams
  setupCancelButton({
    tableId: 'partial-teams-table',
    loadFn: loadTeams,
    editBtnId: 'edit-partial-teams',
    saveBtnId: 'save-partial-teams',
    cancelBtnId: 'cancel-partial-teams'
  });

  // Full Teams
  setupCancelButton({
    tableId: 'full-teams-table',
    loadFn: loadTeams,
    editBtnId: 'edit-full-teams',
    saveBtnId: 'save-full-teams',
    cancelBtnId: 'cancel-full-teams'
  });

  // Sponsors
  setupCancelButton({
    tableId: 'sponsors-table',
    loadFn: loadSponsors,
    editBtnId: 'edit-sponsors',
    saveBtnId: 'save-sponsors',
    cancelBtnId: 'cancel-sponsors'
  });

  setFooterLastModified();
});
