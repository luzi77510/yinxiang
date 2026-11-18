export const DIMENSIONS = ['P', 'G', 'M'];
export const DEFAULT_RULES = {
  ties: {
    PG: { questions: ['Q5', 'Q10', 'Q15'], challenger: 'G', fallback: 'P' },
    PM: { questions: ['Q3', 'Q9', 'Q12'], challenger: 'M', fallback: 'P' },
    GM: { questions: ['Q6', 'Q14', 'Q18'], challenger: 'M', fallback: 'G' },
  },
  egg: {
    required: { Q1: 'D', Q9: 'A', Q18: 'C' },
    group: ['Q4', 'Q8', 'Q13', 'Q17'],
    option: 'C',
    minimum: 3,
  },
  tags: { close: 8, distinct: 20, balancedMin: 30, balancedMax: 70 },
};
export function validateConfig(config) {
  if (!config || !Array.isArray(config.questions) || config.questions.length !== 18)
    throw new Error('发布版本必须恰好包含18道题');
  const ids = new Set();
  for (const q of config.questions) {
    if (
      !q.id ||
      ids.has(q.id) ||
      !q.text?.trim() ||
      !Array.isArray(q.options) ||
      q.options.length !== 4
    )
      throw new Error('题目ID、题干或选项数量不合法');
    ids.add(q.id);
    if (
      new Set(q.options.map((o) => o.id)).size !== 4 ||
      q.options.some((o) => !o.id || !o.text?.trim() || !DIMENSIONS.includes(o.dimension)) ||
      new Set(q.options.map((o) => o.dimension)).size !== 3
    )
      throw new Error(`${q.id}的选项或评分映射不完整`);
  }
  const rules = config.rules;
  if (!rules?.ties || !rules.egg || !rules.tags) throw new Error('评分规则不完整');
  for (const pair of ['PG', 'PM', 'GM']) {
    const t = rules.ties[pair];
    if (
      !t ||
      !Array.isArray(t.questions) ||
      t.questions.length !== 3 ||
      new Set(t.questions).size !== 3 ||
      t.questions.some((id) => !ids.has(id)) ||
      !pair.includes(t.challenger) ||
      !pair.includes(t.fallback) ||
      t.challenger === t.fallback
    )
      throw new Error('同分规则引用无效');
  }
  const e = rules.egg;
  const hasOption = (id, option) =>
    config.questions.find((q) => q.id === id)?.options.some((o) => o.id === option);
  if (
    !e.required ||
    !Object.keys(e.required).length ||
    Object.entries(e.required).some(([id, o]) => !hasOption(id, o)) ||
    !Array.isArray(e.group) ||
    !e.group.length ||
    new Set(e.group).size !== e.group.length ||
    e.group.some((id) => !hasOption(id, e.option)) ||
    !Number.isInteger(e.minimum) ||
    e.minimum < 1 ||
    e.minimum > e.group.length
  )
    throw new Error('彩蛋规则引用无效');
  const t = rules.tags;
  if (
    ['close', 'distinct', 'balancedMin', 'balancedMax'].some(
      (k) => typeof t[k] !== 'number' || !Number.isFinite(t[k]) || t[k] < 0 || t[k] > 100,
    ) ||
    t.balancedMin > t.balancedMax
  )
    throw new Error('附加标签阈值无效');
  for (const key of [...DIMENSIONS, 'NPC']) {
    const r = config.results?.[key];
    if (
      !r?.name?.trim() ||
      !r.quote?.trim() ||
      !r.analysis?.trim() ||
      !r.summary?.trim() ||
      !Array.isArray(r.tags) ||
      !r.tags.length ||
      !Array.isArray(r.advice) ||
      r.advice.length !== 3 ||
      !Array.isArray(r.impressions) ||
      r.impressions.length !== 3 ||
      !/^#[0-9a-f]{6}$/i.test(r.color) ||
      !/^#[0-9a-f]{6}$/i.test(r.background)
    )
      throw new Error(`${key}结果内容或颜色不完整`);
  }
  return true;
}
export function calculateResult(answers, config) {
  validateConfig(config);
  if (
    !answers ||
    typeof answers !== 'object' ||
    Array.isArray(answers) ||
    Object.keys(answers).length !== 18
  )
    throw new Error('请完成全部18道题');
  const scores = { P: 0, G: 0, M: 0 },
    selected = {};
  for (const q of config.questions) {
    const o = q.options.find((o) => o.id === answers[q.id]);
    if (!o) throw new Error(`${q.id}缺少答案或选项不合法`);
    scores[o.dimension]++;
    selected[q.id] = o.dimension;
  }
  const normalized = Object.fromEntries(
    DIMENSIONS.map((d) => [d, Math.round((scores[d] / 18) * 100)]),
  );
  const top = Math.max(...Object.values(scores));
  const winners = DIMENSIONS.filter((d) => scores[d] === top);
  let result = winners[0],
    reason = '最高维度';
  if (winners.length === 3) {
    result = 'P';
    reason = '三维同分，P > G > M';
  }
  if (winners.length === 2) {
    const t = config.rules.ties[winners.join('')];
    const votes = Object.fromEntries(
      winners.map((d) => [d, t.questions.filter((id) => selected[id] === d).length]),
    );
    result = votes[t.challenger] > votes[t.fallback] ? t.challenger : t.fallback;
    reason = `${winners.join('/')}并列，${t.questions.join('、')}投票：${JSON.stringify(votes)}`;
  }
  const e = config.rules.egg;
  const easterEgg =
    Object.entries(e.required).every(([q, a]) => answers[q] === a) &&
    e.group.filter((q) => answers[q] === e.option).length >= e.minimum;
  const sorted = Object.values(normalized).sort((a, b) => b - a),
    gap = sorted[0] - sorted[1],
    tags = [],
    t = config.rules.tags;
  if (gap > t.distinct) tags.push('特质鲜明');
  if (gap <= t.close) tags.push('双重魅力');
  if (sorted.every((n) => n >= t.balancedMin && n <= t.balancedMax)) tags.push('均衡型气质');
  return { scores, normalized, result, easterEgg, tags, reason };
}
export function publicConfig(config) {
  return {
    version: config.version,
    questions: config.questions.map(({ id, text, options }) => ({
      id,
      text,
      options: options.map(({ id, text }) => ({ id, text })),
    })),
  };
}
