const assert = require('node:assert/strict');
const sim = require('../static/js/figure1.js');
const mismatched = sim.mismatch(.24), aligned = sim.mismatch(.76);
assert.equal(sim.scoreVerdict(mismatched.a, mismatched.b), 'Close!', 'Mismatched benchmark should make the two models look close');
assert.equal(sim.scoreVerdict(mismatched.targetA, mismatched.targetB), 'Not close!', 'The target should expose the model difference');
assert.equal(sim.scoreVerdict(0, .0499), 'Close!');
assert.equal(sim.scoreVerdict(0, .05), 'Not close!', 'The threshold is strictly below 5 pp');
assert.equal(sim.scoreVerdict(.06, 0), 'Not close!', 'The verdict must use the absolute model gap');
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
console.log('PASS: fixed target, convergence to target, close-score threshold, invisible improvement, analytic uniform gain, probe effect, valid probabilities.');
