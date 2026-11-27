#!/usr/bin/env node
/**
 * Deterministic asset & generated-data integrity check for Splatoon 3 v12.0.0.
 * Verifies every badge & weapon referenced in src/data/splat3*.generated.ts exists on disk,
 * checks difficulty monotonicity, uniqueness, cross-references, and flags orphan WebPs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const badgesTsPath = path.join(root, 'src/data/splat3Badges.generated.ts');
const weaponsTsPath = path.join(root, 'src/data/splat3Weapons.generated.ts');
const badgesDir = path.join(root, 'public/assets/badges');
const weaponsDir = path.join(root, 'public/assets/weapons');

function parseGeneratedTuples(filePath, constName) {
  const src = fs.readFileSync(filePath, 'utf8');
  const startIdx = src.indexOf(constName);
  if (startIdx === -1) throw new Error(`Missing ${constName} in ${filePath}`);
  const arrStart = src.indexOf('= [', startIdx);
  const arrEnd = src.indexOf('\n];', arrStart);
  if (arrStart === -1 || arrEnd === -1) throw new Error(`Could not locate array bounds in ${filePath}`);
  const body = src.slice(arrStart + 3, arrEnd);
  const rows = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('[') || trimmed === '[') continue;
    const jsonLine = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
    rows.push(JSON.parse(jsonLine));
  }
  return rows;
}

const errors = [];

// 1. Validate all weapons
const weaponRows = parseGeneratedTuples(weaponsTsPath, 'RAW_SPLAT3_WEAPONS');
const weaponRowIds = new Set();
const expectedWeaponFiles = new Set(['special_splatbomb.webp', 'special_booyah.webp']);

for (const [rowId, nameZh, weaponClass, slot] of weaponRows) {
  if (weaponRowIds.has(rowId)) errors.push(`Duplicate weapon rowId: ${rowId}`);
  weaponRowIds.add(rowId);
  if (!nameZh || !weaponClass || slot < 0 || slot > 5) {
    errors.push(`Invalid weapon tuple: ${rowId}`);
  }
  expectedWeaponFiles.add(`${rowId}.webp`);
}

for (const file of expectedWeaponFiles) {
  const full = path.join(weaponsDir, file);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    errors.push(`Missing or empty weapon asset: public/assets/weapons/${file}`);
  }
}

for (const file of fs.readdirSync(weaponsDir)) {
  if (file.endsWith('.webp') && !expectedWeaponFiles.has(file)) {
    errors.push(`Orphan weapon asset: public/assets/weapons/${file}`);
  }
}

// 2. Validate all badges
const badgeRows = parseGeneratedTuples(badgesTsPath, 'RAW_SPLAT3_BADGES_V1200');
const badgeIds = new Set();
const expectedBadgeFiles = new Set();
let prevDiff = 0;

for (let i = 0; i < badgeRows.length; i++) {
  const [id, imgStem, nameZh, reqZh, cat, difficulty, tier, weaponRowId] = badgeRows[i];
  const lv = i + 1;
  if (badgeIds.has(id)) errors.push(`Duplicate badge id at Lv.${lv}: ${id}`);
  badgeIds.add(id);
  if (!nameZh || !reqZh || !cat || !tier) errors.push(`Empty badge metadata at Lv.${lv}: ${id}`);
  if (typeof difficulty !== 'number' || difficulty < 1 || difficulty > 100) {
    errors.push(`Out-of-range difficulty at Lv.${lv} (${id}): ${difficulty}`);
  }
  if (difficulty < prevDiff) {
    errors.push(`Non-monotonic difficulty at Lv.${lv} (${id}): ${difficulty} < ${prevDiff}`);
  }
  prevDiff = difficulty;
  if (weaponRowId && !weaponRowIds.has(weaponRowId)) {
    errors.push(`Unknown weaponRowId at Lv.${lv} (${id}): ${weaponRowId}`);
  }
  expectedBadgeFiles.add(`${imgStem}.webp`);
}

for (const file of expectedBadgeFiles) {
  const full = path.join(badgesDir, file);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    errors.push(`Missing or empty badge asset: public/assets/badges/${file}`);
  }
}

for (const file of fs.readdirSync(badgesDir)) {
  if (file.endsWith('.webp') && !expectedBadgeFiles.has(file)) {
    errors.push(`Orphan badge asset: public/assets/badges/${file}`);
  }
}

if (errors.length > 0) {
  console.error(`Asset integrity check FAILED (${errors.length} error(s)):`);
  for (const err of errors.slice(0, 30)) console.error(`  - ${err}`);
  if (errors.length > 30) console.error(`  ... and ${errors.length - 30} more`);
  process.exit(1);
}

console.log(
  `Asset integrity check PASSED: ${badgeRows.length} badges, ${weaponRows.length} weapons (+2 specials), 0 missing, 0 orphans.`,
);
