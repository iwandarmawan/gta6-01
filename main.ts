// main.ts — builds /output deterministically: game/ + screenshots/ + dossier.json.
// The dossier is byte-for-byte what the kit's buildDossier writes.
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(out, { recursive: true });
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(out + '/dossier.json', dossier);
console.log('dossier written:', out + '/dossier.json', dossier.length, 'bytes');
