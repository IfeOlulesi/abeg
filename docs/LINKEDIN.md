# LinkedIn post — drafts

> Fill in `[repo link]` once the GitHub repo is live. Attach 2–3 visuals:
> `docs/images/storefront.png`, `docs/images/backstage-race.png`, and ideally a
> short screen recording of the "last unit" race. Posts with a native image/video
> reach further than posts with an external link, so consider putting the link in
> the first comment.

---

## Main draft

🍚 I built **Abeg** — an AI shop assistant that takes food orders by **voice or chat**, grounded in real inventory. And I open-sourced it.

But the fun part isn't the ordering. It's what happens when **two customers grab the last plate at the exact same moment.**

Most demos stop at "look, the AI works." Abeg keeps going and shows the bug that bites every real system: a **race condition**.

▶️ In *naive* mode, both orders succeed and stock drops to **−1**. Oversold. Visibly broken.
▶️ Flip one switch to *guarded* mode (a database row-lock inside a transaction) and one order wins, the other is politely refused, and stock never goes below zero.

Same app. One toggle. That contrast is the whole lesson.

Under the hood:
• React + Tailwind storefront & chat
• Python / FastAPI backend (live streaming + WebSockets)
• PostgreSQL with real transactions & row locks
• OpenRouter (DeepSeek) for the agent's tool-calling
• Deepgram for live voice-to-text

The assistant can only answer by **calling tools against the database** — it never invents a price or makes up stock. There's a "Backstage" panel that shows every tool call live, and a cached mode so dead venue wifi can't kill the demo.

Code + a beginner-friendly walkthrough 👉 [repo link]

If you teach, present, or just enjoy watching software break on purpose — take it for a spin. ⭐

\#AI #SoftwareEngineering #Databases #Python #React #OpenSource #LLM #Concurrency

---

## Short draft

What happens when two people order the last plate at the same instant? 🍽️

I built **Abeg**, an open-source AI ordering assistant (voice + chat), specifically to show it. One toggle flips between the *naive* version (both orders win, stock goes to −1) and the *guarded* version (row-locks; one wins, stock never negative).

React + FastAPI + PostgreSQL + OpenRouter + Deepgram. The AI only answers by querying the real database — no made-up prices.

Try it / read the walkthrough 👉 [repo link]

\#AI #Databases #OpenSource #Python #React #Concurrency
