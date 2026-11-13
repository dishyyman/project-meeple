/* =====================================================================
   MEEPLE — DICE ENGINE
   ---------------------------------------------------------------------
   THE one dice implementation. Every roll in the app and every dice
   column in the content converter go through this file. If you are about
   to write a second parser, don't — extend this one.

   It lives apart from main.js because two callers need it and they load
   very differently:

     · the app    — a classic <script>, like every script the app loads.
                    Must be a plain global. (The app is served over
                    http:// now, so modules would work; whether to move to
                    them is an open question — docs/architecture.md §13.)
     · the tools  — tools/csv-to-json.mjs, so a malformed `2d8` in a
                    spreadsheet fails at conversion time rather than in
                    the middle of somebody's session.

   Hence the dual export at the bottom: a `globalThis` property for the
   browser, and module.exports for Node (which loads this as CommonJS,
   there being no package.json declaring otherwise). Neither knows about
   the other, and the parser below is written once for both.

   NEVER eval(). The grammar is hand-written recursive descent:

     expr   := term (('+' | '-') term)*
     term   := factor (('*' | '/') factor)*
     factor := '-' factor | '(' expr ')' | 'd' NUM | NUM ['d' NUM]
   ===================================================================== */
(function (root) {
  'use strict';

  // Limits are a denial-of-service guard as much as a rules statement:
  // 10000d1000 is not a roll anybody meant to make.
  var MAX_DICE = 100;
  var MAX_SIDES = 1000;

  var rollDie = function (sides) { return 1 + Math.floor(Math.random() * sides); };

  /* Evaluate a token array — e.g. ['2','d6','+','3'] — or a single-element
     array holding a whole expression. Returns { total, rolls } or throws.
     The array shape is what the roller's keypad produces (backspace has to
     remove a whole "d20", not one character); joining it here means callers
     with a plain string can pass [str] and get the same engine. */
  function evaluateDice(tokens) {
    // The UI shows × and ÷ because they read better; the grammar only knows
    // * and /. Substituting here keeps the pretty glyphs a display concern.
    var src = tokens.join('').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    var rolls = [];
    var i = 0;

    var isDigit = function (c) { return c >= '0' && c <= '9'; };
    var readNumber = function () {
      var s = '';
      while (i < src.length && isDigit(src[i])) s += src[i++];
      return parseInt(s, 10);
    };

    function takeDice(count) {
      if (!isDigit(src[i])) throw new Error('die needs sides');
      var sides = readNumber();
      if (count < 1 || count > MAX_DICE) throw new Error('1–' + MAX_DICE + ' dice');
      if (sides < 2 || sides > MAX_SIDES) throw new Error('2–' + MAX_SIDES + ' sides');
      var out = [];
      var sum = 0;
      for (var k = 0; k < count; k++) { var r = rollDie(sides); out.push(r); sum += r; }
      rolls.push({ notation: count + 'd' + sides, rolls: out, sides: sides });
      return sum;
    }

    function parseFactor() {
      if (src[i] === '-') { i++; return -parseFactor(); }
      if (src[i] === '(') {
        i++;
        var v = parseExpr();
        if (src[i] !== ')') throw new Error('missing )');
        i++;
        return v;
      }
      if (src[i] === 'd') { i++; return takeDice(1); }   // bare d20 means 1d20
      if (isDigit(src[i])) {
        var n = readNumber();
        if (src[i] === 'd') { i++; return takeDice(n); }
        return n;
      }
      throw new Error('incomplete roll');
    }

    function parseTerm() {
      var v = parseFactor();
      while (src[i] === '*' || src[i] === '/') {
        var op = src[i++];
        var r = parseFactor();
        if (op === '/') { if (r === 0) throw new Error('divide by zero'); v = v / r; }
        else v = v * r;
      }
      return v;
    }

    function parseExpr() {
      var v = parseTerm();
      while (src[i] === '+' || src[i] === '-') {
        var op = src[i++];
        var r = parseTerm();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }

    var value = parseExpr();
    if (i < src.length) throw new Error('incomplete roll');
    return { total: Math.floor(value), rolls: rolls };  // TTRPG convention: round down
  }

  /* Is this a legal dice expression? Used by the converter on every `dice`
     column. It ROLLS the expression and throws the result away, which looks
     wasteful but is the entire point: validating with anything other than the
     real engine is how the tool and the app drift apart. Returns null when
     valid, or the reason it isn't. */
  function validateDice(expr) {
    try {
      evaluateDice([String(expr)]);
      return null;
    } catch (e) {
      return e.message;
    }
  }

  var api = {
    evaluateDice: evaluateDice,
    validateDice: validateDice,
    MAX_DICE: MAX_DICE,
    MAX_SIDES: MAX_SIDES,
  };

  root.MEEPLE_DICE = api;
  // Node loads this file as CommonJS; the browser has no `module` at all.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
