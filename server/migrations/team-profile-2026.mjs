import { readFileSync } from 'node:fs';

const KEY = 'team_profile_2026';
const previous = JSON.parse(readFileSync(new URL('./team-before-profile-2026.json', import.meta.url), 'utf8'));
const fields = ['name', 'role', 'bio', 'photoUrl', 'photoPosition', 'sortOrder', 'isPublished', 'landingSlot'];
const signature = (item) => JSON.stringify(fields.map((key) => item[key]));
const coreFields = ['name', 'role', 'bio', 'photoUrl', 'photoPosition', 'isPublished', 'landingSlot'];
const coreSignature = (item) => JSON.stringify(coreFields.map((key) => item[key]));

// Upgrade only the unchanged, previously shipped roster (4-person initial seed or 12-person PDF seed).
// Never overwrite CMS edits, unpublished people or intentional deletions. Future restarts must not restore deleted staff.
export function migrateTeamProfile(db, team) {
  const rows = db.prepare(`SELECT name, role, bio, photo_url AS photoUrl,
    photo_position AS photoPosition, sort_order AS sortOrder, is_published AS isPublished,
    landing_slot AS landingSlot FROM team ORDER BY sort_order, id`).all()
    .map((row) => ({ ...row, isPublished: Boolean(row.isPublished) }));
  const teamCoreSet = new Set(team.map(coreSignature));
  const unchanged12 = rows.length === 12 && team.length > 12 && rows.every((row) => teamCoreSet.has(coreSignature(row)));
  const alreadyMeta = db.prepare('SELECT value FROM meta WHERE key = ?').get(KEY);
  if (alreadyMeta && !unchanged12) return 'already-applied';
  const unchanged4 = rows.length === previous.length && rows.every((row, i) => signature(row) === signature(previous[i]));
  const unchanged = unchanged4 || unchanged12;
  const current = rows.length === team.length && rows.every((row, i) => signature(row) === signature(team[i]));
  const status = unchanged ? 'upgraded' : current ? 'current' : 'customized-preserved';
  db.exec('BEGIN IMMEDIATE');
  try {
    if (unchanged) {
      db.exec('DELETE FROM team');
      const insert = db.prepare(`INSERT INTO team (name, role, bio, photo_url, photo_position,
        sort_order, is_published, landing_slot, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of team) insert.run(item.name, item.role, item.bio, item.photoUrl,
        item.photoPosition, item.sortOrder, Number(item.isPublished), item.landingSlot, new Date().toISOString());
    }
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(KEY, status);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return status;
}
