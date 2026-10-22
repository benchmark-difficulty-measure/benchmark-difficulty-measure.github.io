const assert = require('node:assert/strict');
const sim = require('../static/js/figure1.js');
const mismatched = sim.mismatch(.24), aligned = sim.mismatch(.76);
assert.equal(sim.gapVerdict(mismatched), 'Not close!', 'Compare the benchmark gap with the target gap');
assert.equal(sim.gapVerdict(aligned), 'Close!', 'Matching distributions must give matching gaps even when the two models differ');
assert.equal(sim.gapVerdict({a: 0, b: .2, targetA: 0, targetB: .2}), 'Close!');
assert.equal(sim.gapVerdict({a: 0, b: 0, targetA: 0, targetB: .0299}), 'Close!');
assert.equal(sim.gapVerdict({a: 0, b: 0, targetA: 0, targetB: .03}), 'Close!');
assert.equal(sim.gapVerdict({a: 0, b: 0, targetA: 0, targetB: .0301}), 'Not close!');
assert.equal(sim.gapVerdict({a: 0, b: .06, targetA: 0, targetB: 0}), 'Not close!');
assert(sim.isMissedProgress(0, .22), 'Highlight invisible positive progress');
assert(sim.isMissedProgress(.00004, .22), 'Highlight gains that round to +0.00 pp');
assert(!sim.isMissedProgress(.00006, .22), 'Do not flag a displayed nonzero gain as zero');
assert(!sim.isMissedProgress(0, 0), 'No progress exists to miss when both gains are zero');
assert.equal(mismatched.targetA, aligned.targetA, 'Target scores must stay fixed');
assert.equal(mismatched.targetB, aligned.targetB, 'Target scores must stay fixed');
assert.equal(aligned.a, aligned.targetA, 'Matching distributions must reproduce model A target score');
assert.equal(aligned.b, aligned.targetB, 'Matching distributions must reproduce model B target score');
let lastDistance = Infinity, lastError = Infinity;
for (let alignment = 0; alignment <= 100; alignment++) {
  const r = sim.mismatch(.24 + .52 * alignment / 100);
  const distance = r.items.reduce((sum, z, i) => sum + Math.abs(z-r.target[i]), 0) / r.items.length;
  const error = Math.abs((r.b-r.a)-(r.targetB-r.targetA));
  assert(distance <= lastDistance + 1e-12, 'Moving the slider right must bring the distribution closer to the target');
  assert(error <= lastError + 1e-12, 'The illustrative model gap must converge to the target comparison');
  lastDistance = distance; lastError = error;
}
assert(lastDistance < 1e-12 && lastError < 1e-12);
const hidden = sim.coverage(.65, false), visible = sim.coverage(.65, true);
assert.equal(hidden.before, hidden.after, 'An unsampled local improvement must be invisible');
assert.equal(sim.improvement(.65, .65), .22, 'The model improves locally even while the benchmark gain stays zero');
assert(Math.abs((visible.after-visible.before)-.22/11)<1e-12, 'The probe should contribute one item of peak gain to an 11-item benchmark');
assert(sim.coverage(.31, false).after > sim.coverage(.31, false).before, 'Improvement at a sampled item must be observable');
for (let center = .12; center <= .88001; center += .01) {
  for (let z = 0; z <= 1; z += .001) {
    const p = sim.before(z) + sim.improvement(z, center);
    assert(p >= 0 && p <= 1, 'Performance curves must be probabilities');
  }
}
const movieStart = sim.movieFrame(0), movieAligned = sim.movieFrame(12), movieEnd = sim.movieFrame(32);
assert.equal(sim.gapVerdict(sim.mismatch(movieStart.center)), 'Not close!');
assert.equal(sim.gapVerdict(sim.mismatch(movieAligned.center)), 'Close!');
assert.equal(movieEnd.probe, true);
let previousMovieGap = -Infinity;
for (let seconds = 0; seconds <= 32; seconds += .25) {
  const frame = sim.movieFrame(seconds);
  const comparison = sim.mismatch(frame.center);
  assert.equal(comparison.targetA, aligned.targetA, 'Animation must leave target scores unchanged');
  assert.equal(comparison.targetB, aligned.targetB, 'Animation must leave target scores unchanged');
  assert(comparison.b-comparison.a >= previousMovieGap-1e-12, 'The animated comparison must move toward the target gap');
  previousMovieGap = comparison.b-comparison.a;
  const training = sim.coverage(.65, frame.probe, frame.gainScale);
  const gain = training.after-training.before;
  if (!frame.probe) assert.equal(gain, 0, 'Growing an improvement inside the gap must stay invisible');
  else assert(Math.abs(gain-.22/11)<1e-12, 'The final animation must report +2.00 pp on the augmented benchmark');
  assert(frame.gainScale >= 0 && frame.gainScale <= 1);
}
assert.deepEqual(sim.coverage(.65, false), hidden, 'Animation must preserve the original interactive example');
console.log('PASS: fixed target, convergence, 3 pp verdict, missed progress, local improvement, probe effect, valid probabilities, and all animated score states.');
