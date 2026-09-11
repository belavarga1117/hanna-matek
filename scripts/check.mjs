import {readFile,readdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {games} from '../dist/catalog.js';
const root=path.resolve(import.meta.dirname,'..');
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const files=await walk(path.join(root,'dist'));for(const f of files.filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check',f]);
const html=await readFile(path.join(root,'dist/index.html'),'utf8');for(const [,asset]of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))await access(path.resolve(root,'dist',asset));
await access(path.join(root,'dist/assets/portraits.png'));
await access(path.join(root,'dist/assets/scenes.png'));
for(const f of (await walk(path.join(root,'server'))).filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check',f]);
const libs={hanna:(await import('../dist/hanna/ui.js')).hannaGames,core:(await import('../dist/games/core-games.js')).coreGames,association:(await import('../dist/games/association-games.js')).associationGames,advanced:(await import('../dist/games/advanced-games.js')).advancedGames,nback:(await import('../dist/nback/ui.js')).nbackGames,cognitive:(await import('../dist/cognitive/ui.js')).cognitiveGames};
if(games.length!==19||new Set(games.map(g=>g.id)).size!==19)throw new Error('Expected nineteen unique game modules');
for(const g of games)if(typeof libs[g.module]?.[g.id]?.mount!=='function')throw new Error(`Missing game: ${g.id}`);
for(const f of files){if(/\.(env|md|log)$/.test(f))throw new Error(`Private source included: ${f}`);}
console.log(`PASS: ${games.length} playable game modules, ${files.length} public files, syntax and local assets checked.`);
