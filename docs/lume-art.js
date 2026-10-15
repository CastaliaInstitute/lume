(() => {
  const busts = {
    'a.borges': 'faculty/busts/jorge-luis-borges-profile-right.png',
    'a.confucius': 'faculty/busts/confucius-profile-right.png',
    'a.darwin': 'faculty/busts/charles-darwin-profile-right.png',
    'a.dickinson': 'faculty/busts/emily-dickinson-profile-right.png',
    'a.einstein': 'faculty/busts/albert-einstein-profile-right.png',
    'a.joyce': 'faculty/busts/james-joyce-profile-right.png',
    'a.marcusaurelius': 'faculty/busts/marcus-aurelius-profile-right.png',
    'a.plato': 'faculty/busts/plato-profile-right.png',
    'a.shakespeare': 'faculty/busts/william-shakespeare-profile-right.png',
    'a.thoreau': 'faculty/busts/henry-david-thoreau-profile-right.png',
    'a.tolstoy': 'faculty/busts/leo-tolstoy-profile-right.png',
    'a.woolf': 'faculty/busts/virginia-woolf-profile-right.png',
  };
  const motifs = {
    threshold: { name: 'The Threshold', family: 'Lyrical' },
    return: { name: 'The Return', family: 'Call & response' },
    suspended: { name: 'Suspended light', family: 'Atmospheric' },
    footsteps: { name: 'Footsteps at dusk', family: 'Rhythmic' },
    'open-sky': { name: 'Open sky', family: 'Lyrical' },
    spark: { name: 'Bright spark', family: 'Playful' },
  };
  const palettes = [
    ['#d8b778', '#6c8f78', '#f0e2bd'],
    ['#9bc8c4', '#556f99', '#e8e2c9'],
    ['#d6a4c3', '#786b9e', '#f0d6cc'],
    ['#a7c77c', '#4b7960', '#e2d8a4'],
    ['#88b8d1', '#6a76ad', '#e4dfa9'],
    ['#d68c68', '#80576e', '#edd2aa'],
  ];
  const hash = (text) => {
    let h = 2166136261;
    for (const char of String(text)) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const themeFor = (text = '') => {
    const t = text.toLocaleLowerCase();
    if (/wood|forest|tree|leaf|garden|nature|wild/.test(t)) return 'nature';
    if (/space|star|cosmos|physics|orbit|imagination|science/.test(t)) return 'cosmos';
    if (/poem|poetry|dream|memory|voice|lyric|feather|hope/.test(t)) return 'poetry';
    if (/sea|ocean|wave|water|journey|return/.test(t)) return 'water';
    if (/ethic|virtue|reason|wisdom|stoic|law|justice/.test(t)) return 'arches';
    return 'library';
  };
  const generate = ({ seed = '', text = '', prompt = '' } = {}) => {
    const h = hash(`${seed}|${text}|${prompt}`), theme = themeFor(`${text} ${prompt}`), colors = palettes[h % palettes.length];
    const [a, b, c] = colors, cx = 680 + (h % 180), cy = 790 + ((h >>> 7) % 390), r = 230 + ((h >>> 13) % 145);
    const angle = (h % 47) - 23, small = [];
    for (let i = 0; i < 13; i++) {
      const x = 530 + ((h >>> (i % 20)) * (i + 7) % 490);
      const y = 310 + ((h >>> (i % 18)) * (i + 13) % 1270);
      const size = 3 + ((h >>> (i % 16)) + i * 5) % 8;
      small.push(`<circle cx="${x}" cy="${y}" r="${size}" fill="${c}" fill-opacity=".42"/>`);
    }
    let image;
    if (theme === 'nature') image = `<path d="M780 1590C790 1220 810 820 845 300M820 1040C640 1030 515 900 440 700c198 10 347 100 380 340Zm28-145c187-45 307-180 350-380-194 35-320 162-350 380Zm-53 470c-170-14-290-115-370-280 173-5 318 78 370 280Zm57-206c190 4 327-92 425-262-191-15-346 73-425 262Z" fill="${a}" fill-opacity=".13" stroke="${c}" stroke-opacity=".66" stroke-width="9" stroke-linecap="round"/>`;
    else if (theme === 'cosmos') image = `<ellipse cx="${cx}" cy="${cy}" rx="${r + 145}" ry="${r * .43}" transform="rotate(${angle} ${cx} ${cy})" stroke="${c}" stroke-opacity=".72" stroke-width="7"/><ellipse cx="${cx}" cy="${cy}" rx="${r + 85}" ry="${r * .34}" transform="rotate(${-angle * 1.4} ${cx} ${cy})" stroke="${a}" stroke-opacity=".55" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="${r * .52}" fill="${b}" fill-opacity=".23"/><path d="M${cx} ${cy - r - 150}v${r * 2 + 300}M${cx - r - 160} ${cy}h${r * 2 + 320}" stroke="${c}" stroke-opacity=".22" stroke-width="3"/>`;
    else if (theme === 'poetry') image = `<path d="M500 1450C680 1120 845 760 1025 335M770 1040C610 950 520 800 500 620c190 62 300 220 270 420Zm45-113c160-116 241-258 266-425-175 63-282 212-266 425Zm-163 322c-155-70-240-191-278-370 167 31 277 141 278 370Zm201-231c159-75 250-183 313-340-173 0-291 101-313 340Z" fill="${a}" fill-opacity=".15" stroke="${c}" stroke-opacity=".64" stroke-width="8" stroke-linecap="round"/>`;
    else if (theme === 'water') image = `<path d="M370 760c150-140 300-140 450 0s300 140 450 0M360 930c160-140 320-140 480 0s320 140 480 0M365 1100c145-140 290-140 435 0s290 140 435 0M390 1270c130-130 260-130 390 0s260 130 390 0" stroke="${c}" stroke-opacity=".48" stroke-width="9" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${r}" stroke="${a}" stroke-opacity=".4" stroke-width="5"/>`;
    else if (theme === 'arches') image = `<path d="M420 1510V760a${r + 180} ${r + 180} 0 0 1 ${(r + 180) * 2} 0v750M540 1510V790a${r + 60} ${r + 60} 0 0 1 ${(r + 60) * 2} 0v720M660 1510V820a${r - 60} ${r - 60} 0 0 1 ${(r - 60) * 2} 0v690" stroke="${c}" stroke-opacity=".52" stroke-width="8"/><path d="M380 1510h${900}" stroke="${a}" stroke-opacity=".45" stroke-width="9"/>`;
    else image = `<path d="M455 520h555v970H455zM555 630h355v750H555zM655 730h155v550H655z" stroke="${c}" stroke-opacity=".46" stroke-width="8"/><path d="M730 735v545M655 830h155M655 940h155M655 1050h155M655 1160h155" stroke="${a}" stroke-opacity=".4" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="${r + 80}" stroke="${b}" stroke-opacity=".28" stroke-width="4"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" fill="none"><defs><radialGradient id="glow"><stop stop-color="${a}" stop-opacity=".42"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient><linearGradient id="fade" x1="0" x2="1" y1="0" y2="0"><stop stop-color="#151713" stop-opacity=".02"/><stop offset=".55" stop-color="#151713" stop-opacity=".12"/><stop offset="1" stop-color="#151713" stop-opacity=".42"/></linearGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${r + 230}" ry="${r + 350}" fill="url(#glow)"/><g transform="rotate(${angle} ${cx} ${cy})">${image}</g><g>${small.join('')}</g><rect width="1080" height="1920" fill="url(#fade)"/></svg>`;
  };
  const dataUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
  window.lumeArt = { motifs, busts, generate, themeFor, dataUri };
})();
