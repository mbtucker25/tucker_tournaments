// Example list: replace with real data fetch if needed
const RECIPIENTS = [
    { year: 2022, name: 'Quinton Batton' },
    { year: 2024, name: 'Boston Eckler' },
    // …etc
];

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.honorees__grid');
  RECIPIENTS.forEach(({ year, name }) => {
    const cell = document.createElement('div');
    cell.className = 'honoree__cell';
    cell.innerHTML = `
      <div class="honoree__year">${year}</div>
      <div class="honoree__name">${name}</div>
    `;
    grid.append(cell);
  });

    // fill in last-modified:
    const lm = document.getElementById('last-modified');
    if (lm) {
        lm.textContent = new Date(document.lastModified).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
});