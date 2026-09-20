require('dotenv').config();
const express = require('express');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// ================================================================
//  Rule-based Water Plan Generator — no API key required
// ================================================================

const TIPS = {
  'long showers': [
    'Set a 5-minute shower timer using your phone alarm.',
    'Turn off the shower while soaping up — saves 10–15 litres per shower.',
    'Install a low-flow shower head (costs under ₹300) to cut water use by 40%.',
    'Keep a bucket in the shower to collect cold water while it heats up — use it for mopping or plants.'
  ],
  'bathtub use': [
    'Replace at least 3 baths per week with 5-minute showers — saves up to 150 litres per switch.',
    'If using the bathtub, fill it only halfway.',
    'Reuse bathwater to flush the toilet or water outdoor plants.'
  ],
  'garden watering': [
    'Water plants in the early morning or evening to reduce evaporation by up to 50%.',
    'Use a watering can instead of a hose — you use 3× less water.',
    'Group plants with similar water needs together.',
    'Add mulch around plants to retain soil moisture for longer.',
    'Collect rainwater in a bucket or barrel for garden use.'
  ],
  'washing machine': [
    'Only run the washing machine with a full load — saves 30–40 litres per cycle.',
    'Use the quick/eco wash cycle for lightly soiled clothes.',
    'Choose a washing machine with a 5-star water efficiency rating when replacing.',
    'Reuse the rinse water for mopping floors.'
  ],
  'dishwasher': [
    'Run the dishwasher only when fully loaded.',
    'Skip the heated dry cycle and air-dry dishes instead.',
    'Scrape plates instead of rinsing them before loading.'
  ],
  'hand-washing dishes': [
    'Fill a basin with soapy water instead of running the tap continuously — saves up to 20 litres.',
    'Rinse all dishes together at the end rather than one by one.',
    'Reuse the rinse water to water plants or mop floors.'
  ],
  'car washing': [
    'Use a bucket and sponge instead of a hose — saves 150+ litres per wash.',
    'Wash the car on grass so the water soaks into the ground.',
    'Wash the car fortnightly instead of weekly.',
    'Use a waterless car-wash spray for light dust.'
  ],
  'running tap while brushing': [
    'Turn off the tap while brushing — saves up to 12 litres per person per day.',
    'Use a small cup of water to rinse your mouth instead of running water.',
    'Do the same while shaving — fill the basin instead of running the tap.'
  ],
  'pool or water tank': [
    'Cover your pool when not in use to prevent evaporation.',
    'Check pool equipment monthly for leaks.',
    'Backwash the pool filter only when necessary.',
    'Inspect your water tank for cracks or overflow valve issues every month.'
  ],
  'floor mopping daily': [
    'Mop every alternate day instead of daily — most floors do not need daily mopping.',
    'Use a spray mop with a refillable bottle to minimise water use.',
    'Reuse washing machine rinse water or dishwashing water for mopping.',
    'Sweep or vacuum before mopping so you need less water to clean.'
  ]
};

const RESIDENCE_TIPS = {
  apartment: [
    'Report dripping taps or running toilets to your building maintenance immediately.',
    'Check common-area pipes and water meters monthly for unusual readings.',
    'Coordinate with neighbours — building-wide leaks waste water for everyone.'
  ],
  house: [
    'Install a rainwater harvesting tank connected to your roof drain pipe.',
    'Check your garden irrigation system for leaks or misdirected sprinklers.',
    'Inspect your external taps and hose connections every month.'
  ],
  hostel: [
    'Put up reminders near taps and showers encouraging shorter water use.',
    'Ask management to install sensor-based taps in common bathrooms.',
    'Organise a weekly "water check" walk to find dripping taps early.'
  ],
  villa: [
    'Install a smart water meter to monitor usage room by room.',
    'Check the swimming pool and garden irrigation for leaks weekly.',
    'Consider a greywater recycling system for garden irrigation.'
  ],
  farmhouse: [
    'Drip irrigation uses 60% less water than flood irrigation — consider switching.',
    'Test your soil moisture before watering crops or a garden.',
    'Check borewell and pump connections for leaks monthly.'
  ],
  other: [
    'Audit every tap, pipe, and appliance in your home for drips or slow leaks.',
    'Track your monthly water bill — a sudden rise often means a hidden leak.',
    'Install aerators on all taps (cost: ₹50–₹150 each) to halve flow rates.'
  ]
};

const LEAK_TIPS = {
  'yes': [
    'A dripping tap wastes up to 20,000 litres per year — fix it with a ₹30 washer.',
    'Check your toilet for a silent leak: put a few drops of food colouring in the tank. If colour appears in the bowl without flushing, you have a leak.',
    'Turn off all taps and check your water meter — if it still moves, there is a hidden leak.',
    'Contact a plumber within 48 hours to inspect joints, valves, and underground pipes.'
  ],
  'bills': [
    'Compare your last 6 months of bills for unusual spikes.',
    'Check every tap, toilet, and appliance connection for slow drips.',
    'Ask your water provider to inspect the meter and supply line for faults.'
  ],
  'both': [
    'You likely have multiple leak points — inspect every fitting systematically.',
    'Turn off the main water supply overnight and check the meter in the morning. Any change means an active leak.',
    'Call a licensed plumber for a full audit — the saving will pay for the visit quickly.'
  ]
};

const DAY_PLANS = [
  {
    day: 'Day 1',
    title: 'Audit & Awareness',
    actions: [
      'Walk through your home and check every tap, pipe joint, and toilet for drips.',
      'Note down which activities you do that use the most water.',
      'Read your water meter and record the number — you will check it again on Day 7.'
    ]
  },
  {
    day: 'Day 2',
    title: 'Fix the Easy Wins',
    actions: [
      'Turn the tap off while brushing teeth and shaving — starting today.',
      'Set a 5-minute shower timer on your phone for every shower this week.',
      'Put a "Save Water" sticky note near every tap as a reminder.'
    ]
  },
  {
    day: 'Day 3',
    title: 'Kitchen & Laundry',
    actions: [
      'Only run the washing machine or dishwasher with a completely full load.',
      'Fill a basin when washing dishes instead of running the tap.',
      'Collect vegetable-washing water and use it to water plants.'
    ]
  },
  {
    day: 'Day 4',
    title: 'Bathroom Deep-Dive',
    actions: [
      'Place a bucket in the shower to catch warm-up water — use it for mopping.',
      'Check your toilet flush mechanism for a running leak (food colouring test).',
      'Reduce one bath to a 5-minute shower today.'
    ]
  },
  {
    day: 'Day 5',
    title: 'Outdoor & Garden',
    actions: [
      'Water plants in the early morning to minimise evaporation.',
      'Use a bucket and sponge for any car or surface washing — no hosepipe.',
      'Add mulch or dry leaves around potted plants to hold soil moisture.'
    ]
  },
  {
    day: 'Day 6',
    title: 'Habits & Household',
    actions: [
      'Share one water-saving tip with every person in your household today.',
      'Reuse greywater (rinse water, mop water) for flushing or plants.',
      'Check taps again — tighten any that drip even slightly.'
    ]
  },
  {
    day: 'Day 7',
    title: 'Review & Commit',
    actions: [
      'Read your water meter again and compare it to Day 1 — note the difference.',
      'Identify the two habits you found easiest and commit to keeping them permanently.',
      'Plan one small investment: a low-flow shower head, tap aerator, or rainwater barrel.'
    ]
  }
];

// ── Plan builder ──────────────────────────────────────────────────
function generatePlan({ people, residence, activities, leaks }) {
  const lines = [];
  const peopleNum = parseInt(people, 10) || 1;

  // ── Section 1: High Water-Use Activities ──
  lines.push('1. High Water-Use Activities');
  lines.push('');

  const knownKeys = Object.keys(TIPS);
  const allActivities = Array.isArray(activities) && activities.length
    ? activities
    : ['running tap while brushing'];

  // Separate known vs custom activities
  const knownActivities  = allActivities.filter(a => knownKeys.includes(a));
  const customActivities = allActivities.filter(a => !knownKeys.includes(a));

  const topActivities = allActivities.slice(0, 5);
  topActivities.forEach(act => {
    lines.push(`- ${capitalise(act)}`);
  });

  if (peopleNum > 6) {
    lines.push(`- With ${peopleNum} people sharing the space, combined usage from any single habit multiplies quickly.`);
  }

  // ── Section 2: Why It Matters ──
  lines.push('');
  lines.push('2. Why It Matters');
  lines.push('');
  lines.push(`Your household of ${peopleNum} ${peopleNum === 1 ? 'person' : 'people'} living in a ${residence} has real potential to reduce daily water consumption.`);
  lines.push('Small habit changes made consistently can save thousands of litres per month without any cost.');
  lines.push('Water scarcity affects over 2 billion people globally. Every litre saved at home contributes to SDG 6 — Clean Water and Sanitation.');

  // ── Section 3: Water-Saving Tips ──
  lines.push('');
  lines.push('3. Water-Saving Tips');
  lines.push('');

  // Activity-specific tips (known activities)
  const usedTips = new Set();
  knownActivities.forEach(act => {
    const actTips = TIPS[act] || [];
    actTips.slice(0, 2).forEach(tip => {
      if (!usedTips.has(tip)) {
        lines.push(`- ${tip}`);
        usedTips.add(tip);
      }
    });
  });

  // Custom activity tips — generic water-saving advice
  if (customActivities.length > 0) {
    customActivities.forEach(act => {
      lines.push(`- For "${capitalise(act)}": aim to reduce the duration or frequency by 20% this week.`);
      lines.push(`- Track how often you do "${act}" and set a visible reminder to use only what is needed.`);
    });
  }

  // Residence-specific tips
  const resTips = RESIDENCE_TIPS[residence] || RESIDENCE_TIPS['other'];
  resTips.slice(0, 2).forEach(tip => {
    lines.push(`- ${tip}`);
  });

  // Leak-specific tips
  const leaksLower = (leaks || '').toLowerCase();
  let leakKey = null;
  if (leaksLower.includes('both')) leakKey = 'both';
  else if (leaksLower.includes('leak')) leakKey = 'yes';
  else if (leaksLower.includes('bill')) leakKey = 'bills';

  if (leakKey) {
    lines.push('');
    lines.push('Leak & Bill Alert:');
    LEAK_TIPS[leakKey].slice(0, 3).forEach(tip => {
      lines.push(`- ${tip}`);
    });
  }

  // ── Section 4: 7-Day Action Plan ──
  lines.push('');
  lines.push('4. 7-Day Action Plan');
  lines.push('');

  DAY_PLANS.forEach(({ day, title, actions }) => {
    lines.push(`${day}: ${title}`);
    actions.forEach(a => lines.push(`- ${a}`));
    lines.push('');
  });

  // ── Section 5: Important Reminder ──
  lines.push('5. Important Reminder');
  lines.push('');
  lines.push('- These tips are general guidelines based on common water-saving practices.');
  lines.push('- Actual water savings depend on your local water supply, climate, and household habits.');
  lines.push('- Never compromise hygiene, sanitation, or health in the name of saving water.');
  lines.push('- If you notice a significant leak, contact a licensed plumber promptly.');

  return lines.join('\n');
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── API route ─────────────────────────────────────────────────────
app.post('/api/get-plan', (req, res) => {
  try {
    const { people, residence, activities, leaks } = req.body;
    const plan = generatePlan({ people, residence, activities, leaks });
    res.json({ plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`WaterWise Advisor running at http://localhost:${PORT}`);
});
