#!/usr/bin/env node
// Render Figure 1 from its preserved manuscript input, without changing its scale.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('assets/figure1-radar-data.json', root), 'utf8'));
assert.equal(data.rows.length, 15);
assert.equal(data.models.length, 3);
assert.equal(data.generalRadius, 1);
assert.deepEqual(data.socialTransform, { power: 1.35, scale: 0.92 });
const seen = new Set();
data.rows.forEach((row, i) => {
  assert.equal(row.model, data.models[Math.floor(i / 5)]);
  assert.equal(row.axis_index, i % 5);
  assert(!seen.has(`${row.model}/${row.axis_index}`));
  seen.add(`${row.model}/${row.axis_index}`);
  for (const value of [row.outer_raw, row.human_raw]) assert(Number.isFinite(value) && value >= 0 && value <= 100);
});

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const f = value => Number(value.toFixed(3));
const cx = 500, cy = 435, radius = 290;
const angle = i => (data.angleStartDegrees - i * 24) * Math.PI / 180;
const point = (i, r) => [f(cx + radius * r * Math.cos(angle(i))), f(cy - radius * r * Math.sin(angle(i)))];
const socialRadius = row => data.socialTransform.scale * (row.human_raw / 100) ** data.socialTransform.power;
const polygon = getRadius => data.rows.map((row, i) => point(i, getRadius(row)).join(',')).join(' ');
const circles = [0.25, 0.5, 0.75, 1].map(r => `<circle cx="${cx}" cy="${cy}" r="${radius * r}"/>`).join('');
const spokes = data.rows.map((_, i) => {
  const [x, y] = point(i, 1);
  return `<path d="M${cx} ${cy}L${x} ${y}"/>`;
}).join('');
const markers = data.rows.map((row, i) => {
  const [x, y] = point(i, 1), [sx, sy] = point(i, socialRadius(row));
  return `<circle class="general-marker" cx="${x}" cy="${y}" r="4.7"/><rect class="social-marker" x="${f(sx - 4)}" y="${f(sy - 4)}" width="8" height="8"/>`;
}).join('');
// Place paired task labels outside the reference curve, retaining the original order.
const labels = data.rows.map((row, i) => {
  const [x, y] = point(i, 1.085);
  const degrees = (data.angleStartDegrees - i * 24 + 720) % 360;
  const anchor = degrees > 65 && degrees < 115 || degrees > 245 && degrees < 295 ? 'middle' : Math.cos(angle(i)) > 0 ? 'start' : 'end';
  const lines = row.benchmark === 'LiveBench Math' ? ['LiveBench', 'Math'] : [row.benchmark];
  const height = (lines.length + 1) * 19;
  const vertical = Math.sin(angle(i));
  const top = vertical > 0.4 ? y - height + 15 : vertical < -0.4 ? y + 13 : y - height / 2 + 13;
  return `<text x="${x}" y="${f(top)}" text-anchor="${anchor}">${lines.map((line, n) => `<tspan class="benchmark-label" x="${x}" dy="${n ? 19 : 0}">${escape(line)}</tspan>`).join('')}<tspan class="survey-label" x="${x}" dy="20">${escape(row.survey)}</tspan></text>`;
}).join('\n  ');
const models = data.models.map((name, i) => {
  const a = (90 - i * 120) * Math.PI / 180;
  const x = f(cx + radius * 1.44 * Math.cos(a)), y = f(cy - radius * 1.35 * Math.sin(a));
  const rotation = [0, -60, 60][i];
  return `<text class="model-label" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotation} ${x} ${y})">${escape(name)}</text>`;
}).join('\n  ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="840" viewBox="0 0 1000 840" role="img" aria-labelledby="title desc">
  <title id="title">General reasoning and human social reasoning: manuscript Figure 1</title>
  <desc id="desc">Fifteen axes in three model groups. The cyan reference radius is fixed at 1. Social reasoning uses the original nonlinear transform, 0.92 times (source score divided by 100) to the power 1.35. Radii are not a shared accuracy scale. Original scores are available in the accompanying table.</desc>
  <defs>
    <radialGradient id="halo"><stop stop-color="#285788" stop-opacity=".2"/><stop offset="1" stop-color="#14253f" stop-opacity="0"/></radialGradient>
    <radialGradient id="general-fill"><stop stop-color="#7ad8ff" stop-opacity=".025"/><stop offset="1" stop-color="#7ad8ff" stop-opacity=".1"/></radialGradient>
    <radialGradient id="social-fill"><stop stop-color="#aa9bff" stop-opacity=".3"/><stop offset="1" stop-color="#aa9bff" stop-opacity=".12"/></radialGradient>
    <filter id="glow" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <style>
    text{font-family:Arial,Helvetica,sans-serif}.benchmark-label{fill:#d3e1f1;font-size:17px}.survey-label{fill:#b8adff;font-size:15px}.model-label{fill:#eef5ff;font-size:24px;font-weight:600;letter-spacing:-.5px}.grid{fill:none;stroke:#a6c8ef;stroke-opacity:.17;stroke-width:1;stroke-dasharray:3 6}.spokes{fill:none;stroke:#a6c8ef;stroke-opacity:.14;stroke-width:1;stroke-dasharray:2 5}.general-line{fill:url(#general-fill);stroke:#7ad8ff;stroke-width:2.7;stroke-linejoin:round}.social-line{fill:url(#social-fill);stroke:#b1a1ff;stroke-width:2.6;stroke-dasharray:7 5;stroke-linejoin:round;stroke-linecap:round}.general-marker{fill:#0b1526;stroke:#8edfff;stroke-width:2}.social-marker{fill:#151c35;stroke:#c0b2ff;stroke-width:1.9}
  </style>
  <circle cx="${cx}" cy="${cy}" r="385" fill="url(#halo)"/>
  <polygon points="${polygon(() => 1)}" fill="none" stroke="#7ad8ff" stroke-opacity=".15" stroke-width="6" filter="url(#glow)"/>
  <g class="grid">${circles}</g><g class="spokes">${spokes}</g>
  <polygon class="general-line" points="${polygon(() => data.generalRadius)}"/>
  <polygon class="social-line" points="${polygon(socialRadius)}"/>
  ${markers}
  <circle cx="${cx}" cy="${cy}" r="3" fill="#c0d8fa" fill-opacity=".55"/>
  ${labels}
  ${models}
</svg>
`;
const table = data.rows.map(row => `<tr><th scope="row">${escape(row.model)}</th><td>${escape(row.benchmark)}</td><td>${row.outer_raw.toFixed(2)}</td><td>${escape(row.survey)}</td><td>${row.human_raw.toFixed(2)}</td></tr>`).join('\n              ');
const output = new URL('assets/reasoning-radar.svg', root);
const indexUrl = new URL('index.html', root);
const html = await readFile(indexUrl, 'utf8');
const marker = /(<!-- radar-source-rows:start -->)[\s\S]*?(<!-- radar-source-rows:end -->)/;
assert(marker.test(html), 'Missing radar table markers in index.html');
const updated = html.replace(marker, (_, start, end) => `${start}\n              ${table}\n              ${end}`);
if (process.argv.includes('--write')) {
  await writeFile(output, svg);
  await writeFile(indexUrl, updated);
  console.log('Rendered Figure 1: 15 axes, all 30 original input scores, original display transform.');
} else if (process.argv.includes('--check')) {
  assert.equal(await readFile(output, 'utf8'), svg, 'Radar SVG is out of sync');
  assert.equal(html, updated, 'Radar source table is out of sync');
  console.log('Radar SVG and source table match the preserved Figure 1 data.');
} else {
  throw Error('Choose --write or --check');
}
