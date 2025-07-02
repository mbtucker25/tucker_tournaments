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
      if (!teams[reg.team_id]) teams[reg.team_id] = { id: reg.team_id, name: reg.teams.name, golfers: [] };
      teams[reg.team_id].golfers.push(reg);
    }
  });

  // Build team arrays and set counts
  const fullTeams = [];
  const partialTeams = [];
  Object.values(teams).forEach(team => {
    if (team.golfers.length === 4) fullTeams.push(team);
    else partialTeams.push(team);
  });
  document.getElementById('full-teams-count').textContent = `(${fullTeams.length})`;
  document.getElementById('partial-teams-count').textContent = `(${partialTeams.length})`;
  document.getElementById('free-agents-count').textContent = `(${freeAgents.length})`;

  // Full Teams Table
  const fullTbody = document.getElementById('full-teams-table').querySelector('tbody');
  fullTbody.innerHTML = '';
  fullTeams.forEach(team => {
    team.golfers.forEach(golfer => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${team.name}</td>
        <td>${golfer.last_name || ''}</td>
        <td>${golfer.first_name || ''}</td>
        <td>${golfer.email || ''}</td>
        <td>${golfer.phone || ''}</td>
        <td>${golfer.shirt_size || ''}</td>
        <td>${golfer.payment_status || ''}</td>
      `;
      fullTbody.appendChild(row);
    });
  });

  // Partial Teams Table
  const partialTbody = document.getElementById('partial-teams-table').querySelector('tbody');
  partialTbody.innerHTML = '';
  partialTeams.forEach(team => {
    team.golfers.forEach(golfer => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${team.name}</td>
        <td>${golfer.first_name || ''}</td>
        <td>${golfer.last_name || ''}</td>
        <td>${golfer.email || ''}</td>
        <td>${golfer.phone || ''}</td>
        <td>${golfer.shirt_size || ''}</td>
        <td>${golfer.payment_status || ''}</td>
      `;
      partialTbody.appendChild(row);
    });
  });

  // Free Agents Table (with Assign to Team)
  const freeTbody = document.getElementById('free-agents-table').querySelector('tbody');
  freeTbody.innerHTML = '';
  freeAgents.forEach(golfer => {
    const row = document.createElement('tr');

    // Assign to Team cell
    const assignTd = document.createElement('td');
    const assignForm = document.createElement('form');
    assignForm.style.display = 'flex';
    assignForm.onsubmit = async (e) => {
      e.preventDefault();
      const teamId = assignSelect.value;
      if (!teamId) return;
      // Assign golfer to team in DB
      await supabase.from('registrations').update({ team_id: teamId }).eq('id', golfer.id);
      await loadTeams(); // Refresh all
    };

    const assignSelect = document.createElement('select');
    assignSelect.innerHTML = `<option value="">Assign…</option>` +
      partialTeams.map(team =>
        `<option value="${team.id}">${team.name} (${team.golfers.length}/4)</option>`
      ).join('');
    assignSelect.required = true;

    const assignBtn = document.createElement('button');
    assignBtn.type = 'submit';
    assignBtn.textContent = 'Assign';
    assignBtn.className = 'assign-btn';

    assignForm.appendChild(assignSelect);
    assignForm.appendChild(assignBtn);
    assignTd.appendChild(assignForm);

    row.innerHTML = `
      <td>${golfer.first_name || ''}</td>
      <td>${golfer.last_name || ''}</td>
      <td>${golfer.email || ''}</td>
      <td>${golfer.phone || ''}</td>
      <td>${golfer.shirt_size || ''}</td>
      <td>${golfer.payment_status || ''}</td>
    `;
    row.appendChild(assignTd);
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
    row.innerHTML = `
      <td>${sponsor.company_name}</td>
      <td>${sponsor.first_name}</td>
      <td>${sponsor.last_name}</td>
      <td>${sponsor.email}</td>
      <td>${sponsor.phone}</td>
      <td>${sponsor.tier}</td>
      <td>${sponsor.pay_status}</td>
      <td class="currency-cell">$${tierAmount.toFixed(2)}</td>
      <td class="currency-cell">${sponsor.pay_status === 'paid' ? `$${tierAmount.toFixed(2)}` : '$0.00'}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById('total-tier-amount').textContent = `$${totalTierAmount.toFixed(2)}`;
  document.getElementById('total-amount-paid').textContent = `$${totalAmountPaid.toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadTeams();
  loadSponsors();
        // Set last updated date in footer
    const lastModifiedSpan = document.getElementById('last-modified');
    if (lastModifiedSpan) {
      // Example: July 2, 2025, 1:25 PM
      lastModifiedSpan.textContent = new Date(document.lastModified)
        .toLocaleString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
    }
});
