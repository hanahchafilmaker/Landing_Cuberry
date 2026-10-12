import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { team } from '../landing/src/data/content.ts';
import { migrateTeamProfile } from '../server/migrations/team-profile-2026.mjs';
const seed = JSON.parse(readFileSync(new URL('../server/seed.json', import.meta.url))).team;
const previous = JSON.parse(readFileSync(new URL('../server/migrations/team-before-profile-2026.json', import.meta.url)));
assert.equal(seed.length, 14);
assert.equal(new Set(seed.map(p => p.name)).size, 14);
for (const [i, p] of seed.entries()) {
  assert.equal(p.name, team[i].name);
  assert.equal(p.bio, team[i].career.join('\n'));
  assert.equal(p.photoUrl, '/' + team[i].image);
  assert.ok(existsSync(new URL('..' + p.photoUrl, import.meta.url)));
}
function dbWith(people) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE team (id INTEGER PRIMARY KEY, name TEXT, role TEXT, bio TEXT, photo_url TEXT,
      photo_position INTEGER, sort_order INTEGER, is_published INTEGER, landing_slot TEXT, updated_at TEXT)`);
  const insert = db.prepare('INSERT INTO team (name,role,bio,photo_url,photo_position,sort_order,is_published,landing_slot) VALUES (?,?,?,?,?,?,?,?)');
  for (const p of people) insert.run(p.name,p.role,p.bio,p.photoUrl,p.photoPosition,p.sortOrder,Number(p.isPublished),p.landingSlot);
  return db;
}
const old = dbWith(previous);
assert.equal(migrateTeamProfile(old, seed), 'upgraded');
assert.equal(old.prepare('SELECT COUNT(*) AS n FROM team').get().n, 14);
old.exec('DELETE FROM team');
assert.equal(migrateTeamProfile(old, seed), 'already-applied');
assert.equal(old.prepare('SELECT COUNT(*) AS n FROM team').get().n, 0);
old.close();
const pdf12 = dbWith(seed.filter(p => p.name !== '유세아' && p.name !== '성나연').map((p, i) => ({ ...p, sortOrder: i + 1 })));
pdf12.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('team_profile_2026', 'upgraded');
assert.equal(migrateTeamProfile(pdf12, seed), 'upgraded');
assert.equal(pdf12.prepare('SELECT COUNT(*) AS n FROM team').get().n, 14);
pdf12.close();
const customized = dbWith(previous.map((p,i) => i === 0 ? {...p,bio:'CMS edit'} : p));
assert.equal(migrateTeamProfile(customized, seed), 'customized-preserved');
assert.equal(customized.prepare('SELECT bio FROM team WHERE id=1').get().bio, 'CMS edit');
customized.close();
const fresh = dbWith(seed);
assert.equal(migrateTeamProfile(fresh, seed), 'current');
fresh.close();
console.log('Team profile: 14 profiles, fallback/seed consistency, migration (4->14 and 12->14) and CMS edit protection passed.');
