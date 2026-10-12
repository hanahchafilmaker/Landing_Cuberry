import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { team } from '../landing/src/data/content.ts';
import { migrateTeamProfile } from '../server/migrations/team-profile-2026.mjs';
const seed = JSON.parse(readFileSync(new URL('../server/seed.json', import.meta.url))).team;
const previous = JSON.parse(readFileSync(new URL('../server/migrations/team-before-profile-2026.json', import.meta.url)));
assert.equal(seed.length, 12);
assert.equal(new Set(seed.map(p => p.name)).size, 12);
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
assert.equal(old.prepare('SELECT COUNT(*) AS n FROM team').get().n, 12);
old.exec('DELETE FROM team');
assert.equal(migrateTeamProfile(old, seed), 'already-applied');
assert.equal(old.prepare('SELECT COUNT(*) AS n FROM team').get().n, 0);
old.close();
const customized = dbWith(previous.map((p,i) => i === 0 ? {...p,bio:'CMS edit'} : p));
assert.equal(migrateTeamProfile(customized, seed), 'customized-preserved');
assert.equal(customized.prepare('SELECT bio FROM team WHERE id=1').get().bio, 'CMS edit');
customized.close();
const fresh = dbWith(seed);
assert.equal(migrateTeamProfile(fresh, seed), 'current');
fresh.close();
console.log('Team profile: 12 photos, fallback/seed consistency, migration and CMS edit protection passed.');
