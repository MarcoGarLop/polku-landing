# Polku · landing

**Same cancer. Same chance?** A cinematic, scroll-driven story about [Polku](https://github.com/MarcoGarLop/polku), an AI-powered simulator of the lung cancer pathway in every wellbeing county of Finland. It works as a landing page and as a slide deck.

Team **FdiProtocol** · Junction 2026 · AstraZeneca challenge "Equal Care Across Finland" · Built with Gemini.

## Run it
```bash
npm start            # → http://localhost:4180
```
You can also open `index.html` straight from disk. Everything is local: no network, no external fonts or libraries.

## Present it
| Key | Action |
|---|---|
| → ↓ Space PageDown (presenter clicker) | next step |
| ← ↑ PageUp | previous step |
| Wheel / trackpad / swipe | scroll freely; it snaps to the nearest step |
| N / B | next / previous scene |
| F | fullscreen |
| `#5` in the URL | jump to scene 5 |

The whole page is driven by one virtual scroll position, moved by a critically damped spring. Every scene has its own steps: numbers count, bars fill and text appears as you move.

## 11 scenes
1. **Polku**: Same cancer. Same chance?
2. **Two patients**: Patient A, near Oulu, 94 days; Patient B, rural Lapland, 225 days (+131).
3. **The Nordics**: Finland 154 · Sweden 107 · Denmark 67 days.
4. **Every county**: real map of the 22 wellbeing counties, 135–176 days.
5. **Where**: 64% of Patient B's extra days are lost before a specialist.
6. **Why**: distance alone adds 26 days.
7. **How Polku works**: the patient, actions in the region, your own idea, learn from the Nordics.
8. **The AI reasons, it never invents a number**: reads, estimates, simulates, cites.
9. **Result**: 225 → 187 → 178 → 169 days.
10. **Data and transparency**: sources, public aggregated data, not a medical device.
11. **Same cancer. Same chance.**

## Where everything comes from
- **Figures**: `data/numbers.js`, frozen from Polku's simulation engine. The remaining figures match the live app and the demo video. Sources are on scene 10. None of them come from the AI.
- **Geography**: `data/geo.js`, the real wellbeing county boundaries (Statistics Finland 2026) and lakes (Natural Earth).
- **Scenes**: generated with Gemini. They are atmosphere only and are labelled on screen.
  - Each still was made with Nano Banana Pro (`gemini-3-pro-image`, `tools/generate-image.mjs`).
  - Each still was then animated with Gemini Omni (`gemini-omni-1.2-flash`, Interactions API, `tools/animate-omni.mjs`).
  - The clips are 10 s at 720p, turned into silent forward-and-back loops with ffmpeg.
  - Places: Lapland, Oulu, the Kvarken archipelago, a village health centre, a road through Lapland, the northern lights and a sunrise over a fell.
- **App screenshots**: taken from Polku's demo recording.

To regenerate a scene:
```bash
npm install
GEMINI_API_KEY=... node tools/generate-image.mjs gemini-3-pro-image media/new.png "prompt…"
GEMINI_API_KEY=... node tools/animate-omni.mjs gemini-omni-1.2-flash media/new.png media/new-raw.mp4 "motion prompt…"
```
Never commit the API key.

Polku is a decision-support tool for health care planners. It is not a medical device.
