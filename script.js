/* ================================================================
   WaterWise Advisor — Frontend Logic
   ================================================================ */

// ── DOM refs ──────────────────────────────────────────────────────
const form            = document.getElementById('waterForm');
const submitBtn       = document.getElementById('submitBtn');
const loadingEl       = document.getElementById('loading');
const resultEl        = document.getElementById('result');
const aiOutputEl      = document.getElementById('aiOutput');
const copyBtn         = document.getElementById('copyBtn');
const resetBtn        = document.getElementById('resetBtn');
const increaseBtn     = document.getElementById('increaseBtn');
const decreaseBtn     = document.getElementById('decreaseBtn');
const peopleInput     = document.getElementById('people');
const hiddenResidence = document.getElementById('residence');
const otherInput      = document.getElementById('otherActivity');
const addActivityBtn  = document.getElementById('addActivityBtn');
const customChips     = document.getElementById('customChips');

// ── Custom activity chips ─────────────────────────────────────────
const customActivities = [];

function addCustomActivity() {
  const val = otherInput.value.trim();
  if (!val) return;
  if (customActivities.includes(val.toLowerCase())) {
    otherInput.value = '';
    return;
  }

  customActivities.push(val.toLowerCase());

  // Render chip
  const chip = document.createElement('span');
  chip.className = 'custom-chip';
  chip.innerHTML = `✏️ ${val} <button type="button" class="custom-chip-remove" aria-label="Remove">×</button>`;
  chip.querySelector('.custom-chip-remove').addEventListener('click', () => {
    const idx = customActivities.indexOf(val.toLowerCase());
    if (idx > -1) customActivities.splice(idx, 1);
    chip.remove();
  });
  customChips.appendChild(chip);
  otherInput.value = '';
  otherInput.focus();
}

addActivityBtn.addEventListener('click', addCustomActivity);
otherInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addCustomActivity(); }
});

// ── Number stepper ────────────────────────────────────────────────
increaseBtn.addEventListener('click', () => {
  const v = parseInt(peopleInput.value, 10) || 1;
  if (v < 50) peopleInput.value = v + 1;
});

decreaseBtn.addEventListener('click', () => {
  const v = parseInt(peopleInput.value, 10) || 1;
  if (v > 1) peopleInput.value = v - 1;
});

// ── Sync residence radio → hidden select ─────────────────────────
document.querySelectorAll('.residence-radio').forEach(radio => {
  radio.addEventListener('change', () => {
    hiddenResidence.value = radio.value;
  });
});
// Set initial value from default checked radio
const defaultRadio = document.querySelector('.residence-radio:checked');
if (defaultRadio) hiddenResidence.value = defaultRadio.value;

// ── Form submit ───────────────────────────────────────────────────
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const people = parseInt(peopleInput.value, 10) || 1;
  const residence = hiddenResidence.value || 'apartment';
  const activities = [
    ...Array.from(document.querySelectorAll('.activity:checked')).map(cb => cb.value),
    ...customActivities
  ];
  const leaks = document.getElementById('leaks').value;

  if (!leaks) {
    document.getElementById('leaks').focus();
    return;
  }

  // Show loading
  submitBtn.disabled = true;
  loadingEl.classList.remove('hidden');
  resultEl.classList.add('hidden');
  resultEl.scrollIntoView && window.scrollTo({ top: 0 });

  try {
    const resp = await fetch('/api/get-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ people, residence, activities, leaks })
    });

    const data = await resp.json();

    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);

    renderResult(data.plan);
  } catch (err) {
    renderError(err.message);
  } finally {
    submitBtn.disabled = false;
    loadingEl.classList.add('hidden');
  }
});

// ── Render plain-text AI response into structured HTML ────────────
function renderResult(text) {
  aiOutputEl.innerHTML = '';

  if (!text || !text.trim()) {
    aiOutputEl.innerHTML = '<p class="ai-plain">No response received. Please try again.</p>';
    showResult();
    return;
  }

  // Split into logical sections by common Gemini headings
  const sectionDefs = [
    { key: 'high water',    icon: '💧', label: 'High Water-Use Activities',    accent: ''      },
    { key: 'why',           icon: '📖', label: 'Why It Matters',               accent: ''      },
    { key: 'saving tips',   icon: '✅', label: 'Water-Saving Tips',            accent: 'teal'  },
    { key: 'tips',          icon: '✅', label: 'Water-Saving Tips',            accent: 'teal'  },
    { key: '7-day',         icon: '📅', label: '7-Day Action Plan',            accent: 'teal'  },
    { key: 'seven-day',     icon: '📅', label: '7-Day Action Plan',            accent: 'teal'  },
    { key: 'action plan',   icon: '📅', label: 'Action Plan',                  accent: 'teal'  },
    { key: 'remind',        icon: '⚠️', label: 'Important Reminder',           accent: 'amber' },
    { key: 'important',     icon: '⚠️', label: 'Important Note',              accent: 'amber' },
    { key: 'note',          icon: '⚠️', label: 'Note',                         accent: 'amber' },
  ];

  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect section heading (numbered "1. Title", ALL CAPS, or keyword match)
    const isSectionHeading = detectHeading(line, sectionDefs);

    if (isSectionHeading) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        icon: isSectionHeading.icon,
        label: isSectionHeading.label,
        accent: isSectionHeading.accent,
        lines: []
      };
    } else {
      if (!currentSection) {
        // Before any section — create an intro section
        currentSection = { icon: '💬', label: 'Overview', accent: '', lines: [] };
      }
      currentSection.lines.push(line);
    }
  }
  if (currentSection) sections.push(currentSection);

  // If no sections were detected, fallback to plain blocks
  if (sections.length === 0 || (sections.length === 1 && sections[0].lines.length === 0)) {
    renderPlainFallback(text);
    showResult();
    return;
  }

  for (const section of sections) {
    if (!section.lines.length) continue;
    const div = document.createElement('div');
    div.className = 'ai-section';

    const titleEl = document.createElement('div');
    titleEl.className = 'ai-section-title';
    titleEl.textContent = `${section.icon}  ${section.label}`;
    div.appendChild(titleEl);

    const body = document.createElement('div');
    body.className = `ai-section-body${section.accent ? ' ' + section.accent : ''}`;

    // Check if this is a 7-day plan (detect Day N patterns)
    const is7DaySection = /7.?day|action plan/i.test(section.label);

    if (is7DaySection) {
      renderDayPlan(body, section.lines);
    } else {
      renderBulletLines(body, section.lines);
    }

    div.appendChild(body);
    aiOutputEl.appendChild(div);
  }

  showResult();
}

function detectHeading(line, defs) {
  // Pattern: "1. High Water-Use Activities" or "High Water-Use Activities:" or all-caps
  const stripped = line.replace(/^[\d]+\.\s*/, '').replace(/:$/, '').trim();
  const lower = stripped.toLowerCase();

  // Check against known section keywords
  for (const def of defs) {
    if (lower.includes(def.key)) {
      // Make sure it's short enough to be a heading (not a paragraph)
      if (stripped.length < 80 && !stripped.includes('. ')) {
        return def;
      }
    }
  }

  // Generic: numbered heading like "1." or "2." with short text, or ALL CAPS
  const isNumbered = /^\d+\.\s+\S/.test(line) && line.length < 80;
  const isAllCaps  = line === line.toUpperCase() && line.length > 4 && line.length < 60 && /[A-Z]/.test(line);

  if (isNumbered || isAllCaps) {
    const cleaned = line.replace(/^\d+\.\s*/, '');
    return { icon: '📌', label: cleaned.replace(/:$/, ''), accent: '' };
  }

  return null;
}

function renderDayPlan(container, lines) {
  let currentDay = null;
  let dayEl = null;

  for (const line of lines) {
    const dayMatch = line.match(/^(day\s*\d+)/i);
    if (dayMatch) {
      if (dayEl) container.appendChild(dayEl);
      dayEl = document.createElement('div');
      dayEl.className = 'ai-day';
      const label = document.createElement('div');
      label.className = 'ai-day-label';
      label.textContent = line.replace(/^[-*•]\s*/, '');
      dayEl.appendChild(label);
      currentDay = dayEl;
    } else if (currentDay) {
      const l = cleanLine(line);
      if (l) {
        const p = document.createElement('div');
        p.className = 'ai-line';
        p.textContent = l;
        currentDay.appendChild(p);
      }
    } else {
      const l = cleanLine(line);
      if (l) {
        const p = document.createElement('div');
        p.className = 'ai-line';
        p.textContent = l;
        container.appendChild(p);
      }
    }
  }
  if (dayEl) container.appendChild(dayEl);
}

function renderBulletLines(container, lines) {
  for (const line of lines) {
    const l = cleanLine(line);
    if (!l) continue;
    const p = document.createElement('div');
    p.className = 'ai-line';
    p.textContent = l;
    container.appendChild(p);
  }
}

function cleanLine(line) {
  return line.replace(/^[-*•]\s*/, '').trim();
}

function renderPlainFallback(text) {
  const pre = document.createElement('pre');
  pre.style.cssText = 'white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.7;';
  pre.textContent = text;
  aiOutputEl.appendChild(pre);
}

function renderError(msg) {
  aiOutputEl.innerHTML = '';
  const err = document.createElement('p');
  err.style.cssText = 'color:#c0392b;background:#fdf2f2;border:1px solid #f5c6c6;border-radius:8px;padding:14px 16px;font-size:14px;';
  err.textContent = '⚠️ Something went wrong while generating your plan. Please try again. Error: ' + msg;
  aiOutputEl.appendChild(err);
  showResult();
}

function showResult() {
  resultEl.classList.remove('hidden');
  // Smooth scroll to result
  setTimeout(() => {
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}

// ── Copy plan ─────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  const text = aiOutputEl.innerText || aiOutputEl.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const orig = copyBtn.textContent;
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => (copyBtn.textContent = orig), 1800);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => (copyBtn.textContent = '📋 Copy'), 1800);
  });
});

// ── Reset ─────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  resultEl.classList.add('hidden');
  loadingEl.classList.add('hidden');
  aiOutputEl.innerHTML = '';
  form.reset();
  // Reset residence to default
  const first = document.querySelector('.residence-radio');
  if (first) { first.checked = true; hiddenResidence.value = first.value; }
  peopleInput.value = 4;
  // Clear custom activities
  customActivities.length = 0;
  customChips.innerHTML = '';
  otherInput.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
