// Nano Banana Pro (gemini-3-pro-image) text → 16:9 2K image.
// usage: GEMINI_API_KEY=… node tools/generate-image.mjs gemini-3-pro-image <out.png> <prompt…>
import { writeFileSync } from 'node:fs';
const KEY = process.env.GEMINI_API_KEY;
const [model, out, ...p] = process.argv.slice(2);
const prompt = p.join(' ');
const t0 = Date.now();
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: 'POST', headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9', imageSize: '2K' } } }),
});
const j = await r.json();
if (!r.ok) { console.log(model, r.status, JSON.stringify(j).slice(0, 400)); process.exit(1); }
const part = j.candidates?.[0]?.content?.parts?.find(x => x.inlineData);
if (!part) { console.log('no image', JSON.stringify(j).slice(0, 400)); process.exit(1); }
writeFileSync(out, Buffer.from(part.inlineData.data, 'base64'));
console.log(model, '✓', out, ((Date.now() - t0) / 1000).toFixed(1) + 's', part.inlineData.mimeType, JSON.stringify(j.usageMetadata));
