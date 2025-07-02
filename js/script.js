// ─── Supabase Config ─────────────────────────────
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';

// ---- Load Sponsors for the Home Page ----
async function loadSponsors() {
  const SUPABASE_URL = 'https://bgarkbbnfdrvtjrtkiam.supabase.co';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from('sponsors')
    .select('company_name,logo_url, tier')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sponsors:', error);
    return;
  }

  const tierOrder = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Hole'];
  data.sort((a, b) => {
    const aIdx = tierOrder.indexOf(a.tier);
    const bIdx = tierOrder.indexOf(b.tier);
    if (aIdx === bIdx) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const grid = document.getElementById('sponsors-grid');
  if (!grid) return;
  grid.innerHTML = '';

  data.forEach(sponsor => {
    const tier = (sponsor.tier || '').toLowerCase();
    let imgSrc = sponsor.logo_url;
    if (!imgSrc) {
      imgSrc = `images/sponsors/missing_${tier}.png`;
    }

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

// ---- Photo Gallery Features ----
function initGalleryFeatures() {
  const galleryGrid = document.getElementById('js-gallery');
  const toggleBtn = document.getElementById('js-toggle-gallery');
  if (galleryGrid && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      galleryGrid.classList.toggle('expanded');
      toggleBtn.textContent = galleryGrid.classList.contains('expanded') ? 'Show less' : 'Show more';
    });
  }

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

  document.addEventListener('keydown', (e) => {
    if (lightboxModal && !lightboxModal.classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    }
  });
}

// ---- DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
  loadSponsors();
  initGalleryFeatures();

  // Example: Reveal admin link on "ctrl+shift+a"
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
    const adminLink = document.getElementById('admin-link');
    if (adminLink) adminLink.style.display = 'block';
  }
});

});