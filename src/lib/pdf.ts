/** Minimal single-font PDF writer for the simulated Export (ASCII text only). */
export function makePdf(title: string, lines: string[]): Blob {
  const esc = (s: string) => s.replace(/[^\x20-\x7E]/g, ' ').replace(/([()\\])/g, '\\$1');
  const pages: string[][] = [];
  const all = [title, '', ...lines.flatMap((l) => wrap(l, 92))];
  for (let i = 0; i < all.length; i += 48) pages.push(all.slice(i, i + 48));

  const objs: string[] = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageIds = pages.map((_, i) => 4 + i * 2);
  objs.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pages.forEach((p, i) => {
    const content = ['BT', '/F1 10 Tf', '50 800 Td', '14 TL', ...p.map((l, j) => (j === 0 && i === 0 ? `/F1 14 Tf (${esc(l)}) Tj T* /F1 10 Tf` : `(${esc(l)}) Tj T*`)), 'ET'].join('\n');
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}

function wrap(s: string, n: number): string[] {
  if (s.length <= n) return [s];
  const words = s.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) {
      out.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
