// main.ts — builds /output deterministically: copies game/ + screenshots/ from
// beside this file into the output dir FIRST, then writes /output/dossier.json
// with the kit's buildDossier. The copy must happen here: the grader runs this
// with a fresh empty MAKEFUN_OUTPUT_DIR, and buildDossier reads game/ from
// inside the output dir — without the copy it throws "game/: no such directory".
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
writeFileSync(join(out, 'dossier.json'), buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648, game_path_max_bytes: 1000 }));
console.log('dossier written:', join(out, 'dossier.json'));
