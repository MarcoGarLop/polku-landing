// Gemini Omni image → video via the Interactions API (Omni only supports this API).
// usage: GEMINI_API_KEY=… node tools/animate-omni.mjs gemini-omni-1.2-flash <image.png|-> <out.mp4> <prompt…>
import { readFileSync, writeFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const [model, imgPath, out, ...p] = process.argv.slice(2);
const input = [];
if (imgPath !== '-') input.push({ type: 'image', mime_type: 'image/jpeg', data: readFileSync(imgPath).toString('base64') });
input.push({ type: 'text', text: p.join(' ') });
const t0 = Date.now();
const short = o => JSON.stringify(o, (k, v) => (typeof v === 'string' && v.length > 200 ? v.slice(0, 60) + `…(${v.length})` : v)).slice(0, 1500);
let it;
try {
  it = await ai.interactions.create({ model, input, background: true,
    generation_config: { video_config: { task: imgPath !== '-' ? 'image_to_video' : 'text_to_video' } } });
} catch (e) { console.log('create error', e.status, String(e.message).slice(0, 600)); process.exit(1); }
console.log('created', it.id, it.status);
while (!['completed', 'failed', 'cancelled'].includes(it.status)) {
  await new Promise(r => setTimeout(r, 8000));
  it = await ai.interactions.get(it.id);
  process.stdout.write(`${it.status} ${((Date.now() - t0) / 1000).toFixed(0)}s  `);
}
console.log('\nfinal', short({ status: it.status, usage: it.usage, errors: it.errors }));
const v = it.output_video || (it.outputs || []).find(o => o.type === 'video');
if (v?.data) writeFileSync(out, Buffer.from(v.data, 'base64'));
else if (v?.uri) { const d = await fetch(v.uri, { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY } }); console.log('dl', d.status); if (d.ok) writeFileSync(out, Buffer.from(await d.arrayBuffer())); }
if (v) console.log('saved', out);
