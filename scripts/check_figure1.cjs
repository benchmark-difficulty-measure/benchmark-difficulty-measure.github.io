const assert = require('node:assert/strict');
const sim = require('../static/js/figure1.js');
const easy = sim.mismatch(.24), hard = sim.mismatch(.76);
assert(easy.b - easy.a < .003, 'Easy-heavy benchmark should hide the model gap');
assert(hard.b - hard.a > .1, 'Hard-heavy benchmark should expose the model gap');
assert.equal(easy.targetA, hard.targetA, 'Target scores must stay fixed');
assert.equal(easy.targetB, hard.targetB, 'Target scores must stay fixed');
assert(Math.abs((hard.b-hard.a)-(hard.targetB-hard.targetA))<1e-12, 'Matching target weights must reproduce the target score gap');
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
console.log('PASS: fixed target, weighting effect, invisible improvement, analytic uniform gain, probe effect, valid probabilities.');
