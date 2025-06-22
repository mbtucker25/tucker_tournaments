const SUPABASE_URL = 'https://bgarkbbnfdrvtjrtkiam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadTeams() {
  const { data, error } = await supabase
    .from('registrations')
    .select('id, first_name, last_name, email, phone, shirt_size, payment_status, team_id, teams(name)')
    .order('created_at', { ascending: true });

  if (error) return;

  const teams = {};
  const freeAgents = [];

  data.forEach(reg => {
    if (!reg.teams || !reg.teams.name || reg.teams.name.toLowerCase().includes('__free_agent__')) {
      freeAgents.push(reg);
    } else {
      if (!teams[reg.team_id]) teams[reg.team_id] = { name: reg.teams.name, golfers: [] };
      teams[reg.team_id].golfers.push(reg);
    }
  });

  const fullTeams = [];
  const partialTeams = [];
  Object.values(teams).forEach(team => {
    if (team.golfers.length === 4) {
      fullTeams.push(team);
    } else {
      partialTeams.push(team);
    }
  });

  const shirtSizeOptions = [
    "Small", "Medium", "Large", "X-Large", "XX-Large"
  ];
  const paymentStatusOptions = [
    "pending", "paid", "failed", "refunded", "waived", "cancelled"
  ];

  // Render Full Teams
  const fullTbody = document.getElementById('full-teams-table').querySelector('tbody');
  fullTbody.innerHTML = '';
  fullTeams.forEach(team => {
    team.golfers.forEach(golfer => {
      const row = document.createElement('tr');
      row.dataset.id = golfer.id;
      row.innerHTML = `
        <td data-col="team_name" contenteditable="false">${team.name}</td>
        <td data-col="last_name" contenteditable="false">${golfer.last_name || ''}</td>
        <td data-col="first_name" contenteditable="false">${golfer.first_name || ''}</td>
        <td data-col="email" contenteditable="false">${golfer.email || ''}</td>
        <td data-col="phone" contenteditable="false">${golfer.phone || ''}</td>
        <td data-col="shirt_size">
          <select disabled>
            ${shirtSizeOptions.map(opt =>
              `<option value="${opt}"${golfer.shirt_size === opt ? ' selected' : ''}>${opt}</option>`
            ).join('')}
          </select>
        </td>
        <td data-col="payment_status">
          <select disabled>
            ${paymentStatusOptions.map(opt =>
              `<option value="${opt}"${golfer.payment_status === opt ? ' selected' : ''}>${opt}</option>`
            ).join('')}
          </select>
        </td>
      `;
      fullTbody.appendChild(row);
    });
  });

  // Render Partial Teams
  const partialTbody = document.getElementById('partial-teams-table').querySelector('tbody');
  partialTbody.innerHTML = '';
  partialTeams.forEach(team => {
    team.golfers.forEach(golfer => {
      const row = document.createElement('tr');
      row.dataset.id = golfer.id;
      row.innerHTML = `
        <td data-col="team_name" contenteditable="false">${team.name}</td>
        <td data-col="first_name" contenteditable="false">${golfer.first_name || ''}</td>
        <td data-col="last_name" contenteditable="false">${golfer.last_name || ''}</td>
        <td data-col="email" contenteditable="false">${golfer.email || ''}</td>
        <td data-col="phone" contenteditable="false">${golfer.phone || ''}</td>
        <td data-col="shirt_size">
          <select disabled>
            ${shirtSizeOptions.map(opt =>
              `<option value="${opt}"${golfer.shirt_size === opt ? ' selected' : ''}>${opt}</option>`
            ).join('')}
          </select>
        </td>
        <td data-col="payment_status">
          <select disabled>
            ${paymentStatusOptions.map(opt =>
              `<option value="${opt}"${golfer.payment_status === opt ? ' selected' : ''}>${opt}</option>`
            ).join('')}
          </select>
        </td>
      `;
      partialTbody.appendChild(row);
    });
  });

  // Render Free Agents
  const freeTbody = document.getElementById('free-agents-table').querySelector('tbody');
  freeTbody.innerHTML = '';
  freeAgents.forEach(golfer => {
    const row = document.createElement('tr');
    row.dataset.id = golfer.id;
    row.innerHTML = `
      <td data-col="first_name" contenteditable="false">${golfer.first_name || ''}</td>
      <td data-col="last_name" contenteditable="false">${golfer.last_name || ''}</td>
      <td data-col="email" contenteditable="false">${golfer.email || ''}</td>
      <td data-col="phone" contenteditable="false">${golfer.phone || ''}</td>
      <td data-col="shirt_size">
        <select disabled>
          ${shirtSizeOptions.map(opt =>
            `<option value="${opt}"${golfer.shirt_size === opt ? ' selected' : ''}>${opt}</option>`
          ).join('')}
        </select>
      </td>
      <td data-col="payment_status">
        <select disabled>
          ${paymentStatusOptions.map(opt =>
            `<option value="${opt}"${golfer.payment_status === opt ? ' selected' : ''}>${opt}</option>`
          ).join('')}
        </select>
      </td>
    `;
    freeTbody.appendChild(row);
  });
}

async function loadSponsors() {
  const { data, error } = await supabase
    .from('sponsors')
    .select('id, company_name, first_name, last_name, email, phone, tier, tier_amount, pay_status')
    .order('created_at', { ascending: true });

  if (error) return;

  const tbody = document.getElementById('sponsors-table').querySelector('tbody');
  tbody.innerHTML = '';

  let totalTierAmount = 0;
  let totalAmountPaid = 0;

  data.forEach(sponsor => {
    const tierAmount = Number(sponsor.tier_amount) || 0;
    const amountPaid = sponsor.pay_status === 'paid' ? tierAmount : 0;

    totalTierAmount += tierAmount;
    totalAmountPaid += amountPaid;

    const row = document.createElement('tr');
    row.dataset.id = sponsor.id;
    row.innerHTML = `
      <td data-col="company_name" contenteditable="false">${sponsor.company_name}</td>
      <td data-col="first_name" contenteditable="false">${sponsor.first_name}</td>
      <td data-col="last_name" contenteditable="false">${sponsor.last_name}</td>
      <td data-col="email" contenteditable="false">${sponsor.email}</td>
      <td data-col="phone" contenteditable="false">${sponsor.phone}</td>
      <td data-col="tier" contenteditable="false">${sponsor.tier}</td>
      <td data-col="pay_status" contenteditable="false">${sponsor.pay_status}</td>
      <td class="currency-cell">$${tierAmount.toFixed(2)}</td>
      <td class="currency-cell">${sponsor.pay_status === 'paid' ? `$${tierAmount.toFixed(2)}` : '$0.00'}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById('total-tier-amount').textContent = `$${totalTierAmount.toFixed(2)}`;
  document.getElementById('total-amount-paid').textContent = `$${totalAmountPaid.toFixed(2)}`;
}

// --- Edit/Save logic for all tables ---
function setupEditableTable(tableId, editBtnId, saveBtnId) {
  const table = document.getElementById(tableId);
  const editBtn = document.getElementById(editBtnId);
  const saveBtn = document.getElementById(saveBtnId);

  let editing = false;
  let originalValues = [];

  editBtn.addEventListener('click', () => {
    if (!editing) {
      // Start editing
      editing = true;
      saveBtn.disabled = true;
      editBtn.textContent = 'Cancel';
      // Store original values
      originalValues = [];
      table.querySelectorAll('tbody tr').forEach(row => {
        const rowData = [];
        row.querySelectorAll('td[contenteditable], td select').forEach(cell => {
          if (cell.hasAttribute('contenteditable')) {
            rowData.push(cell.innerText.trim());
          } else if (cell.querySelector('select')) {
            rowData.push(cell.querySelector('select').value);
          }
        });
        originalValues.push(rowData);
      });
      // Enable editing
      table.querySelectorAll('tbody td[contenteditable]').forEach(td => {
        td.setAttribute('contenteditable', 'true');
        td.dataset.original = td.innerText.trim();
        td.classList.remove('edited-cell');
      });
      table.querySelectorAll('tbody select').forEach(select => {
        select.disabled = false;
        select.dataset.original = select.value;
        select.closest('td').classList.remove('edited-cell');
      });
    } else {
      // Cancel editing
      editing = false;
      saveBtn.disabled = true;
      editBtn.textContent = 'Edit';
      // Restore original values
      let rowIdx = 0;
      table.querySelectorAll('tbody tr').forEach(row => {
        let cellIdx = 0;
        row.querySelectorAll('td[contenteditable], td select').forEach(cell => {
          if (cell.hasAttribute('contenteditable')) {
            cell.innerText = originalValues[rowIdx][cellIdx];
            cell.setAttribute('contenteditable', 'false');
            cell.classList.remove('edited-cell');
            cellIdx++;
          } else if (cell.querySelector('select')) {
            const select = cell.querySelector('select');
            select.value = originalValues[rowIdx][cellIdx];
            select.disabled = true; // <-- This line ensures the dropdown is disabled
            select.blur(); 
            cell.classList.remove('edited-cell');
            cellIdx++;
                }
        });
        rowIdx++;
      });
    }
  });

  // Track edits and highlight changed cells
  table.addEventListener('input', (e) => {
    if (!editing) return;
    const td = e.target.closest('td[contenteditable="true"]');
    if (!td) return;
    if (td.innerText.trim() !== td.dataset.original) {
      td.classList.add('edited-cell');
    } else {
      td.classList.remove('edited-cell');
    }
    saveBtn.disabled = table.querySelectorAll('td.edited-cell').length === 0;
  });

  table.addEventListener('change', (e) => {
    if (!editing) return;
    const select = e.target;
    if (select.tagName !== 'SELECT') return;
    const td = select.closest('td');
    if (!td) return;
    if (select.value !== select.dataset.original) {
      td.classList.add('edited-cell');
    } else {
      td.classList.remove('edited-cell');
    }
    saveBtn.disabled = table.querySelectorAll('td.edited-cell').length === 0;
  });

  saveBtn.addEventListener('click', async () => {
    // ...your existing save logic...
    table.querySelectorAll('td.edited-cell').forEach(td => {
      td.classList.remove('edited-cell');
      if (td.hasAttribute('contenteditable')) {
        td.dataset.original = td.innerText.trim();
      }
      const select = td.querySelector('select');
      if (select) {
        select.dataset.original = select.value;
      }
    });
    table.querySelectorAll('tbody td[contenteditable]').forEach(td => {
      td.setAttribute('contenteditable', 'false');
    });
    table.querySelectorAll('tbody select').forEach(select => {
      select.disabled = true;
    });
    editing = false;
    editBtn.textContent = 'Edit';
    saveBtn.disabled = true;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadTeams();
  loadSponsors();

  setupEditableTable('full-teams-table', 'edit-full-teams', 'save-full-teams');
  setupEditableTable('partial-teams-table', 'edit-partial-teams', 'save-partial-teams');
  setupEditableTable('free-agents-table', 'edit-free-agents', 'save-free-agents');
  setupEditableTable('sponsors-table', 'edit-sponsors', 'save-sponsors');
});