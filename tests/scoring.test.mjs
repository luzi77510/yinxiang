import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../shared/seed.json' with { type: 'json' };
import { calculateResult, validateConfig } from '../shared/scoring.mjs';
function choices(counts, fixed = {}) {
  const remaining = { ...counts },
    out = {};
  for (const [id, dimension] of Object.entries(fixed)) {
    out[id] = seed.questions
      .find((q) => q.id === id)
      .options.find((o) => o.dimension === dimension).id;
    remaining[dimension]--;
  }
  for (const q of seed.questions) {
    if (out[q.id]) continue;
    const d = ['P', 'G', 'M'].find((d) => remaining[d] > 0);
    out[q.id] = q.options.find((o) => o.dimension === d).id;
    remaining[d]--;
  }
  return out;
}
test('正式题库为18题72个合法选项，映射沿用规范', () => {
  assert.equal(validateConfig(seed), true);
  assert.deepEqual(
    seed.questions.map((q) => q.options.map((o) => o.dimension).join('')),
    [
      'PGMP',
      'GMPG',
      'MPGM',
      'GMPG',
      'PGMP',
      'MGPM',
      'PGMP',
      'GMPG',
      'MPGM',
      'PMGP',
      'GMPG',
      'MPGM',
      'PGMP',
      'GMPG',
      'PGMP',
      'MPGM',
      'PMGP',
      'GPMG',
    ],
  );
});
for (const d of ['P', 'G', 'M'])
  test(`${d}最高：极值18分和0分，使用18为分母`, () => {
    const counts = { P: 0, G: 0, M: 0 };
    counts[d] = 18;
    const r = calculateResult(choices(counts), seed);
    assert.equal(r.result, d);
    assert.deepEqual(r.scores, counts);
    assert.equal(r.normalized[d], 100);
  });
for (const [name, counts, fixed, expected] of [
  ['PG偏G', { P: 8, G: 8, M: 2 }, { Q5: 'G', Q10: 'G', Q15: 'M' }, 'G'],
  ['PG同票', { P: 8, G: 8, M: 2 }, { Q5: 'P', Q10: 'G', Q15: 'M' }, 'P'],
  ['PM偏M', { P: 8, G: 2, M: 8 }, { Q3: 'M', Q9: 'M', Q12: 'G' }, 'M'],
  ['PM同票', { P: 8, G: 2, M: 8 }, { Q3: 'P', Q9: 'M', Q12: 'G' }, 'P'],
  ['GM偏M', { P: 2, G: 8, M: 8 }, { Q6: 'M', Q14: 'M', Q18: 'P' }, 'M'],
  ['GM同票', { P: 2, G: 8, M: 8 }, { Q6: 'G', Q14: 'M', Q18: 'P' }, 'G'],
  ['三维同分', { P: 6, G: 6, M: 6 }, {}, 'P'],
])
  test(`同分 ${name} 按维度归属投票`, () =>
    assert.equal(calculateResult(choices(counts, fixed), seed).result, expected));
test('彩蛋全部条件必须满足，原始计分保持不变', () => {
  const a = choices({ P: 6, G: 6, M: 6 });
  Object.assign(a, { Q1: 'D', Q9: 'A', Q18: 'C', Q4: 'C', Q8: 'C', Q13: 'C', Q17: 'A' });
  const r = calculateResult(a, seed);
  assert.equal(r.easterEgg, true);
  assert.equal(
    Object.values(r.scores).reduce((a, b) => a + b, 0),
    18,
  );
  for (const id of ['Q1', 'Q9', 'Q18', 'Q4', 'Q8', 'Q13']) {
    const next = { ...a, [id]: id === 'Q1' ? 'A' : id === 'Q9' ? 'B' : 'B' };
    assert.equal(calculateResult(next, seed).easterEgg, false, id);
  }
  const b = { ...a, Q17: 'C' };
  assert.equal(calculateResult(b, seed).easterEgg, true);
});
test('附加标签按照四舍五入后的展示分数判定', () => {
  assert.ok(calculateResult(choices({ P: 7, G: 6, M: 5 }), seed).tags.includes('双重魅力'));
  assert.ok(calculateResult(choices({ P: 9, G: 5, M: 4 }), seed).tags.includes('特质鲜明'));
  assert.ok(calculateResult(choices({ P: 6, G: 6, M: 6 }), seed).tags.includes('均衡型气质'));
});
test('拒绝缺题、多余题、非法选项和无效映射', () => {
  const a = choices({ P: 6, G: 6, M: 6 });
  const missing = { ...a };
  delete missing.Q1;
  for (const invalid of [null, [], missing, { ...a, Q19: 'A' }, { ...a, Q1: 'Z' }])
    assert.throws(() => calculateResult(invalid, seed));
  const c = structuredClone(seed);
  c.questions[0].options[0].dimension = 'X';
  assert.throws(() => calculateResult(a, c));
});
test('调整题目和选项显示顺序不会破坏规则引用', () => {
  const a = choices({ P: 8, G: 8, M: 2 }, { Q5: 'G', Q10: 'G', Q15: 'M' });
  const c = structuredClone(seed);
  c.questions.reverse();
  c.questions.forEach((q) => q.options.reverse());
  assert.deepEqual(calculateResult(a, c), calculateResult(a, seed));
});
test('1000组多倾向模拟：分数和唯一判定恒定，独立参考判定一致', () => {
  let x = 1729;
  const random = () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 4294967296;
  };
  for (let i = 0; i < 1000; i++) {
    const bias = i % 4,
      a = Object.fromEntries(
        seed.questions.map((q) => {
          const o =
            bias < 3 && random() < 0.6
              ? q.options.find((o) => o.dimension === ['P', 'G', 'M'][bias])
              : q.options[Math.floor(random() * 4)];
          return [q.id, o.id];
        }),
      );
    const r = calculateResult(a, seed),
      counts = { P: 0, G: 0, M: 0 },
      mapped = {};
    for (const q of seed.questions) {
      const d = q.options.find((o) => o.id === a[q.id]).dimension;
      counts[d]++;
      mapped[q.id] = d;
    }
    assert.deepEqual(r.scores, counts);
    assert.equal(
      Object.values(r.scores).reduce((a, b) => a + b, 0),
      18,
    );
    const top = Math.max(counts.P, counts.G, counts.M),
      w = ['P', 'G', 'M'].filter((d) => counts[d] === top);
    let expected = w[0];
    if (w.length === 3) expected = 'P';
    if (w.length === 2) {
      const refs =
        w.join('') === 'PG'
          ? ['Q5', 'Q10', 'Q15']
          : w.join('') === 'PM'
            ? ['Q3', 'Q9', 'Q12']
            : ['Q6', 'Q14', 'Q18'];
      const left = refs.filter((q) => mapped[q] === w[0]).length,
        right = refs.filter((q) => mapped[q] === w[1]).length;
      expected = right > left ? w[1] : w[0];
    }
    assert.equal(r.result, expected);
    for (const d of ['P', 'G', 'M'])
      assert.equal(r.normalized[d], Math.round((counts[d] / 18) * 100));
  }
});
