import { readFileSync } from 'node:fs';

const KEY = 'team_profile_2026';
const previous = JSON.parse(readFileSync(new URL('./team-before-profile-2026.json', import.meta.url), 'utf8'));
const fields = ['name', 'role', 'bio', 'photoUrl', 'photoPosition', 'sortOrder', 'isPublished', 'landingSlot'];
const signature = (item) => JSON.stringify(fields.map((key) => item[key]));

// Upgrade only the unchanged, previously shipped roster. Never overwrite CMS edits,
// unpublished people or intentional deletions. Future restarts must not restore deleted staff.
export function migrateTeamProfile(db, team) {
  if (db.prepare('SELECT value FROM meta WHERE key = ?').get(KEY)) return 'already-applied';
  const rows = db.prepare(`SELECT name, role, bio, photo_url AS photoUrl,
    photo_position AS photoPosition, sort_order AS sortOrder, is_published AS isPublished,
    landing_slot AS landingSlot FROM team ORDER BY sort_order, id`).all()
    .map((row) => ({ ...row, isPublished: Boolean(row.isPublished) }));
  const unchanged = rows.length === previous.length && rows.every((row, i) => signature(row) === signature(previous[i]));
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
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(KEY, status);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return status;
}
