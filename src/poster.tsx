import QRCode from 'qrcode';
import { renderToStaticMarkup } from 'react-dom/server';
import { Character } from './components/Art';
import type { Result } from './types';
const font = '"Microsoft YaHei", "PingFang SC", sans-serif';
function image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('海报素材加载失败，请重试'));
    i.src = src;
  });
}
export async function createPoster(result: Result, url: string, nickname = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1440;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('浏览器暂不支持生成图片');
  const t = result.template,
    dark = result.easterEgg,
    color = dark ? '#F2E3C4' : '#302941',
    muted = dark ? '#C1AECC' : '#756C84';
  c.fillStyle = t.background;
  c.fillRect(0, 0, 1080, 1440);
  c.fillStyle = dark ? '#2F2539' : '#FFFDF9';
  c.beginPath();
  c.roundRect(42, 42, 996, 1356, 36);
  c.fill();
  c.fillStyle = color;
  c.font = `600 24px ${font}`;
  c.fillText('✦ 印象研究所', 100, 110);
  c.textAlign = 'right';
  c.fillStyle = muted;
  c.font = `18px ${font}`;
  c.fillText('IMPRESSION LAB / VOL.01', 980, 110);
  c.textAlign = 'center';
  c.fillStyle = muted;
  c.font = `25px ${font}`;
  c.fillText(
    nickname ? `${nickname.slice(0, 12)} 的第一印象倾向是` : '我的第一印象倾向是',
    540,
    197,
  );
  c.fillStyle = color;
  c.font = `bold 64px ${font}`;
  c.fillText(t.name, 540, 281);
  const svg = renderToStaticMarkup(
    <Character type={t.art || (dark ? 'NPC' : result.result)} />,
  ).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  const art = await image('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  c.drawImage(art, 320, 305, 440, 440);
  c.fillStyle = color;
  c.font = `30px ${font}`;
  const wrap = (text: string, max: number) => {
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      if (c.measureText(line + ch).width > max) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  };
  wrap(t.quote, 780)
    .slice(0, 4)
    .forEach((line, i) => c.fillText(line, 540, 770 + i * 46));
  c.font = `23px ${font}`;
  c.fillStyle = muted;
  c.fillText(t.tags.slice(0, 3).join('  ·  '), 540, 973);
  const labels = ['亲和感', '气场感', '神秘感'];
  (['P', 'G', 'M'] as const).forEach((d, i) => {
    const x = 280 + i * 260;
    c.fillStyle = t.color;
    c.font = `bold 50px ${font}`;
    c.fillText(String(result.normalized[d]), x, 1064);
    c.fillStyle = muted;
    c.font = `21px ${font}`;
    c.fillText(labels[i], x, 1103);
  });
  c.strokeStyle = dark ? '#5A4664' : '#E7DFED';
  c.beginPath();
  c.moveTo(100, 1146);
  c.lineTo(980, 1146);
  c.stroke();
  const qr = await image(
    await QRCode.toDataURL(url, {
      width: 166,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#302941', light: '#FFFFFF' },
    }),
  );
  c.drawImage(qr, 794, 1170, 164, 164);
  c.textAlign = 'left';
  c.fillStyle = color;
  c.font = `600 29px ${font}`;
  c.fillText('你在别人眼里，是什么画风？', 100, 1232);
  c.fillStyle = muted;
  c.font = `22px ${font}`;
  c.fillText('18 道情境题 · 约 3 分钟 · 扫码探索', 100, 1280);
  c.textAlign = 'center';
  c.font = `18px ${font}`;
  c.fillText('仅供娱乐与自我探索，不代表他人真实评价或专业心理测量。', 540, 1370);
  return canvas.toDataURL('image/png');
}
