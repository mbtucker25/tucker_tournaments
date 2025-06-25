// ─── Constants ───────────────────────────────────────────────
let selectedTier = null;
// ─── Supabase Config ─────────────────────────────────────────
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';


// ─── Utilities ────────────────────────────────────────────────

function debounce(func, delay = 500) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

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

function getTierAmount(tier) {
  const prices = {
    Platinum: 550,
    Gold: 350,
    Silver: 150,
    Bronze: 50,
    Hole: 75,
  };
  return prices[tier] || 0;
}

async function logToSupabase(context, message) {
  await fetch('https://bgarkbbnfdrvtjrtkiam.supabase.co/rest/v1/debug_logs', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ context, message })
  });
}

function resetAndCloseModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.setAttribute('hidden', true);

  const form = modal.querySelector('form');
  if (form) form.reset();

  const messageBox = modal.querySelector('.form-message');
  if (messageBox) {
    messageBox.innerText = '';
    messageBox.classList.remove('error', 'success');
    messageBox.setAttribute('hidden', true);
  }

  const teamList = document.getElementById('team-members-list');
  const teamBox = document.getElementById('team-members-inline-display');
  if (teamList) teamList.innerHTML = '';
  if (teamBox) teamBox.setAttribute('hidden', true);
}

function generateGolferFieldsets() {
  const container = document.getElementById('golfer-fieldsets');
  if (!container) return;

  const sizes = ['Small', 'Medium', 'Large', 'X-Large', 'XX-Large'];
  const options = sizes.map(s => `<option value="${s}">${s.toUpperCase()}</option>`).join('');
  container.innerHTML = '';

  for (let i = 2; i <= 4; i++) {
    container.innerHTML += `
      <div class="card neumorphic">
        <div class="section-heading-wrapper">
          <div class="section-heading">
            <div class="section-heading-main">
              <i class="fa-solid fa-address-card icon-spacing"></i>Golfer ${i}
            </div>
          </div>
        </div>
        <div class="golfer-fieldsets" id="golfer${i}">
          <div class="form-grid-two">
            <div class="form-field">
              <input type="text" id="player${i}-first" placeholder="First Name" />
            </div>
            <div class="form-field">
              <input type="text" id="player${i}-last" placeholder="Last Name" />
            </div>
          </div>
          <div class="form-grid-email-phone">
            <div class="form-field">
              <input type="email" id="player${i}-email" placeholder="Email" />
            </div>
            <div class="form-field">
              <input type="tel" id="player${i}-phone" placeholder="Phone #" />
            </div>
          </div>
          <div class="select-wrapper">
            <div class="select">
              <select id="golfer${i}-shirt-size">
                <option value="" disabled selected>-- T-Shirt Size --</option>
                ${options}
              </select>
            </div>
          </div>
        </div>
      </div>`;
  }
}

async function checkTeamNameExists(name) {
  const teamWarning = document.getElementById('team-name-warning');
  if (!name) {
    teamWarning.classList.remove('visible');
    return false;
  }

  try {
    const res = await fetch('https://bgarkbbnfdrvtjrtkiam.functions.supabase.co/get-teams');
    const teams = await res.json();
    const exists = teams.some(team => team.name.toLowerCase() === name.toLowerCase());
    teamWarning.classList.toggle('visible', exists);
    return exists;
  } catch (err) {
    console.error('Team name check failed:', err);
    teamWarning.classList.remove('visible');
    return false;
  }
}

async function populateTeamDropdown() {
  const select = document.getElementById('golfer-team');
  if (!select) return;

  select.innerHTML = '';

  const freeAgentOption = document.createElement('option');
  freeAgentOption.value = '__free_agent__';
  freeAgentOption.textContent = 'No Team (Free Agent)';
  select.appendChild(freeAgentOption);

  try {
    const teamRes = await fetch('https://bgarkbbnfdrvtjrtkiam.functions.supabase.co/get-teams');
    const teams = await teamRes.json();

    for (const team of teams) {
      if (team.name === '__free_agent__') continue;

      const statusRes = await fetch(`https://bgarkbbnfdrvtjrtkiam.functions.supabase.co/get-team-status?team=${encodeURIComponent(team.name)}`);
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

function getGolfer(i) {
  const first = document.getElementById(`player${i}-first`)?.value.trim();
  const last = document.getElementById(`player${i}-last`)?.value.trim();
  const email = document.getElementById(`player${i}-email`)?.value.trim();
  const phone = document.getElementById(`player${i}-phone`)?.value.trim();
  const shirtSize = document.getElementById(`golfer${i}-shirt-size`)?.value || '';
  return (first || last || email || phone || shirtSize) ? { first, last, email, phone, shirtSize } : null;
}

function handleFormSubmit() {
  const form = document.getElementById('team-registration-form');
  const teamNameInput = document.getElementById('team-name');
  if (!form || !teamNameInput) return;

  teamNameInput.addEventListener('input', debounce(e => {
    checkTeamNameExists(e.target.value.trim());
  }, 500));

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const teamName = teamNameInput.value.trim();
    if (!teamName || await checkTeamNameExists(teamName)) {
      alert("Please enter a valid, unique team name.");
      return;
    }

    const captain = {
      first: document.getElementById('captain-first')?.value.trim(),
      last: document.getElementById('captain-last')?.value.trim(),
      email: document.getElementById('captain-email')?.value.trim(),
      phone: document.getElementById('captain-phone')?.value.trim(),
      shirtSize: document.getElementById('captain-shirt-size')?.value
    };

    if (!captain.first || !captain.last || !captain.email || !captain.phone) {
      alert("Please complete all required Team Captain fields.");
      return;
    }

    const golfers = [captain];
    for (let i = 2; i <= 4; i++) {
      const golfer = getGolfer(i);
      if (golfer) golfers.push(golfer);
    }

    try {
      const res = await fetch('https://bgarkbbnfdrvtjrtkiam.supabase.co/functions/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTeamName: teamName,
          golfer1: golfers[0],
          golfer2: golfers[1],
          golfer3: golfers[2],
          golfer4: golfers[3]
        })
      });

      const json = await res.json();
      const successOverlay = document.getElementById('success-overlay');
      const successMsg = document.getElementById('success-message-text');

      if (res.ok) {
        resetAndCloseModal('modal-register-team');
        const golferNamesHtml = golfers
          .filter(g => g?.first || g?.last)
          .map(g => `<li><i class="fa-solid fa-golf-ball-tee success-message-icons"></i> ${g.first || ''} ${g.last || ''}</li>`)
          .join('');

        successMsg.innerHTML = `
          <div class="success-icon-wrapper">
            <i class="fa-solid fa-circle-check success-check-icon"></i>
          </div>
          <h2>You have successfully registered:</h2>
          <div class="success-message-text team-name">${teamName}</div>
          <p class="golfers-label"><strong>Registered Golfers:</strong></p>
          <ul class="success-golfer-list">${golferNamesHtml}</ul>
        `;
        successOverlay.removeAttribute('hidden');
      } else {
        throw new Error(json.error || 'Something went wrong');
      }
    } catch (err) {
      console.error(err);
      const messageBox = document.getElementById('form-message');
      messageBox.innerText = `❌ Submission failed. Please try again later.`;
      messageBox.className = 'form-message error';
      messageBox.removeAttribute('hidden');
    }
  });

  document.getElementById('cancel-form')?.addEventListener('click', () => {
    resetAndCloseModal('modal-register-team');
  });
}

function getGolfer(i) {
  const first = document.getElementById(`player${i}-first`)?.value.trim();
  const last = document.getElementById(`player${i}-last`)?.value.trim();
  const email = document.getElementById(`player${i}-email`)?.value.trim();
  const phone = document.getElementById(`player${i}-phone`)?.value.trim();
  const shirtSize = document.getElementById(`golfer${i}-shirt-size`)?.value || '';
  return (first || last || email || phone || shirtSize) ? { first, last, email, phone, shirtSize } : null;
}

function handleSingleGolferSubmit() {
  const form = document.getElementById('single-golfer-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const first = document.getElementById('golfer-first')?.value.trim();
    const last = document.getElementById('golfer-last')?.value.trim();
    const email = document.getElementById('golfer-email')?.value.trim();
    const phone = document.getElementById('golfer-phone')?.value.trim();
    const shirtSize = document.getElementById('golfer-shirt-size')?.value;
    const teamName = document.getElementById('golfer-team')?.value;

    if (!first || !last || !email || !phone || !teamName || !shirtSize) {
      alert("Please complete all fields.");
      return;
    }

    try {
      const res = await fetch('https://bgarkbbnfdrvtjrtkiam.supabase.co/functions/v1/register-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first, last, email, phone, shirtSize, teamName })
      });

      const json = await res.json();
      const successOverlay = document.getElementById('success-overlay');
      const successMsg = document.getElementById('success-message-text');

      if (res.ok) {
        resetAndCloseModal('modal-golfer');
        successMsg.innerHTML = `
          <div class="success-icon-wrapper">
            <i class="fa-solid fa-circle-check success-check-icon"></i>
          </div>
          <div class="success-message-text team-name">${first} ${last}</div>
          <p class="golfers-label"><strong>${
            teamName === "__free_agent__"
              ? "You've been registered as a free agent. You’ll be assigned to a team on event day."
              : `You've been added to:<br><span class="team-name">${teamName}</span>`
          }</strong></p>
          <p class="golfers-label">Registration fees can be paid via check or cash at check-in. <br><br> Checks should be made payable to <strong>Tucker Tournaments</strong>.<br></p>
        `;
        successOverlay.removeAttribute('hidden');
      } else {
        throw new Error(json.error || 'Something went wrong');
      }
    } catch (err) {
      console.error(err);
      const messageBox = document.getElementById('single-form-message');
      messageBox.innerText = `❌ Submission failed. Please try again later.`;
      messageBox.className = 'form-message error';
      messageBox.removeAttribute('hidden');
    }
  });

  document.getElementById('cancel-single-form')?.addEventListener('click', () => {
    resetAndCloseModal('modal-golfer');
  });
}

function handleFormSubmit() {
  const form = document.getElementById('team-registration-form');
  const teamNameInput = document.getElementById('team-name');
  if (!form || !teamNameInput) return;

  teamNameInput.addEventListener('input', debounce(e => {
    checkTeamNameExists(e.target.value.trim());
  }, 500));

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const teamName = teamNameInput.value.trim();
    if (!teamName || await checkTeamNameExists(teamName)) {
      alert("Please enter a valid, unique team name.");
      return;
    }

    const captain = {
      first: document.getElementById('captain-first')?.value.trim(),
      last: document.getElementById('captain-last')?.value.trim(),
      email: document.getElementById('captain-email')?.value.trim(),
      phone: document.getElementById('captain-phone')?.value.trim(),
      shirtSize: document.getElementById('captain-shirt-size')?.value
    };

    if (!captain.first || !captain.last || !captain.email || !captain.phone) {
      alert("Please complete all required Team Captain fields.");
      return;
    }

    const golfers = [captain];
    for (let i = 2; i <= 4; i++) {
      const golfer = getGolfer(i);
      if (golfer) golfers.push(golfer);
    }

    try {
      const res = await fetch('https://bgarkbbnfdrvtjrtkiam.supabase.co/functions/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTeamName: teamName,
          golfer1: golfers[0],
          golfer2: golfers[1],
          golfer3: golfers[2],
          golfer4: golfers[3]
        })
      });

      const json = await res.json();
      const successOverlay = document.getElementById('success-overlay');
      const successMsg = document.getElementById('success-message-text');

      if (res.ok) {
        resetAndCloseModal('modal-register-team');
        const golferNamesHtml = golfers
          .filter(g => g?.first || g?.last)
          .map(g => `<li><i class="fa-solid fa-golf-ball-tee success-message-icons"></i> ${g.first || ''} ${g.last || ''}</li>`)
          .join('');

        successMsg.innerHTML = `
          <div class="success-icon-wrapper">
            <i class="fa-solid fa-circle-check success-check-icon"></i>
          </div>
          <h2>You have successfully registered:</h2>
          <div class="success-message-text team-name">${teamName}</div>
          <p class="golfers-label"><strong>Registered Golfers:</strong></p>
          <ul class="success-golfer-list">${golferNamesHtml}</ul>
          <p class="golfers-label">Registration fees can be paid via check or cash at check-in. <br> Checks should be made payable to <strong>Tucker Tournaments</strong>.<br></p>
        `;
        successOverlay.removeAttribute('hidden');
      } else {
        throw new Error(json.error || 'Something went wrong');
      }
    } catch (err) {
      console.error(err);
      const messageBox = document.getElementById('form-message');
      messageBox.innerText = `❌ Submission failed. Please try again later.`;
      messageBox.className = 'form-message error';
      messageBox.removeAttribute('hidden');
    }
  });

  document.getElementById('cancel-form')?.addEventListener('click', () => {
    resetAndCloseModal('modal-register-team');
  });
}

function handleSponsorFormSubmit() {
  const sponsorCards = document.querySelectorAll('.sponsor-card');
  const sponsorBtn = document.getElementById('sponsor-submit-btn');

  sponsorCards.forEach(card => {
    card.addEventListener('click', () => {
      const isAlreadySelected = card.classList.contains('selected');
      sponsorCards.forEach(c => c.classList.remove('selected')); // Deselect all

      if (isAlreadySelected) {
        selectedTier = null;
        sponsorBtn.innerText = 'Select a Tier';
      } else {
        card.classList.add('selected');
        selectedTier = card.dataset.tier;
        sponsorBtn.innerText = `Become a ${selectedTier} Sponsor`;
      }
    });
  });

  sponsorBtn?.addEventListener("click", async (e) => {
    console.log("💡 Sponsor submit button clicked");
    e.preventDefault();

    const messageBox = document.getElementById('sponsor-form-message');
    if (messageBox) {
      messageBox.innerText = '';
      messageBox.className = 'form-message';
      messageBox.setAttribute('hidden', true);
    }

    const form = document.getElementById("sponsor-form");
    if (!form) {
      console.error("Sponsor form not found.");
      await logToSupabase("SponsorForm", "❌ Sponsor form not found.");
      return;
    }

    const missingFields = [];

    if (!selectedTier) {
      missingFields.push("Sponsorship Tier");
    }

    const requiredFields = [
      { field: "company-name", label: "Company Name" },
      { field: "sponsor-first-name", label: "First Name" },
      { field: "sponsor-last-name", label: "Last Name" },
      { field: "sponsor-email", label: "Email" },
      { field: "sponsor-phone", label: "Phone Number" }
    ];

    requiredFields.forEach(({ field, label }) => {
      if (!form.elements[field]?.value.trim()) {
        missingFields.push(label);
      }
    });

    if (missingFields.length > 0) {
      const message = `❌ Please complete all required field(s):<br>*${missingFields.join(', *')}`;
      console.warn(message);

      messageBox.innerHTML = message;

      if (messageBox) {
        messageBox.innerHTML= message;
        messageBox.className = 'form-message error';
        messageBox.removeAttribute('hidden');
        messageBox?.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      await logToSupabase("SponsorForm", `⚠️ Missing fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      // Initialize Supabase client
      const supabase = window.supabase.createClient(
        'https://bgarkbbnfdrvtjrtkiam.supabase.co',
        SUPABASE_ANON_KEY
      );

      // Handle file upload
      let logo_url = null;
      const fileInput = document.getElementById("sponsor-logo");
      const file = fileInput?.files?.[0];

      if (file) {
        const filePath = `sponsor-logos/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('sponsor-logos')
          .upload(filePath, file);

        if (uploadError) {
          console.error("❌ Logo upload failed:", uploadError.message);
          await logToSupabase("SponsorForm", `❌ Logo upload failed: ${uploadError.message}`);
        } else {
          const { data } = supabase.storage.from('sponsor-logos').getPublicUrl(filePath);
          logo_url = data.publicUrl;
          await logToSupabase("SponsorForm", `🖼️ Logo uploaded: ${logo_url}`);
        }
      }

      const payload = {
        company_name: form.elements["company-name"].value,
        first_name: form.elements["sponsor-first-name"].value,
        last_name: form.elements["sponsor-last-name"].value,
        email: form.elements["sponsor-email"].value,
        phone: form.elements["sponsor-phone"].value,
        tier: selectedTier,
        tier_amount: getTierAmount(selectedTier),
        pay_status: "pending",
        logo_url: logo_url || null,
      };

      await logToSupabase("SponsorForm", `📦 Submitting JSON: ${JSON.stringify(payload)}`);

      const res = await fetch("https://bgarkbbnfdrvtjrtkiam.supabase.co/functions/v1/register-sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      const successOverlay = document.getElementById('success-overlay');
      const successMsg = document.getElementById('success-message-text');

      if (res.ok) {
        console.log("✅ Sponsor registered:", responseText);
        await logToSupabase("SponsorForm", "✅ Sponsor registration successful.");

        resetAndCloseModal("modal-sponsor");

        successMsg.innerHTML = `
          <div class="success-icon-wrapper">
            <i class="fa-solid fa-circle-check success-check-icon"></i>
          </div>
          <div class="success-message-text team-name">Thank You!</div>
          <p class="golfers-label">
            You’ve successfully registered as a ${selectedTier} Sponsor.
            <br><br>
            Your support is invaluable to us and helps make this event possible.<br><br>
            We’ll follow up with you shortly via email.<br><br>
          </p>
          <p>
            Checks can be made payable to: <b>Tucker Tournaments</b><br>
          </p>
        `;
        successOverlay.removeAttribute('hidden');

        // Reset UI
        sponsorCards.forEach(c => c.classList.remove("selected"));
        sponsorBtn.innerText = "Register as  Sponsor!";
        selectedTier = null;

      } else {
        console.error("❌ Error submitting:", responseText);
        await logToSupabase("SponsorForm", `❌ Server error: ${responseText}`);
        if (messageBox) {
          messageBox.innerText = `❌ There was an issue submitting your sponsorship. Please try again shortly.`;
          messageBox.className = 'form-message error';
          messageBox.removeAttribute('hidden');
        }
      }

    } catch (err) {
      console.error("🔥 Network error:", err);
      await logToSupabase("SponsorForm", `🔥 Network error: ${err.message}`);
      if (messageBox) {
        messageBox.innerText = `❌ Network error. Please check your connection and try again.`;
        messageBox.className = 'form-message error';
        messageBox.removeAttribute('hidden');
      }
    }
  });
}

function initSponsorTierCollapsibles() {
  const sponsorOptions = document.querySelectorAll('.sponsor-option');
  const sponsorBtn = document.getElementById('sponsor-submit-btn');
  let currentlySelected = null;

  sponsorOptions.forEach(option => {
    const heading = option.querySelector('.sponsor-heading');

    if (heading) {
      heading.addEventListener('click', () => {
        const isSelected = option.classList.contains('active');

        // Clear all selections
        sponsorOptions.forEach(o => {
          o.classList.remove('active');
          
          // 🔄 Reset icons to fa-circle
          const icon = o.querySelector('.tier-check-icon');
          if (icon) {
            icon.classList.remove('fa-circle-check');
            icon.classList.add('fa-circle');
          }
        });

        if (!isSelected) {
          option.classList.add('active');
          currentlySelected = option;
          selectedTier = option.getAttribute('data-tier'); // ✅ Update global

          // ✅ Change selected icon to fa-circle-check
          const icon = option.querySelector('.tier-check-icon');
          if (icon) {
            icon.classList.remove('fa-circle');
            icon.classList.add('fa-circle-check');
          }
        } else {
          currentlySelected = null;
          selectedTier = null; // ✅ Clear global
        }

        updateSponsorSubmitButton();
      });
    }
  });

  function updateSponsorSubmitButton() {
    if (currentlySelected) {
      const tier = currentlySelected.getAttribute('data-tier');
      sponsorBtn.innerText = `Become a ${tier} Sponsor`;
      sponsorBtn.disabled = false;
    } else {
      sponsorBtn.innerText = 'Select Sponsorship Option';
      sponsorBtn.disabled = true;
    }
  }
}

async function loadSponsors() {
  const SUPABASE_URL = 'https://bgarkbbnfdrvtjrtkiam.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Adjust table name and column names as needed
  const { data, error } = await supabase
    .from('sponsors')
    .select('company_name,logo_url, tier')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sponsors:', error);
    return;
  }

    // Define tier order
  const tierOrder = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Hole'];

  // Sort sponsors by tier, then by created_at (already sorted by created_at)
  data.sort((a, b) => {
    const aIdx = tierOrder.indexOf(a.tier);
    const bIdx = tierOrder.indexOf(b.tier);
    // If same tier, keep original order (created_at desc)
    if (aIdx === bIdx) return 0;
    // Sponsors with unknown tier go last
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const grid = document.getElementById('sponsors-grid');
  if (!grid) return;

  grid.innerHTML = ''; // Clear any existing content

  data.forEach(sponsor => {
    // Determine which logo to show
    const tier = (sponsor.tier || '').toLowerCase();
    let imgSrc = sponsor.logo_url;
    if (!imgSrc) {
      // Use the default tier image (tier names might be mixed case, so normalize to lowercase)

      imgSrc = `images/sponsors/missing_${tier}.png`;
    }

    // Create sponsor card as before
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';

    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = sponsor.company_name;
    img.style.maxWidth = '180px';
    img.style.maxHeight = '180px';
    img.style.objectFit = 'contain';

    const label = document.createElement('div');
    label.textContent = sponsor.company_name;
    label.style.marginTop = '0.5rem';
    label.style.fontWeight = 'bold';
    label.style.color = 'var(--color-primary)';
    label.style.textAlign = 'center';

    const tierLabel = document.createElement('div');
    tierLabel.textContent = sponsor.tier ? sponsor.tier + ' Sponsor' : '';
    tierLabel.className = 'sponsor-tier-label sponsor-tier-' + tier;
    tierLabel.style.fontSize = '0.95rem';
    tierLabel.style.fontWeight = '600';
    tierLabel.style.marginTop = '0.25rem';
    tierLabel.style.textTransform = 'uppercase';
    tierLabel.style.letterSpacing = '1px';
    tierLabel.style.textAlign = 'center';

    div.appendChild(img);
    div.appendChild(tierLabel);
    div.appendChild(label);
    grid.appendChild(div);
  });

}

function initGalleryFeatures() {
  // Show More / Less for Gallery
  const galleryGrid = document.getElementById('js-gallery');
  const toggleBtn = document.getElementById('js-toggle-gallery');
  if (galleryGrid && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      galleryGrid.classList.toggle('expanded');
      toggleBtn.textContent = galleryGrid.classList.contains('expanded') ? 'Show less' : 'Show more';
    });
  }

  // Lightbox for Gallery Images
  // Create modal elements if not present
  if (!document.getElementById('lightbox-modal')) {
    const modal = document.createElement('div');
    modal.id = 'lightbox-modal';
    modal.className = 'lightbox-modal hidden';
    modal.innerHTML = `
      <div id="lightbox-backdrop" class="lightbox-backdrop"></div>
      <div class="lightbox-content">
        <button id="lightbox-close" class="lightbox-close" aria-label="Close">&times;</button>
        <button id="lightbox-prev" class="lightbox-nav lightbox-prev" aria-label="Previous">&#8592;</button>
        <img id="lightbox-image" src="" alt="" />
        <button id="lightbox-next" class="lightbox-nav lightbox-next" aria-label="Next">&#8594;</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const images = Array.from(document.querySelectorAll('#js-gallery img'));
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxBackdrop = document.getElementById('lightbox-backdrop');
  let currentIndex = 0;

  function showLightbox(idx) {
    if (!images[idx]) return;
    currentIndex = idx;
    lightboxImage.src = images[idx].src;
    lightboxImage.alt = images[idx].alt || '';
    lightboxModal.classList.remove('hidden');
  }

  images.forEach((img, idx) => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => showLightbox(idx));
  });

  function closeLightbox() {
    lightboxModal.classList.add('hidden');
    lightboxImage.src = '';
  }

  function showPrev() {
    if (images.length === 0) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    showLightbox(currentIndex);
  }

  function showNext() {
    if (images.length === 0) return;
    currentIndex = (currentIndex + 1) % images.length;
    showLightbox(currentIndex);
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', showPrev);
  if (lightboxNext) lightboxNext.addEventListener('click', showNext);

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', (e) => {
    if (lightboxModal && !lightboxModal.classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    }
  });
}

// ─── DOMContentLoaded Bootstrap ───────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  generateGolferFieldsets();
  formatPhoneInput();
  populateTeamDropdown();
  handleFormSubmit();
  handleSingleGolferSubmit();
  handleSponsorFormSubmit();
  initSponsorTierCollapsibles();
  loadSponsors();
  initGalleryFeatures();

  document.getElementById('success-ok-btn')?.addEventListener('click', () => {
    document.getElementById('success-overlay')?.setAttribute('hidden', true);
  });
  document.getElementById('volunteer-ok-btn')?.addEventListener('click', () => {
    document.getElementById('modal-volunteer')?.setAttribute('hidden', true);
  });

  document.querySelectorAll('.cta-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      const modal = document.getElementById(modalId);
      if (modal) modal.removeAttribute('hidden');
    });
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal?.id) resetAndCloseModal(modal.id);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay && overlay?.id) resetAndCloseModal(overlay.id);
    });
  });

  const teamSelect = document.getElementById('golfer-team');
if (teamSelect) {
  teamSelect.addEventListener('change', async (e) => {
    const selectedTeam = e.target.value;
    const teamList = document.getElementById('team-members-list');
    const teamBox = document.getElementById('team-members-inline-display');

    if (!teamList || !teamBox) return;

    if (selectedTeam === '__free_agent__') {
      teamBox.hidden = true;
      return;
    }

    try {
      const res = await fetch(`https://bgarkbbnfdrvtjrtkiam.supabase.co/functions/v1/get-team-members?team=${encodeURIComponent(selectedTeam)}`);
      const { golfers } = await res.json();

      if (golfers?.length) {
        teamList.innerHTML = golfers
          .map(g => `<li>${g.first_name || ''} ${g.last_name || ''}</li>`)
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
  });
}
});