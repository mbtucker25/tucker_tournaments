// ─── Constants ───────────────────────────────────────────────
let selectedTier = null;
const SUPABASE_URL = 'https://bgarkbbnfdrvtjrtkiam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';

// ─── Utilities ────────────────────────────────────────────────
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
    console.log("Phone input formatting initialized");
}

// Map tier to $
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

// ─── Supabase Debug Logger ───────────────────────────────────
async function logToSupabase(context, message) {
    console.log(`logToSupabase: [${context}] ${message}`);
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/debug_logs`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ context, message })
        });
    } catch (err) {
        console.error('Failed to log to Supabase:', err);
    }
}

// ─── SPONSOR TIER SELECT ────────────────────────────────────
function setupSponsorTierSelection() {
    const sponsorOptions = document.querySelectorAll('.sponsor-option');
    const sponsorBtn = document.getElementById('sponsor-submit-btn');

    sponsorOptions.forEach(option => {
        const heading = option.querySelector('.sponsor-option__heading');
        const features = option.querySelector('.sponsor-option__features');

        if (features) {
            features.style.maxHeight = '0px';
            features.style.opacity = '0';
            features.style.pointerEvents = 'none';
        }

        heading.addEventListener('click', () => {
            sponsorOptions.forEach(opt => {
                opt.classList.remove('active');
                const feat = opt.querySelector('.sponsor-option__features');
                if (feat) {
                    feat.style.maxHeight = '0px';
                    feat.style.opacity = '0';
                    feat.style.pointerEvents = 'none';
                }
                const icon = opt.querySelector('.tier-check-icon');
                if (icon) {
                    icon.classList.remove('fa-circle-check');
                    icon.classList.add('fa-circle');
                }
            });

            // Select this one
            option.classList.add('active');
            selectedTier = option.getAttribute('data-tier');
            sponsorBtn.innerText = `Register as ${selectedTier} Sponsor!`;
            sponsorBtn.disabled = false;

            if (features) {
                features.style.maxHeight = features.scrollHeight + 'px';
                features.style.opacity = '1';
                features.style.pointerEvents = 'auto';
            }
            const icon = option.querySelector('.tier-check-icon');
            if (icon) {
                icon.classList.remove('fa-circle');
                icon.classList.add('fa-circle-check');
            }

            console.log('Selected sponsor tier:', selectedTier);
        });
    });

    // Deselect all by default, disable button
    sponsorBtn.innerText = 'Register as Sponsor!';
    sponsorBtn.disabled = true;
    selectedTier = null;
}

// ─── FORM SUBMIT ─────────────────────────────────────────────
function handleSponsorFormSubmit() {
    const sponsorForm = document.getElementById('sponsor-form');
    const sponsorBtn = document.getElementById('sponsor-submit-btn');
    const sponsorOptions = document.querySelectorAll('.sponsor-option');
    const messageBox = document.getElementById('sponsor-form-message');

    sponsorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageBox.innerText = '';
        messageBox.className = 'form-message';
        messageBox.setAttribute('hidden', true);

        // Validate
        const missingFields = [];
        if (!selectedTier) missingFields.push('Sponsorship Tier');
        [
            { field: "company-name", label: "Company Name" },
            { field: "sponsor-first-name", label: "First Name" },
            { field: "sponsor-last-name", label: "Last Name" },
            { field: "sponsor-email", label: "Email" },
            { field: "sponsor-phone", label: "Phone" }
        ].forEach(({ field, label }) => {
            if (!sponsorForm.elements[field]?.value.trim()) {
                missingFields.push(label);
            }
        });

        if (missingFields.length > 0) {
            const msg = `❌ Please complete all required field(s):<br>*${missingFields.join(', *')}`;
            messageBox.innerHTML = msg;
            messageBox.className = 'form-message error';
            messageBox.removeAttribute('hidden');
            messageBox?.scrollIntoView({ behavior: "smooth", block: "center" });
            await logToSupabase("SponsorForm", `⚠️ Missing fields: ${missingFields.join(', ')}`);
            return;
        }

        try {
            const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Logo upload
            let logo_url = null;
            const fileInput = document.getElementById("sponsor-logo");
            const file = fileInput?.files?.[0];

            if (file) {
                const filePath = `sponsor-logos/${Date.now()}_${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('sponsor-logos')
                    .upload(filePath, file);

                if (uploadError) {
                    await logToSupabase("SponsorForm", `❌ Logo upload failed: ${uploadError.message}`);
                    console.error("Logo upload failed:", uploadError.message);
                } else {
                    const { data } = supabase.storage.from('sponsor-logos').getPublicUrl(filePath);
                    logo_url = data.publicUrl;
                    console.log("Logo uploaded to:", logo_url);
                }
            }

            // Payload
            const payload = {
                company_name: sponsorForm.elements["company-name"].value,
                first_name: sponsorForm.elements["sponsor-first-name"].value,
                last_name: sponsorForm.elements["sponsor-last-name"].value,
                email: sponsorForm.elements["sponsor-email"].value,
                phone: sponsorForm.elements["sponsor-phone"].value,
                tier: selectedTier,
                tier_amount: getTierAmount(selectedTier),
                pay_status: "pending",
                logo_url: logo_url || null,
            };

            await logToSupabase("SponsorForm", `📦 Submitting JSON: ${JSON.stringify(payload)}`);
            console.log("Submitting to edge function:", payload);

            const res = await fetch(`${SUPABASE_URL}/functions/v1/register-sponsor`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const responseText = await res.text();

            if (res.ok) {
                await logToSupabase("SponsorForm", "✅ Sponsor registration successful.");
                sponsorForm.reset();
                sponsorOptions.forEach(c => c.classList.remove('active'));
                sponsorOptions.forEach(c => {
                    const icon = c.querySelector('.tier-check-icon');
                    if (icon) {
                        icon.classList.remove('fa-circle-check');
                        icon.classList.add('fa-circle');
                    }
                });
                sponsorBtn.innerText = "Register as Sponsor!";
                sponsorBtn.disabled = true;
                selectedTier = null;

                // **REDIRECT to confirmation page**
                window.location.href = "confirmation.html?sponsor=1";
                return;
            } else {
                await logToSupabase("SponsorForm", `❌ Server error: ${responseText}`);
                console.error("Server error:", responseText);
                if (messageBox) {
                    messageBox.innerText = `❌ There was an issue submitting your sponsorship. Please try again shortly.`;
                    messageBox.className = 'form-message error';
                    messageBox.removeAttribute('hidden');
                }
            }

        } catch (err) {
            await logToSupabase("SponsorForm", `🔥 Network error: ${err.message}`);
            console.error("Network error:", err);
            if (messageBox) {
                messageBox.innerText = `❌ Network error. Please check your connection and try again.`;
                messageBox.className = 'form-message error';
                messageBox.removeAttribute('hidden');
            }
        }
    });
}

// ─── DOMContentLoaded Bootstrap ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sponsor registration JS loaded!");
    formatPhoneInput();
    setupSponsorTierSelection();
    handleSponsorFormSubmit();

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

    // Add this inside your DOMContentLoaded block:
const cancelBtn = document.getElementById('sponsor-cancel-btn');
if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'index.html';
    });
}

});
