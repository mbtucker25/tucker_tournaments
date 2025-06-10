const SUPABASE_URL = 'https://bgarkbbnfdrvtjrtkiam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const table = document.getElementById('checkin-table').querySelector('tbody');
const saveBtn = document.getElementById('save-checkin');

let golfers = [];

async function loadGolfers() {
const { data, error } = await supabase
  .from('registrations')
  .select('id, first_name, last_name, shirt_size, checked_in, teams(name)')
  .order('last_name', { ascending: true })
  .order('first_name', { ascending: true });

  if (error) {
    console.error('Supabase error:', error);
    alert('Error loading golfers');
    return;
  }

  golfers = data.sort((a, b) => {
  const teamA = (a.teams?.name || '').toLowerCase();
  const teamB = (b.teams?.name || '').toLowerCase();
  if (teamA !== teamB) return teamA.localeCompare(teamB);
  if (a.last_name !== b.last_name) return a.last_name.localeCompare(b.last_name);
  return a.first_name.localeCompare(b.first_name);
});

  golfers = data;
  renderTable();
}

function renderTable() {
  table.innerHTML = '';
  golfers.forEach(golfer => {
    const row = document.createElement('tr');
    row.dataset.id = golfer.id;
    if (golfer.checked_in) {
      row.classList.add('checked-in-row');
    }
    row.innerHTML = `
      <td>
        <input type="checkbox" class="checked-in-checkbox" ${golfer.checked_in ? 'checked' : ''}>
      </td>
      <td>${golfer.teams?.name || ''}</td>
      <td>${golfer.last_name}</td>
      <td>${golfer.first_name}</td>
      <td>${golfer.shirt_size}</td>
    `;
    table.appendChild(row);
  });
}

// Listen for checkbox changes and update Supabase instantly
table.addEventListener('change', async (e) => {
  if (e.target.classList.contains('checked-in-checkbox')) {
    const row = e.target.closest('tr');
    const id = row.dataset.id;
    const checked_in = e.target.checked;

    const { error } = await supabase
      .from('registrations')
      .update({ checked_in })
      .eq('id', id);

    if (error) {
      alert('Failed to update check-in status!');
      e.target.checked = !checked_in;

    } else {
        console.log("Check-in Status:" + (checked_in ? "Checked In" : "Checked Out"));   
      // Apply or remove the highlight class
      if (checked_in) {
        row.classList.add('checked-in-row');
      } else {
        row.classList.remove('checked-in-row');
      }
    }
  }
});

window.addEventListener('DOMContentLoaded', loadGolfers);