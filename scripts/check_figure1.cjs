const assert = require('node:assert/strict');
const sim = require('../static/js/figure1.js');
const mismatched = sim.mismatch(.24), aligned = sim.mismatch(.76);
assert.equal(sim.gapVerdict(mismatched), 'Not close!', 'Compare the benchmark gap with the target gap');
assert.equal(sim.gapVerdict(aligned), 'Close!', 'Matching distributions must give matching gaps even when the two models differ');
assert.equal(sim.gapVerdict({a: 0, b: .2, targetA: 0, targetB: .2}), 'Close!');
assert.equal(sim.gapVerdict({a: 0, b: 0, targetA: 0, targetB: .0499}), 'Close!');
assert.equal(sim.gapVerdict({a: 0, b: 0, targetA: 0, targetB: .05}), 'Not close!');
assert.equal(sim.gapVerdict({a: 0, b: .06, targetA: 0, targetB: 0}), 'Not close!');
assert(sim.isMissedProgress(0, .0242), 'Highlight invisible positive progress');
assert(sim.isMissedProgress(.00004, .0242), 'Highlight gains that round to +0.00 pp');
assert(!sim.isMissedProgress(.00006, .0242), 'Do not flag a displayed nonzero gain as zero');
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
assert(Math.abs(hidden.uniformAfter-hidden.uniformBefore-.0242)<1e-7, 'Uniform gain must agree with the integral of the raised cosine bump');
assert(Math.abs((visible.after-visible.before)-.22/11)<1e-12, 'The probe should contribute one item of peak gain to an 11-item benchmark');
assert(sim.coverage(.31, false).after > sim.coverage(.31, false).before, 'Improvement at a sampled item must be observable');
for (let center = .12; center <= .88001; center += .01) {
  for (let z = 0; z <= 1; z += .001) {
    const p = sim.before(z) + sim.improvement(z, center);
    assert(p >= 0 && p <= 1, 'Performance curves must be probabilities');
  }
}
console.log('PASS: fixed target, convergence to target, benchmark-versus-target gap verdict, missed-progress highlighting, invisible improvement, analytic uniform gain, probe effect, valid probabilities.');
