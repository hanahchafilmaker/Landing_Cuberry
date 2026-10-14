import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { team } from '../landing/src/data/content.ts';
import { migrateTeamProfile } from '../server/migrations/team-profile-2026.mjs';
const seed = JSON.parse(readFileSync(new URL('../server/seed.json', import.meta.url))).team;
const previous = JSON.parse(readFileSync(new URL('../server/migrations/team-before-profile-2026.json', import.meta.url)));

// seed.json 은 어드민에서 편집되고 "GitHub에 백업" 버튼/크론이 커밋하는 **살아있는 콘텐츠**입니다.
// 그래서 개수를 13으로 못박지 않는다 — 프로필을 추가·삭제해도 CI 가 깨지면 안 된다.
// 대신 ①이름 중복 금지 ②랜딩 기본 로스터(content.ts)에 있는 프로필은 이력·사진이 완전히 일치
// ③랜딩 순서가 뒤섞이지 않았는지 ④기본 로스터 사진 파일이 실제로 존재하는지를 검사한다.
assert.ok(seed.length > 0, 'seed 팀 프로필이 비어 있습니다');
assert.equal(new Set(seed.map(p => p.name)).size, seed.length, 'seed 팀 프로필 이름이 중복됩니다');
const shippedByName = new Map(team.map((person) => [person.name, person]));
for (const person of seed) {
  const shipped = shippedByName.get(person.name);
  if (shipped) {
    assert.equal(person.bio, shipped.career.join('\n'));
    assert.equal(person.photoUrl, '/' + shipped.image);
  }
  if (person.photoUrl.startsWith('/team_portraits/')) {
    assert.ok(existsSync(new URL('..' + person.photoUrl, import.meta.url)), `사진 파일 없음: ${person.photoUrl}`);
  }
}
const shippedOrder = seed
  .filter((person) => shippedByName.has(person.name))
  .map((person) => team.findIndex((candidate) => candidate.name === person.name));
assert.deepEqual(shippedOrder, [...shippedOrder].sort((a, b) => a - b), 'seed 프로필 순서가 랜딩 기본 로스터와 어긋납니다');
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
assert.equal(old.prepare('SELECT COUNT(*) AS n FROM team').get().n, seed.length);
old.exec('DELETE FROM team');
assert.equal(migrateTeamProfile(old, seed), 'already-applied');
assert.equal(old.prepare('SELECT COUNT(*) AS n FROM team').get().n, 0);
old.close();
// PDF 로스터가 현재 로스터로 올라가는 경로. 로스터가 12명 이하로 줄어든 뒤에는 같은 픽스처가
// "사진만 PNG→WebP 로 바뀐 현재 로스터" 역할을 한다 — 두 경우 모두 upgrade 대상이다.
// sortOrder 는 손대지 않는다: 프로필을 삭제하면 번호에 빈 자리가 생기므로 i+1 로 다시 매기면
// 실제 콘텐츠와 어긋나 이 테스트가 콘텐츠 편집에 깨진다.
const pdfRoster = (seed.length > 12 ? seed.slice(0, 12) : seed.filter((p) => p.name !== '유세아'))
  .map((p) => ({ ...p, photoUrl: p.photoUrl.replace(/\.webp$/, '.png') }));
assert.ok(pdfRoster.length > 0, 'PDF 로스터 픽스처가 비어 있습니다');
assert.ok(pdfRoster.some((p) => p.photoUrl.endsWith('.png')), 'PNG→WebP 검증용 픽스처가 필요합니다');
const pdf12 = dbWith(pdfRoster);
pdf12.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('team_profile_2026', 'upgraded');
assert.equal(migrateTeamProfile(pdf12, seed), 'upgraded');
assert.equal(pdf12.prepare('SELECT COUNT(*) AS n FROM team').get().n, seed.length);
pdf12.close();
const previousRosterPhotos = dbWith(seed.map(p => ({ ...p, photoUrl: p.photoUrl.replace(/\.webp$/, '.png') })));
previousRosterPhotos.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('team_profile_2026', 'current');
assert.equal(migrateTeamProfile(previousRosterPhotos, seed), 'upgraded');
assert.deepEqual(
  previousRosterPhotos.prepare('SELECT photo_url AS photoUrl FROM team ORDER BY sort_order, id').all().map(row => row.photoUrl),
  seed.map(p => p.photoUrl),
);
previousRosterPhotos.close();
const customized = dbWith(previous.map((p,i) => i === 0 ? {...p,bio:'CMS edit'} : p));
assert.equal(migrateTeamProfile(customized, seed), 'customized-preserved');
assert.equal(customized.prepare('SELECT bio FROM team WHERE id=1').get().bio, 'CMS edit');
customized.close();
const fresh = dbWith(seed);
assert.equal(migrateTeamProfile(fresh, seed), 'current');
fresh.close();
console.log(`Team profile: ${seed.length} profiles, seed consistency (order·bio·photo), 4->N/12->N migration, WebP refresh and CMS edit protection passed.`);
