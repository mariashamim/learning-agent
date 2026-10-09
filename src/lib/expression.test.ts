import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeActivity } from "./activities";
import { compileExpression, sample } from "./expression";

const at = (src: string, x: number, k = 0) => compileExpression(src)(x, k);
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

describe("compileExpression", () => {
  it("follows operator precedence and associativity", () => {
    assert.equal(at("1 + 2 * 3", 0), 7);
    assert.equal(at("(1 + 2) * 3", 0), 9);
    assert.equal(at("2 ^ 3 ^ 2", 0), 512, "^ is right-associative");
    assert.equal(at("-x^2", 3), -9, "minus applies after the power");
    assert.equal(at("10 - 4 - 3", 0), 3);
    assert.equal(at("8 / 4 / 2", 0), 1);
  });

  it("knows x, k, constants and functions", () => {
    assert.equal(at("k*x^2", 3, 2), 18);
    close(at("sin(pi/2)", 0), 1);
    close(at("ln(e)", 0), 1);
    close(at("log(1000)", 0), 3);
    assert.equal(at("sqrt(abs(x))", -16), 4);
  });

  it("allows implicit multiplication", () => {
    assert.equal(at("2x", 5), 10);
    assert.equal(at("3(x+1)", 1), 6);
    close(at("2pi", 0), 2 * Math.PI);
    assert.equal(at("2x^2", 3), 18, "the power binds tighter than the implicit product");
  });

  it("plots a projectile trajectory", () => {
    // Launch at k degrees, 20 m/s: lands at v^2 sin(2k)/g.
    const f = compileExpression("x*tan(k*pi/180) - 9.8*x^2/(2*20^2*cos(k*pi/180)^2)");
    const range = (20 * 20 * Math.sin((2 * 45 * Math.PI) / 180)) / 9.8;
    close(f(0, 45), 0);
    assert.ok(Math.abs(f(range, 45)) < 1e-9);
    assert.ok(f(range / 2, 45) > 0);
  });

  it("rejects anything outside the grammar", () => {
    for (const bad of ["", "x +", "alert(1)", "x; y", "foo(x)", "window", "(x", "x)", "2 ** 3", "x".repeat(201), "y + 1"]) {
      assert.throws(() => compileExpression(bad), SyntaxError, bad);
    }
  });
});

describe("sampling", () => {
  it("returns null for points where the function is undefined", () => {
    const pts = sample(compileExpression("1/x"), 0, -1, 1, 2);
    assert.deepEqual(pts.map((p) => p.y), [-1, null, 1]);
  });
});

describe("graph activities", () => {
  const raw = (axis: Record<string, number | string>) => ({
    type: "graph",
    title: "Launch angle",
    prompt: "Drag the launch angle.",
    reveal: "45 degrees goes furthest.",
    script: "x*tan(k*pi/180) - 9.8*x^2/(2*20^2*cos(k*pi/180)^2)",
    slider: { label: "Launch angle", min: 15, max: 75, step: 1, unit: "°", initial: 45 },
    bands: [
      { upTo: 40, title: "Flat", detail: "Low arc." },
      { upTo: 75, title: "Steep", detail: "High arc." },
    ],
    axis: { xLabel: "Distance (m)", yLabel: "Height (m)", xMin: 0, xMax: 45, yMin: 0, yMax: 25, ...axis },
  });

  it("accepts a correct formula with a window it is visible in", () => {
    const a = normalizeActivity(raw({}), 0);
    assert.ok(a && a.type === "graph");
    assert.equal(a.axis.yMax, 25);
  });

  it("rejects a window the curve never appears in, or a bad window or formula", () => {
    assert.equal(normalizeActivity(raw({ yMin: 500, yMax: 900 }), 0), null);
    assert.equal(normalizeActivity(raw({ yMin: 25, yMax: 0 }), 0), null);
    assert.equal(normalizeActivity({ ...raw({}), script: "x +* 2" }, 0), null);
    assert.equal(normalizeActivity({ ...raw({}), script: "5" }, 0), null, "a flat line shows nothing");
  });
});
