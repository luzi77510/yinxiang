import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { STATIC, clearLocal, readLocal, removeResult } from '../api';
import { useState } from 'react';
export default function Info({ privacy = false }: { privacy?: boolean }) {
  const [message, setMessage] = useState('');
  async function clear() {
    try {
      const s = readLocal();
      if (s) await removeResult(s.id);
      else clearLocal();
      setMessage('当前测试记录已删除。');
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <article className="info-page">
      <div className="eyebrow">
        <Sparkles size={14} />
        IMPRESSION LAB / NOTES
      </div>
      <h1>{privacy ? '给你一份安心的说明' : '关于这场小小的探索'}</h1>
      {privacy ? (
        <>
          <h2>我们保存什么</h2>
          <p>
            {STATIC
              ? '当前网页将答案、进度和结果保存在你的浏览器中，不上传到测试服务器，也不建立跨用户统计。'
              : '网站保存匿名测试会话、题目选择、结果分数和必要的分享事件，用于完成测试及汇总分析。我们不要求姓名、手机号或社交账号。'}
          </p>
          <h2>记录保存多久</h2>
          <p>
            未完成的测试保留最多 7 天，已完成的测试保留最多 30
            天。浏览器清理数据、使用无痕模式或更换设备可能导致记录无法恢复。
            {!STATIC && '服务器定期清理过期测试记录，管理员操作日志保留最多90天。'}
          </p>
          <h2>分享由你决定</h2>
          <p>
            只有你点击生成海报或分享链接时，才会创建分享内容。分享内容包含称号和分数，不包含逐题答案。
            {STATIC
              ? '静态分享摘要存放在链接中，发出后无法远程撤回，请仅分享你愿意公开的内容。'
              : '公开链接可以在结果页撤销，完整私人结果需要通过原浏览器会话访问。'}
            已经保存到其他设备的海报图片无法收回。
          </p>
          <h2>删除与管理</h2>
          <p>
            你可以在结果页删除当前记录，也可以在这里执行。
            {!STATIC && '只有经过授权的管理员可以查看详细答题记录，导出和发布等操作会留下日志。'}
          </p>
          <button className="secondary" onClick={() => void clear()}>
            删除我的当前测试记录
          </button>
          {message && <p role="status">{message}</p>}
        </>
      ) : (
        <>
          <p className="lead">第一印象，像一本书的封面。它不是你的全部，却可能开启一段新的故事。</p>
          <h2>我们在探索什么</h2>
          <p>
            18
            道日常情境题，从你的社交反应、表达方式和相处习惯出发，观察亲和感、气场感和神秘感三种倾向。每一种都有自己的魅力，也没有哪种结果更好。
          </p>
          <h2>怎样选择更合适</h2>
          <p>
            按你最常出现的第一反应作答，不用猜哪一个选项更讨喜。你可以返回修改答案，也可以暂停后回来继续。预计用时约
            3 分钟。
          </p>
          <h2>分数意味着什么</h2>
          <p>
            每道题为一个维度记 1 分，18 道题合计 18 分。展示分数按原始分除以 18
            换算，表示本次选择的分布，不是人群排名或心理测量百分位。低分表示该特质在本次选择中较少体现。
          </p>
          <h2>一个必要的小提醒</h2>
          <p>
            这是娱乐性自我探索工具，基于用户自述，无法直接知道他人如何评价你，也没有经过专业心理测量验证。你的性格远比任何一个称号丰富，结果适合轻松参考。
          </p>
          <Link className="primary" to="/">
            回去开始探索 <ArrowRight size={18} />
          </Link>
        </>
      )}
    </article>
  );
}
