// A small, safe expression compiler for graph activities: the model writes
// a formula in x and k ("k*x^2", "x*tan(k*pi/180) - 9.8*x^2/(2*400*cos(k*pi/180)^2)")
// and the browser plots it. No eval: a tokenizer and a recursive-descent
// parser that only knows numbers, x, k, pi, e, + - * / ^, parentheses and a
// fixed list of functions. Anything else is a syntax error.
//
// Pure and dependency-free: shared by validation (server) and plotting (browser).

export type Fn = (x: number, k: number) => number;

const FUNCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  floor: Math.floor,
  round: Math.round,
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };
const MAX_LENGTH = 200;

type Token = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[\d.]/.test(c)) {
      const m = src.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i)!;
      if (!m) throw new SyntaxError(`bad number at ${i}`);
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
    } else if (/[a-z_]/i.test(c)) {
      const m = src.slice(i).match(/^[a-z_][a-z0-9_]*/i)!;
      out.push({ t: "id", v: m[0].toLowerCase() });
      i += m[0].length;
    } else if ("+-*/^(),".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else {
      throw new SyntaxError(`unexpected "${c}"`);
    }
  }
  return out;
}

/**
 * Compiles an expression in x and k. Throws SyntaxError on anything outside
 * the grammar. Implicit multiplication ("2x", "3(x+1)", "2pi") is allowed.
 */
export function compileExpression(src: string): Fn {
  if (typeof src !== "string" || !src.trim() || src.length > MAX_LENGTH) throw new SyntaxError("empty or too long");
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new SyntaxError(`expected "${v}"`);
    pos++;
  };
  // Starts of a factor, for implicit multiplication.
  const startsFactor = () => {
    const t = peek();
    return !!t && (t.t === "num" || t.t === "id" || (t.t === "op" && t.v === "("));
  };

  // expr := term (("+"|"-") term)*
  function expr(): Fn {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[pos++].v;
      const l = left;
      const r = term();
      left = op === "+" ? (x, k) => l(x, k) + r(x, k) : (x, k) => l(x, k) - r(x, k);
    }
    return left;
  }
  // term := unary (("*"|"/") unary | implicit unary)*
  function term(): Fn {
    let left = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = tokens[pos++].v;
        const l = left;
        const r = unary();
        left = op === "*" ? (x, k) => l(x, k) * r(x, k) : (x, k) => l(x, k) / r(x, k);
      } else if (startsFactor()) {
        const l = left;
        const r = power();
        left = (x, k) => l(x, k) * r(x, k);
      } else {
        return left;
      }
    }
  }
  // unary := ("-"|"+") unary | power
  function unary(): Fn {
    if (isOp("-")) {
      pos++;
      const v = unary();
      return (x, k) => -v(x, k);
    }
    if (isOp("+")) {
      pos++;
      return unary();
    }
    return power();
  }
  // power := atom ("^" unary)?   (right-associative, binds tighter than unary minus on its left)
  function power(): Fn {
    const base = atom();
    if (isOp("^")) {
      pos++;
      const exp = unary();
      return (x, k) => Math.pow(base(x, k), exp(x, k));
    }
    return base;
  }
  function atom(): Fn {
    const t = peek();
    if (!t) throw new SyntaxError("unexpected end");
    if (t.t === "num") {
      pos++;
      const v = t.v;
      return () => v;
    }
    if (t.t === "op" && t.v === "(") {
      pos++;
      const inner = expr();
      expect(")");
      return inner;
    }
    if (t.t === "id") {
      pos++;
      if (t.v === "x") return (x) => x;
      if (t.v === "k") return (_x, k) => k;
      if (t.v in CONSTANTS) {
        const v = CONSTANTS[t.v];
        return () => v;
      }
      if (t.v in FUNCTIONS) {
        const f = FUNCTIONS[t.v];
        expect("(");
        const arg = expr();
        expect(")");
        return (x, k) => f(arg(x, k));
      }
      throw new SyntaxError(`unknown name "${t.v}"`);
    }
    throw new SyntaxError(`unexpected "${t.v}"`);
  }

  const fn = expr();
  if (pos !== tokens.length) throw new SyntaxError("unexpected input after the end");
  return fn;
}

/** n+1 evenly spaced samples of f over [xMin, xMax] at parameter k. Non-finite results become null. */
export function sample(f: Fn, k: number, xMin: number, xMax: number, n = 120): { x: number; y: number | null }[] {
  const out: { x: number; y: number | null }[] = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const y = f(x, k);
    out.push({ x, y: Number.isFinite(y) ? y : null });
  }
  return out;
}
