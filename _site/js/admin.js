// Replace with your Supabase credentials and table/column names
const SUPABASE_URL = 'https://bgarkbbnfdrvtjrtkiam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadTeams() {
  // Fetch all registrations with team info
  const { data, error } = await supabase
    .from('registrations')
    .select('first_name, last_name, email, phone, shirt_size, payment_status, team_id, teams(name)')
    .order('created_at', { ascending: true });

  if (error) return;

  // Group golfers by team_id
  const teams = {};
  const freeAgents = [];

  data.forEach(reg => {
    // Free Agent logic: team name is "Free Agent" or similar (adjust as needed)
    if (!reg.teams || !reg.teams.name || reg.teams.name.toLowerCase().includes('__free_agent__')) {
      freeAgents.push(reg);
    } else {
      if (!teams[reg.team_id]) teams[reg.team_id] = { name: reg.teams.name, golfers: [] };
      teams[reg.team_id].golfers.push(reg);
    }
  });

  // Split teams into full and partial
  const fullTeams = [];
  const partialTeams = [];
  Object.values(teams).forEach(team => {
    if (team.golfers.length === 4) {
      fullTeams.push(team);
    } else {
      partialTeams.push(team);
    }
  });

// T-Shirt size and payment status options
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
    row.innerHTML = `
      <td>
        <button class="edit-btn" data-type="golfer" data-id="${golfer.id}">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </td>
      <td contenteditable="true">${team.name}</td>
      <td contenteditable="true">${golfer.first_name || ''} ${golfer.last_name || ''}</td>
      <td contenteditable="true">${golfer.email || ''}</td>
      <td contenteditable="true">${golfer.phone || ''}</td>
      <td>
        <select class="inline-select shirt-size-select">
          ${shirtSizeOptions.map(opt =>
            `<option value="${opt}"${golfer.shirt_size === opt ? ' selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <select class="inline-select payment-status-select">
          ${paymentStatusOptions.map(opt =>
            `<option value="${opt}"${golfer.payment_status === opt ? ' selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`
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
      row.innerHTML = `
        <td>
          <button class="edit-btn" data-type="golfer" data-id="${golfer.id}">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        </td>      
        <td>${team.name}</td>
        <td>${golfer.first_name || ''} ${golfer.last_name || ''}</td>
        <td>${golfer.email || ''}</td>
        <td>${golfer.phone || ''}</td>
        <td>${golfer.shirt_size || ''}</td>
        <td>${golfer.payment_status || ''}</td>
      `;
      partialTbody.appendChild(row);
    });
  });

  // Render Free Agents
  const freeTbody = document.getElementById('free-agents-table').querySelector('tbody');
  freeTbody.innerHTML = '';
  freeAgents.forEach(golfer => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <button class="edit-btn" data-type="golfer" data-id="${golfer.id}">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </td>    
      <td>${golfer.first_name || ''} ${golfer.last_name || ''}</td>
      <td>${golfer.email || ''}</td>
      <td>${golfer.phone || ''}</td>
      <td>${golfer.shirt_size || ''}</td>
      <td>${golfer.payment_status || ''}</td>
    `;
    freeTbody.appendChild(row);
  });
}

async function loadSponsors() {
  const { data, error } = await supabase
    .from('sponsors')
    .select('company_name, first_name, last_name, email, phone, tier, tier_amount, pay_status')
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
      <td>
        <button class="edit-btn" data-type="sponsor" data-id="${sponsor.id}">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </td>    
      <td>${sponsor.company_name}</td>
      <td>${sponsor.first_name} ${sponsor.last_name}</td>
      <td>${sponsor.email}</td>
      <td>${sponsor.phone}</td>
      <td>${sponsor.tier}</td>
      <td>${sponsor.pay_status}</td>
      <td class="currency-cell">$${tierAmount.toFixed(2)}</td>
      <td class="currency-cell">${sponsor.pay_status === 'paid' ? `$${tierAmount.toFixed(2)}` : '$ 0.00'}</td>
    `;
    tbody.appendChild(row);
  });

  // Set totals in the table footer
  document.getElementById('total-tier-amount').textContent = `$${totalTierAmount.toFixed(2)}`;
  document.getElementById('total-amount-paid').textContent = `$${totalAmountPaid.toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadTeams();
  loadSponsors();
});