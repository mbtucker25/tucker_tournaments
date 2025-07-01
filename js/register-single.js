// register-single.js

// ========== Constants ==========
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...Ta-g'; // (Use your actual key!)
const TEAMS_API = 'https://bgarkbbnfdrvtjrtkiam.functions.supabase.co/get-teams';
const TEAM_MEMBERS_API = 'https://bgarkbbnfdrvtjrtkiam.supabase.co/functions/v1/get-team-members';
const REGISTER_SINGLE_API = 'https://bgarkbbnfdrvtjrtkiam.supabase.co/functions/v1/register-single';

// ========== Utilities ==========

// Debounce
function debounce(func, delay = 500) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Phone Formatter
function formatPhoneInput() {
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', e => {
      let val = e.target.value.replace(/\D/g, '').slice(0, 10);
      if (val.length >= 6) {
        e.target.value = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
      } else if (val.length >= 3) {
        e.target.value = `(${val.slice(0, 3)}) ${val.slice(3)}`;
      } else {
        e.target.value = val;
      }
    });
  });
}

// Clear placeholder on focus
function clearPlaceholderOnFocus() {
  document.querySelectorAll('input, textarea').forEach(input => {
    const orig = input.placeholder;
    input.addEventListener('focus', function () { input.placeholder = ''; });
    input.addEventListener('blur', function () { input.placeholder = orig; });
  });
}

// ========== Team Dropdown Logic ==========

async function populateTeamDropdown() {
  const select = document.getElementById('golfer-team');
  if (!select) return;

  select.innerHTML = '';

  const freeAgentOption = document.createElement('option');
  freeAgentOption.value = '__free_agent__';
  freeAgentOption.textContent = 'No Team (Free Agent)';
  select.appendChild(freeAgentOption);

  try {
    const teamRes = await fetch(TEAMS_API);
    const teams = await teamRes.json();

    for (const team of teams) {
      if (team.name === '__free_agent__') continue;

      // GET team status for each team
      const statusRes = await fetch(
        `https://bgarkbbnfdrvtjrtkiam.functions.supabase.co/get-team-status?team=${encodeURIComponent(team.name)}`
      );
      if (!statusRes.ok) continue;
      const status = await statusRes.json();

      if (!status.isFull) {
        const option = document.createElement('option');
        option.value = team.name;
        option.textContent = team.name;
        select.appendChild(option);
      }
    }
  } catch (err) {
    console.error('Error populating team dropdown:', err);
  }
}


// Show team members when team is selected
async function showTeamMembers(teamName) {
  const teamList = document.getElementById('team-members-list');
  const teamBox = document.getElementById('team-members-inline-display');
  if (!teamList || !teamBox) return;

  if (teamName === '__free_agent__' || !teamName) {
    teamBox.hidden = true;
    teamList.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`${TEAM_MEMBERS_API}?team=${encodeURIComponent(teamName)}`);
    const data = await res.json();
    const golfers = data.golfers || [];

    if (golfers.length) {
      teamList.innerHTML = golfers
        .map(g => `<li>${g.first_name || ''} ${g.last_name || ''}`.trim() + `</li>`)
        .join('');
      teamBox.hidden = false;
    } else {
      teamList.innerHTML = `<li>No golfers yet.</li>`;
      teamBox.hidden = false;
    }
  } catch (err) {
    console.error('Error fetching team members:', err);
    teamBox.hidden = true;
  }
}

// ========== Form Submission Logic ==========

function showSingleFormMessage(msg, isSuccess = false) {
  const box = document.getElementById('single-form-message');
  if (!box) return;
  box.textContent = msg;
  box.className = 'form-message ' + (isSuccess ? 'form-message--success' : 'form-message--error visible');
  box.removeAttribute('hidden');
}

function handleSingleGolferFormSubmit() {
  const form = document.getElementById('single-golfer-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Grab form values
    const teamName = document.getElementById('golfer-team')?.value;
    const first = document.getElementById('golfer-first')?.value.trim();
    const last = document.getElementById('golfer-last')?.value.trim();
    const email = document.getElementById('golfer-email')?.value.trim();
    const phone = document.getElementById('golfer-phone')?.value.trim();
    const shirtSize = document.getElementById('golfer-shirt-size')?.value;

    if (!first || !last || !email || !phone || !shirtSize) {
      showSingleFormMessage("Please complete all fields.");
      return;
    }

    // Hide message box while submitting
    document.getElementById('single-form-message')?.setAttribute('hidden', true);

    try {
      const res = await fetch(REGISTER_SINGLE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName, first, last, email, phone, shirtSize })
      });

      if (res.ok) {
        form.reset();
        showSingleFormMessage("✅ Registration complete!", true);
      } else {
        const errorText = await res.text();
        throw new Error(errorText);
      }
    } catch (err) {
      console.error(err);
      showSingleFormMessage("❌ Submission failed. Please try again.", false);
    }
  });

  // Cancel button returns home
  document.getElementById('cancel-single-form')?.addEventListener('click', () => {
    window.location.href = "index.html";
  });
}

// ========== Init ==========

document.addEventListener('DOMContentLoaded', () => {
  formatPhoneInput();
  clearPlaceholderOnFocus();
  populateTeamDropdown();
  handleSingleGolferFormSubmit();

  // Team select: update team members display
  const teamSelect = document.getElementById('golfer-team');
  if (teamSelect) {
    teamSelect.addEventListener('change', function () {
      showTeamMembers(this.value);
    });
    // On initial load, display if not free agent
    showTeamMembers(teamSelect.value);
  }

  // Add placeholder styling to selects
  document.querySelectorAll('select').forEach(function (sel) {
    function updateStyle() {
      if (!sel.value) {
        sel.classList.add('placeholder-visible');
      } else {
        sel.classList.remove('placeholder-visible');
      }
    }
    sel.addEventListener('change', updateStyle);
    updateStyle();
  });
});
