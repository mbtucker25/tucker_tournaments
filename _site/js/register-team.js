// register-team.js

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';

// Utility: debounce to prevent excessive API calls
function debounce(func, delay = 500) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Check if team name already exists (async)
async function checkTeamNameExists(name, updateUI = true) {
    const teamWarning = document.getElementById('team-name-warning');
    if (updateUI && teamWarning) {
        teamWarning.hidden = true;
        teamWarning.classList.remove('form-message--error', 'visible');
    }
    if (!name || !name.trim()) return false;

    try {
        const res = await fetch('https://bgarkbbnfdrvtjrtkiam.functions.supabase.co/get-teams');
        if (!res.ok) throw new Error('Failed to fetch teams');
        const teams = await res.json();
        const exists = teams.some(team => (team.name || '').toLowerCase() === name.trim().toLowerCase());

        if (updateUI && teamWarning) {
            if (exists) {
                teamWarning.removeAttribute('hidden');
                teamWarning.classList.add('form-message--error', 'visible');
            } else {
                teamWarning.setAttribute('hidden', '');
                teamWarning.classList.remove('form-message--error', 'visible');
            }
        }
        return exists;
    } catch (err) {
        console.error('[checkTeamNameExists] Error:', err);
        if (updateUI && teamWarning) {
            teamWarning.hidden = true;
            teamWarning.classList.remove('form-message--error', 'visible');
        }
        return false;
    }
}

function clearPlaceholderOnFocus() {
    document.querySelectorAll('input, textarea').forEach(input => {
        let originalPlaceholder = input.placeholder;
        input.addEventListener('focus', function () {
            input.placeholder = '';
        });
        input.addEventListener('blur', function () {
            input.placeholder = originalPlaceholder;
        });
    });
}

// Format phone number inputs as (XXX) XXX-XXXX live
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

// Collect golfer info by index (1 = Captain)
function getGolfer(i) {
    const first = document.getElementById(`golfer-${i}-first`)?.value.trim();
    const last = document.getElementById(`golfer-${i}-last`)?.value.trim();
    const email = document.getElementById(`golfer-${i}-email`)?.value.trim();
    const phone = document.getElementById(`golfer-${i}-phone`)?.value.trim();
    const shirtSize = document.getElementById(`golfer-${i}-shirt-size`)?.value || '';
    // Only return an object if any field is filled in
    return (first || last || email || phone || shirtSize) ? { first, last, email, phone, shirtSize } : null;
}

// Form submit and registration logic
function handleFormSubmit() {
    const form = document.getElementById('team-registration-form');
    const teamNameInput = document.getElementById('team-name');
    if (!form || !teamNameInput) return;

    // Live team name validation with debounce
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

        // Get Captain info (Golfer 1)
        const captain = getGolfer(1);
        if (!captain || !captain.first || !captain.last || !captain.email || !captain.phone) {
            alert("Please complete all required Team Captain fields.");
            return;
        }

        // Get additional golfers (Golfer 2-4)
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

            if (res.ok) {
                // Redirect to confirmation page with team parameter
                window.location.href = `confirmation.html?team=${encodeURIComponent(teamName)}`;
            } else {
                throw new Error(await res.text());
            }
        } catch (err) {
            console.error(err);
            alert(`❌ Submission failed. Please try again later.`);
        }
    });

    // Cancel button: Return to home
    document.getElementById('cancel-form')?.addEventListener('click', () => {
        window.location.href = "index.html";
    });
}

// On page load: Setup handlers and select styles
document.addEventListener('DOMContentLoaded', () => {
    formatPhoneInput();
    handleFormSubmit();
    clearPlaceholderOnFocus();

    // For selects: show placeholder style when empty
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
