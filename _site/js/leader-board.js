// ─── Supabase setup ────────────────────────────────────
const SUPABASE_URL = 'https://bgarkbbnfdrvtjrtkiam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXJrYmJuZmRydnRqcnRraWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjg2NjAsImV4cCI6MjA2Mjg0NDY2MH0.MEbIQT4xkannZiUCdFnBc69czp_bew3UK7uva_-Ta-g';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// the course you want to display
const COURSE_ID = 'accd290a-d7fc-46e6-a085-43d627e8ec7b';

/**
 * Helper to build a "tee" or "par" row.
 * label: the text label, e.g. "Blue" or "Par"
 * values: array of 18 numbers
 * firstCell / secondCell override the contents of the first two <td>s.
 */
function makeRow(label, values, firstCell = '', secondCell = label) {
    const L = label.toUpperCase();
    const front9 = values.slice(0, 9).reduce((a, b) => a + b, 0);
    const back9 = values.slice(9).reduce((a, b) => a + b, 0);
    const total = front9 + back9;
    return `
    <tr class="leaderboard-${label.toLowerCase()}">
      <td>${firstCell}</td>
      <td>${L}</td>
      ${values.map(v => `<td>${v}</td>`).join('')}
      <td>${front9}</td>
      <td>${back9}</td>
      <td>${total}</td>
    </tr>
  `;
}

async function loadLeaderBoard() {
    const tbody = document.querySelector('#leader-board-table tbody');
    tbody.innerHTML = '';

    // 1) fetch par for holes 1–18
    const { data: holes, error: holesErr } = await supabase
        .from('course_holes')
        .select('hole_number, par')
        .eq('course_id', COURSE_ID)
        .order('hole_number', { ascending: true });

    if (holesErr) {
        console.error('Error loading par:', holesErr);
        return alert('Could not load course par.');
    }
    const PAR = holes.map(r => r.par);

    // 2) fetch all tee yardages, bringing in tee_colors.name
    const { data: tees, error: teesErr } = await supabase
        .from('course_hole_tees')
        .select(`
      hole_number,
      yardage,
      tee_colors(name)
    `)
        .eq('course_id', COURSE_ID)
        .order('hole_number', { ascending: true });

    if (teesErr) {
        console.error('Error loading tees:', teesErr);
        return alert('Could not load tee yardages.');
    }

    // group into arrays by tee color name
    const yardagesByType = {};
    tees.forEach(({ hole_number, yardage, tee_colors }) => {
        const color = tee_colors.name;    // e.g. "Blue", "White", etc.
        yardagesByType[color] ||= [];
        yardagesByType[color][hole_number - 1] = yardage;
    });

    // 3) inject each tee row (e.g. White, Red, etc.)
    for (const color of Object.keys(yardagesByType)) {
        tbody.insertAdjacentHTML(
            'beforeend',
            makeRow(color, yardagesByType[color], '', color)
        );
    }

    // 4) inject the "POS / PAR" header row
    //    firstCell: "POS", secondCell: "PAR"
    tbody.insertAdjacentHTML(
        'beforeend',
        makeRow('Par', PAR, 'RNK', 'PAR')
    );

    // 5) now fetch your team scores
    const holeFields = Array.from({ length: 18 }, (_, i) => `hole${i + 1}`).join(',');
    const { data: scores, error: scoresErr } = await supabase
        .from('team_scores')
        .select(`team_id, teams(name), ${holeFields}`)

    if (scoresErr) {
        console.error('Error loading scores:', scoresErr);
        return alert('Error loading leader board.');
    }

    // 6) compute totals, sort ascending (lowest wins), then render
    const board = scores
        .map(r => {
            const holes = Array.from({ length: 18 }, (_, i) =>
                Number(r[`hole${i + 1}`]) || 0
            );
            const front9 = holes.slice(0, 9).reduce((a, b) => a + b, 0);
            const back9 = holes.slice(9).reduce((a, b) => a + b, 0);
            return {
                name: r.teams.name,
                holes,
                front9,
                back9,
                total: front9 + back9
            };
        })
        .sort((a, b) => a.total - b.total);

    board.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${row.name}</td>
      ${row.holes.map(v => `<td>${v}</td>`).join('')}
      <td>${row.front9}</td>
      <td>${row.back9}</td>
      <td>${row.total}</td>
    `;
        tbody.append(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadLeaderBoard();
    const lm = document.getElementById('last-modified');
    if (lm) {
        lm.textContent = new Date(document.lastModified).toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
});