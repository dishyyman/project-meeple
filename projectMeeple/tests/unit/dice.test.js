/* =====================================================================
   MEEPLE — dice engine unit tests
   ---------------------------------------------------------------------
   Run:  npm run test:unit

   dice.js is the one dice implementation (CLAUDE.md), shared by the app
   and the content converter, so a regression here breaks both at once.

   Randomness is pinned rather than sampled: each test that rolls replaces
   Math.random with a fixed sequence, so a die's face is a stated input and
   the expected total is arithmetic, not a range. `face()` converts the face
   wanted into the random value that produces it under rollDie()'s
   1 + floor(r × sides).
   ===================================================================== */
'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateDice, validateDice, MAX_DICE, MAX_SIDES } = require('../../resources/js/dice.js');

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

// The random value that makes a `sides`-sided die land on `n`.
const face = (n, sides) => (n - 0.5) / sides;

// Make the next dice land on these faces, in order. Throws if the code rolls
// more dice than the test expected — an extra roll is a bug worth seeing.
function pinFaces(sides, ...faces) {
  const queue = faces.map((n) => face(n, sides));
  Math.random = () => {
    if (!queue.length) throw new Error('rolled more dice than the test pinned');
    return queue.shift();
  };
}

const roll = (expr) => evaluateDice([expr]);

/* ---- arithmetic, no dice ------------------------------------------ */

test('plain numbers and operators', () => {
  assert.equal(roll('7').total, 7);
  assert.equal(roll('2+3').total, 5);
  assert.equal(roll('10-4').total, 6);
  assert.equal(roll('3*4').total, 12);
});

test('multiplication and division bind tighter than + and -', () => {
  assert.equal(roll('2+3*4').total, 14);
  assert.equal(roll('20-6/2').total, 17);
});

test('parentheses override precedence', () => {
  assert.equal(roll('(2+3)*4').total, 20);
});

test('unary minus', () => {
  assert.equal(roll('-3+5').total, 2);
  assert.equal(roll('-(2+3)').total, -5);
});

test('totals round down (TTRPG convention)', () => {
  assert.equal(roll('7/2').total, 3);
  assert.equal(roll('-7/2').total, -4);   // floor, not truncation
});

test('display glyphs are accepted: × ÷ −', () => {
  assert.equal(roll('3×4').total, 12);
  assert.equal(roll('8÷2').total, 4);
  assert.equal(roll('5−2').total, 3);
});

test('a keypad token array means the same as the joined string', () => {
  assert.equal(evaluateDice(['1', '2', '+', '3']).total, 15);
});

/* ---- dice ---------------------------------------------------------- */

test('NdS sums N dice and records each face', () => {
  pinFaces(6, 4, 2);
  const r = roll('2d6');
  assert.equal(r.total, 6);
  assert.deepEqual(r.rolls, [{ notation: '2d6', rolls: [4, 2], sides: 6 }]);
});

test('a bare dS is one die', () => {
  pinFaces(20, 17);
  const r = roll('d20');
  assert.equal(r.total, 17);
  assert.equal(r.rolls[0].notation, '1d20');
});

test('dice combine with modifiers and other dice', () => {
  pinFaces(8, 5);                  // d8
  const a = roll('1d8+3');
  assert.equal(a.total, 8);

  // 2d6 then 1d4: pin both groups in roll order.
  const faces = [face(3, 6), face(6, 6), face(2, 4)];
  Math.random = () => faces.shift();
  const b = roll('2d6+1d4');
  assert.equal(b.total, 11);
  assert.equal(b.rolls.length, 2);
});

test('every face of a die is reachable, and nothing outside it', () => {
  for (let n = 1; n <= 6; n++) {
    pinFaces(6, n);
    assert.equal(roll('d6').total, n);
  }
  Math.random = () => 0;            // the lowest value Math.random can return
  assert.equal(roll('d6').total, 1);
  Math.random = () => 0.9999999;    // just under 1, the highest
  assert.equal(roll('d6').total, 6);
});

/* ---- limits: a rules statement and a denial-of-service guard ------- */

test('dice count limits: 1 to MAX_DICE', () => {
  assert.equal(MAX_DICE, 100);
  Math.random = () => 0;
  assert.equal(roll(`${MAX_DICE}d6`).total, MAX_DICE);
  assert.throws(() => roll(`${MAX_DICE + 1}d6`), /1–100 dice/);
  assert.throws(() => roll('0d6'), /1–100 dice/);
});

test('die size limits: 2 to MAX_SIDES', () => {
  assert.equal(MAX_SIDES, 1000);
  Math.random = () => 0;
  assert.equal(roll(`1d${MAX_SIDES}`).total, 1);
  assert.throws(() => roll(`1d${MAX_SIDES + 1}`), /2–1000 sides/);
  assert.throws(() => roll('1d1'), /2–1000 sides/);
});

/* ---- refusals ------------------------------------------------------- */

test('malformed expressions throw rather than guess', () => {
  for (const bad of ['', '2+', '2d', '(2+3', '2++3', 'abc', '2d6x', '3 + 4']) {
    assert.throws(() => roll(bad), `expected "${bad}" to be refused`);
  }
});

test('division by zero is refused', () => {
  assert.throws(() => roll('4/0'), /divide by zero/);
  assert.throws(() => roll('4/(2-2)'), /divide by zero/);
});

test('never evaluates code — JavaScript is just a malformed roll', () => {
  let ran = false;
  globalThis.__meepleProbe = () => { ran = true; };
  for (const js of ['__meepleProbe()', 'Math.max(1,2)', '1;__meepleProbe()', 'process.exit(1)']) {
    assert.throws(() => roll(js));
  }
  assert.equal(ran, false);
  delete globalThis.__meepleProbe;
});

/* ---- validateDice: what the converter uses ------------------------- */

test('validateDice returns null for legal expressions and the reason otherwise', () => {
  assert.equal(validateDice('2d8+1'), null);
  assert.equal(validateDice('1d1'), '2–1000 sides');
  assert.equal(validateDice('2d'), 'die needs sides');
});
