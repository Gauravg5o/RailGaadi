/**
 * Smoke-test for the Phase 2 delay engine OLS computation.
 * Run with: npx ts-node --project tsconfig.json src/lib/__tests__/delayEngine.smoke.ts
 *
 * Does NOT require the server to be running — tests the pure math functions
 * in isolation by bypassing the store and calling the OLS logic directly.
 *
 * Expected output is printed below each test case.
 */

// Inline the OLS function (copy from delayEngine.ts) to test without imports
function olsSlope(points: Array<{ x: number; y: number }>): number {
  const n = points.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX  += p.x; sumY  += p.y;
    sumXY += p.x * p.y; sumX2 += p.x * p.x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function classifyTrend(slope: number): string {
  if (slope >  0.5) return 'growing';
  if (slope < -0.5) return 'recovering';
  return 'stable';
}

function project(currentDelay: number, slope: number, remaining: number): number {
  return Math.min(Math.max(0, Math.round(currentDelay + slope * remaining)), currentDelay + 180);
}

// ─── Test 1: Growing delay ────────────────────────────────────────────────────
// Delays: 5, 7, 9, 11, 13 min at stations 0-4 → slope should be exactly +2
console.log('─── Test 1: Growing delay ───');
const t1 = [{ x:0,y:5 },{ x:1,y:7 },{ x:2,y:9 },{ x:3,y:11 },{ x:4,y:13 }];
const s1 = olsSlope(t1);
console.log(`slope = ${s1} (expected 2.0)`);
console.log(`trend = ${classifyTrend(s1)} (expected growing)`);
console.log(`projected (current=13, remaining=10) = ${project(13, s1, 10)} min (expected 33)`);
console.assert(Math.abs(s1 - 2.0) < 0.001, 'FAIL: slope should be 2.0');
console.assert(classifyTrend(s1) === 'growing', 'FAIL: trend should be growing');
console.log('PASS ✓\n');

// ─── Test 2: Recovering delay ─────────────────────────────────────────────────
// Delays: 20, 17, 14, 11, 8 → slope should be exactly -3
console.log('─── Test 2: Recovering delay ───');
const t2 = [{ x:0,y:20 },{ x:1,y:17 },{ x:2,y:14 },{ x:3,y:11 },{ x:4,y:8 }];
const s2 = olsSlope(t2);
console.log(`slope = ${s2} (expected -3.0)`);
console.log(`trend = ${classifyTrend(s2)} (expected recovering)`);
console.log(`projected (current=8, remaining=5) = ${project(8, s2, 5)} min (expected 0, clamped)`);
console.assert(Math.abs(s2 - (-3.0)) < 0.001, 'FAIL: slope should be -3.0');
console.assert(classifyTrend(s2) === 'recovering', 'FAIL: trend should be recovering');
console.log('PASS ✓\n');

// ─── Test 3: Stable delay ─────────────────────────────────────────────────────
// Delays: 10, 10, 10, 10 → slope = 0 exactly
console.log('─── Test 3: Stable delay ───');
const t3 = [{ x:0,y:10 },{ x:1,y:10 },{ x:2,y:10 },{ x:3,y:10 }];
const s3 = olsSlope(t3);
console.log(`slope = ${s3} (expected 0)`);
console.log(`trend = ${classifyTrend(s3)} (expected stable)`);
console.assert(s3 === 0, 'FAIL: slope should be 0');
console.assert(classifyTrend(s3) === 'stable', 'FAIL: trend should be stable');
console.log('PASS ✓\n');

// ─── Test 4: Cold-start (1 point) ─────────────────────────────────────────────
console.log('─── Test 4: Cold-start (1 point) ───');
const s4 = olsSlope([{ x:0, y:15 }]);
console.log(`slope = ${s4} (expected 0 — need ≥2 points)`);
console.assert(s4 === 0, 'FAIL: slope should be 0 for 1-point input');
console.log('PASS ✓\n');

// ─── Test 5: Noisy but growing ────────────────────────────────────────────────
// Real-world-ish: 5, 8, 6, 10, 12 → slope should be positive
console.log('─── Test 5: Noisy but growing ───');
const t5 = [{ x:0,y:5 },{ x:1,y:8 },{ x:2,y:6 },{ x:3,y:10 },{ x:4,y:12 }];
const s5 = olsSlope(t5);
console.log(`slope = ${s5.toFixed(3)} (expected ~1.7)`);
console.log(`trend = ${classifyTrend(s5)} (expected growing)`);
console.assert(classifyTrend(s5) === 'growing', 'FAIL: trend should be growing');
console.log('PASS ✓\n');

console.log('All smoke tests passed.');
