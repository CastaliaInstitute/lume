(() => {
  const busts = {
    'a.bradbury2': 'faculty/busts/ray-bradbury.webp',
    'a.bradbury2': 'faculty/busts/ray-bradbury.webp',
    'a.borges': 'faculty/busts/jorge-luis-borges-profile-right.webp',
    'a.baldwin20': 'faculty/busts/james-baldwin.webp',
    'a.baldwin21': 'faculty/busts/james-baldwin.webp',
    'a.AldousHuxley': 'faculty/busts/aldous-huxley.webp',
    'a.asimov1': 'faculty/busts/isaac-asimov.webp',
    'a.asimov2': 'faculty/busts/isaac-asimov.webp',
    'a.kelly24': 'faculty/busts/george-kelly.webp',
    'a.beer': 'faculty/busts/stafford-beer.webp',
    'a.hall81': 'faculty/busts/edward-t-hall.webp',
    'a.miller81': 'faculty/busts/george-a-miller.webp',
    'a.miller82': 'faculty/busts/george-a-miller.webp',
    'a.smith261': 'faculty/busts/john-maynard-smith.webp',
    'a.huxley9': 'faculty/busts/julian-huxley.webp',
    'a.haeckel': 'faculty/busts/ernst-haeckel.webp',
    'a.pauli': 'faculty/busts/wolfgang-pauli.webp',
    'a.bacon32': 'faculty/busts/francis-bacon.webp',
    'a.laing': 'faculty/busts/r-d-laing.webp',
    'a.tanizaki1': 'faculty/busts/junichiro-tanizaki.webp',
    'a.monod': 'faculty/busts/jacques-monod.webp',
    'a.freud5': 'faculty/busts/anna-freud.webp',
    'a.freud6': 'faculty/busts/anna-freud.webp',
    'a.rand10': 'faculty/busts/ayn-rand.webp',
    'a.jung4': 'faculty/busts/carl-jung.webp',
    'a.jung5': 'faculty/busts/carl-jung.webp',
    'a.confucius': 'faculty/busts/confucius-profile-right.webp',
    'a.darwin': 'faculty/busts/charles-darwin-profile-right.webp',
    'a.dick6': 'faculty/busts/philip-k-dick.webp',
    'a.dickinson': 'faculty/busts/emily-dickinson-profile-right.webp',
    'a.einstein': 'faculty/busts/albert-einstein-profile-right.webp',
    'a.gould': 'faculty/busts/stephen-jay-gould.webp',
    'a.joyce': 'faculty/busts/james-joyce-profile-right.webp',
    'a.keynes': 'faculty/busts/john-maynard-keynes.webp',
    'a.marcusaurelius': 'faculty/busts/marcus-aurelius-profile-right.webp',
    'a.sacks': 'faculty/busts/oliver-sacks.webp',
    'a.mccarthy8': 'faculty/busts/john-mccarthy.webp',
    'a.mccarthy9': 'faculty/busts/john-mccarthy.webp',
    'a.plato': 'faculty/busts/plato-profile-right.webp',
    'a.shakespeare': 'faculty/busts/william-shakespeare-profile-right.webp',
    'a.thoreau': 'faculty/busts/henry-david-thoreau-profile-right.webp',
    'a.tolstoy': 'faculty/busts/leo-tolstoy-profile-right.webp',
    'a.woolf': 'faculty/busts/virginia-woolf-profile-right.webp',
    'a.vonnegut1': 'faculty/busts/kurt-vonnegut.webp',
    'a.vonnegut2': 'faculty/busts/kurt-vonnegut.webp',
    'a.vonnegut3': 'faculty/busts/kurt-vonnegut.webp',
  };
  const bustFacing = { 'a.bradbury2': 'left', 'a.dick6': 'left', 'a.jung4': 'left', 'a.jung5': 'left', 'a.keynes': 'front', 'a.mccarthy8': 'front', 'a.mccarthy9': 'front' };
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
    if (/currency|econom|market|money|monetar|capital|wealth|trade|reform|bank/.test(t)) return 'economics';
    if (/brain|mind|memory|perception|conscious|psycholog|dream|identity|sacks/.test(t)) return 'mind';
    if (/music|sound|rhythm|song|voice|instrument|harmony/.test(t)) return 'sonic';
    if (/time|history|past|future|century|chronicle|memory/.test(t)) return 'time';
    if (/city|nation|state|society|politic|war|power|revolution|law|justice|architecture|institution|vitruvius|nightingale/.test(t)) return 'civic';
    if (/wood|forest|tree|leaf|garden|nature|wild|beetle|insect|species|animal|fabre/.test(t)) return 'nature';
    if (/space|star|cosmos|physics|orbit|imagination|science|origin|arithmetic|geometry|mathemat|morgan/.test(t)) return 'cosmos';
    if (/poem|poetry|lyric|feather|hope|letter|novel|story|fiction|austen|bronte|dickens|emma/.test(t)) return 'poetry';
    if (/sea|ocean|wave|water|river|journey|return/.test(t)) return 'water';
    if (/ethic|virtue|reason|wisdom|stoic|philosoph|republic/.test(t)) return 'arches';
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
    else if (theme === 'economics') image = `<path d="M330 1260c155-40 220-280 370-190s208-210 350-165 140-155 255-225M340 1370c190-50 260-280 405-205s205-195 352-150 135-155 250-207" stroke="${c}" stroke-opacity=".58" stroke-width="9" stroke-linecap="round"/><path d="M420 1490V970m190 520V800m190 690v-390m190 390V650m190 840v-620" stroke="${a}" stroke-opacity=".3" stroke-width="16"/><circle cx="${cx}" cy="${cy}" r="${r + 90}" stroke="${b}" stroke-opacity=".38" stroke-width="5"/>`;
    else if (theme === 'mind') image = `<path d="M${cx} ${cy}c-230-80-340-300-215-470s370-145 430 55 235 235 375 110 265-40 250 145-255 260-410 160-290-70-310 90 40 270 205 285" stroke="${c}" stroke-opacity=".62" stroke-width="8" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${r + 185}" stroke="${a}" stroke-opacity=".3" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="${r * .38}" fill="${b}" fill-opacity=".32"/>`;
    else if (theme === 'sonic') image = `<path d="M300 850c110 0 110-210 220-210s110 420 220 420 110-630 220-630 110 840 220 840 110-420 220-420" stroke="${c}" stroke-opacity=".72" stroke-width="10" stroke-linecap="round"/><path d="M300 1050c110 0 110-120 220-120s110 240 220 240 110-360 220-360 110 480 220 480 110-240 220-240" stroke="${a}" stroke-opacity=".48" stroke-width="6" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${r + 120}" stroke="${b}" stroke-opacity=".3" stroke-width="4"/>`;
    else if (theme === 'time') image = `<circle cx="${cx}" cy="${cy}" r="${r + 210}" stroke="${c}" stroke-opacity=".54" stroke-width="7"/><circle cx="${cx}" cy="${cy}" r="${r + 120}" stroke="${a}" stroke-opacity=".36" stroke-width="4" stroke-dasharray="12 28"/><path d="M${cx} ${cy - r}v${r}l${r * .64} ${r * .42}M${cx - r - 110} ${cy + r + 140}c180-155 415-155 610 0M${cx - r - 110} ${cy + r + 245}c180-155 415-155 610 0" stroke="${c}" stroke-opacity=".54" stroke-width="8" stroke-linecap="round"/>`;
    else if (theme === 'civic') image = `<path d="M350 860 850 560l500 300M450 900v500m265-500v500m270-500v500m265-500v500M380 1440h940M470 785h760" stroke="${c}" stroke-opacity=".56" stroke-width="9" stroke-linecap="round"/><path d="M520 760c0-180 145-325 325-325s325 145 325 325" stroke="${a}" stroke-opacity=".4" stroke-width="7"/><circle cx="${cx}" cy="${cy}" r="${r + 250}" stroke="${b}" stroke-opacity=".24" stroke-width="4"/>`;
    else image = `<path d="M455 520h555v970H455zM555 630h355v750H555zM655 730h155v550H655z" stroke="${c}" stroke-opacity=".46" stroke-width="8"/><path d="M730 735v545M655 830h155M655 940h155M655 1050h155M655 1160h155" stroke="${a}" stroke-opacity=".4" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="${r + 80}" stroke="${b}" stroke-opacity=".28" stroke-width="4"/>`;
    const treatment = h % 3;
    const styleLayer = treatment === 0
      ? `<path d="M0 0h1080v1920H0z" fill="url(#wash)"/><ellipse cx="${cx}" cy="${cy}" rx="${r + 250}" ry="${r + 430}" fill="url(#glow)"/><path d="M-80 1330C210 1010 460 1620 1160 970v1030H-80Z" fill="${b}" fill-opacity=".12"/>`
      : treatment === 1
        ? `<path d="M-80 510C260 360 430 700 1140 400M-90 650C290 480 570 870 1180 570M-60 1510C270 1270 650 1630 1140 1300" stroke="${c}" stroke-opacity=".22" stroke-width="95" stroke-linecap="round"/><ellipse cx="${cx}" cy="${cy}" rx="${r + 190}" ry="${r + 330}" fill="url(#glow)"/>`
        : `<ellipse cx="${cx}" cy="${cy}" rx="${r + 290}" ry="${r + 420}" fill="url(#glow)"/><path d="M-40 960C180 800 400 900 610 690S960 550 1120 420M-40 1480C190 1280 450 1550 680 1300s330-190 460-390" stroke="${a}" stroke-opacity=".2" stroke-width="58" stroke-linecap="round"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" fill="none"><defs><radialGradient id="glow"><stop stop-color="${a}" stop-opacity=".72"/><stop offset=".48" stop-color="${b}" stop-opacity=".28"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient><linearGradient id="wash" x1=".08" y1="0" x2=".92" y2="1"><stop stop-color="${b}" stop-opacity=".36"/><stop offset=".46" stop-color="#11130f" stop-opacity=".02"/><stop offset="1" stop-color="${a}" stop-opacity=".22"/></linearGradient><linearGradient id="fade" x1="0" x2="1" y1="0" y2="0"><stop stop-color="#10120f" stop-opacity=".56"/><stop offset=".57" stop-color="#10120f" stop-opacity=".16"/><stop offset="1" stop-color="#10120f" stop-opacity=".3"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="85"/></filter><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="2" seed="${h % 997}"/><feColorMatrix values=".5 0 0 0 .2 .5 0 0 0 .2 .5 0 0 0 .2 0 0 0 .12 0"/></filter></defs><rect width="1080" height="1920" fill="#11130f"/><ellipse cx="${cx}" cy="${cy}" rx="${r + 310}" ry="${r + 470}" fill="url(#glow)"/><ellipse cx="${360 + h % 300}" cy="${560 + (h >>> 8) % 1000}" rx="${250 + h % 180}" ry="${480 + (h >>> 12) % 260}" fill="${b}" fill-opacity=".16" filter="url(#soft)"/><ellipse cx="${760 + (h >>> 5) % 260}" cy="${1150 + (h >>> 11) % 480}" rx="${220 + (h >>> 14) % 180}" ry="${360 + h % 240}" fill="${a}" fill-opacity=".14" filter="url(#soft)"/><rect width="1080" height="1920" fill="url(#wash)"/>${styleLayer}<g transform="rotate(${angle} ${cx} ${cy})">${image}</g><g>${small.join('')}</g><rect width="1080" height="1920" fill="url(#fade)"/><rect width="1080" height="1920" filter="url(#grain)" opacity=".11"/></svg>`;
  };
  const dataUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
  window.lumeArt = { motifs, busts, bustFacing, generate, themeFor, dataUri };
})();
