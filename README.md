# Football coaching puzzle game

A story-led puzzle game teaching young footballers where to stand at restarts. See `CLAUDE.md` for how the project works and `docs/` for the research and coaching content.

## Try it on your computer

```
npm install
npm run dev
```

Open the address it prints. To test offline, run `npm run build` then `npm run preview`, open the game once, then switch the browser to offline.

## Publishing on GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes the game each time `main` changes.

1. On GitHub, open the repository's Settings, then Pages.
2. Under "Build and deployment", set Source to "GitHub Actions".
3. Merge the pull request into `main`. Watch the Actions tab until "Deploy to GitHub Pages" goes green.
4. The game is at https://richjannetts.github.io/football-coaching-game/

## Recording your own voice

Every spoken line is in `src/data/script.json`. Save a recording as `public/voices/rich/<id>.mp3` and add the id to the `recorded` list in `public/voices/packs.json`. Lines without a recording use the phone's own voice.

## Phone testing

See `docs/phone-test-checklist.md`.
