# AI assistant: how we used it and how to use it

The team built Vital-X with help from **Claude** (Anthropic), used through **Claude Code**, an AI
coding assistant that runs in the terminal, the desktop app, the web or an IDE. This page explains
what the AI did, what stayed with the team, and how to work with it on this repository.

## AI use disclosure

- **23 of the 25 commits** in the history are co-authored by Claude (`Co-Authored-By: Claude …` in
  the commit message), so every AI-assisted change can be traced.
- **The AI helped with:** writing and refactoring code (simulator, models, React app, serverless
  function), translating the project to English, drafting documentation, checking data against
  the NASA figures, and running lint and builds before each commit.
- **The team decided:** the problem and the concept, the mission and context model, the screens
  and how they should feel for crew and ground, which NASA sources to trust, the demo and the
  pitch. The team reviewed and tested the changes and owns the result.
- **Not done by AI:** inventing data presented as real. All training data is simulated and
  labeled `SIMULATED`, and every calibration figure points to a NASA source
  ([`SOURCES.md`](SOURCES.md)).
- **Limits:** AI output can be wrong. Medical thresholds, NASA figures and citations were checked
  against the source documents, and the system is a prototype, not a medical device.

## Using Claude Code on this repository

1. Install Claude Code (see https://claude.com/claude-code) and open a terminal in the repository
   root.
2. Run `claude`. It reads [`CLAUDE.md`](../CLAUDE.md) at the root for project conventions.
3. Describe what you want in plain language. Claude reads the code, proposes or makes the change,
   runs commands (with your permission) and can commit for you.

**Useful commands inside Claude Code**

| Command | What it does |
|---|---|
| `/help` | Lists commands and shortcuts |
| `/init` | Creates or refreshes `CLAUDE.md` from the codebase |
| `/code-review` | Reviews the current changes for bugs |
| `/clear` | Starts a fresh conversation |
| `! <command>` | Runs a shell command yourself and shares its output with Claude |
| `Esc` | Stops the current action |

**Example requests**

| Goal | Ask |
|---|---|
| Understand the code | "Explain how the black box decides when to upload." |
| Change a threshold | "Raise the EVA suit CO₂ caution limit to 5,000 ppm and show where it is used." |
| Add a feature | "Add a Ground tab that lists every astronaut's 30-day radiation dose." |
| Fix a bug | "In the wrist view the Alerts screen stays after the reading is normal. Find the cause." |
| Data pipeline | "Regenerate the data with 60 astronauts and seed 7, validate it and summarise any `[FAIL]`." |
| Documentation | "Update docs/USER_GUIDE.md for the new tab." |
| Deployment | "Check why the last Vercel deployment failed." |

**Good practice**

- Give context: which screen, which environment, what you expected and what happened.
- Ask it to run `npm run lint` and `npm run build` (in `Frontend/`) after front-end changes, or the
  validator after changes to the generator.
- Review the diff before committing. Claude asks before pushing or deploying.
- Never paste secrets (for example the Cosmos DB key) into the chat. Set them in Vercel instead.

## Getting help on the other tools

| Tool | Where to look |
|---|---|
| Vital-X screens | [`USER_GUIDE.md`](USER_GUIDE.md) |
| Python scripts, npm scripts, API, deployment | [`TOOLS.md`](TOOLS.md) (the generator and validator also accept `--help`) |
| How the parts fit together | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Data and models | [`ML_PIPELINE.md`](ML_PIPELINE.md) |
| React, Vite, Tailwind, Dexie, Recharts | https://react.dev, https://vite.dev, https://tailwindcss.com, https://dexie.org, https://recharts.org |
| Vercel and Azure Cosmos DB | https://vercel.com/docs, https://learn.microsoft.com/azure/cosmos-db/ |
