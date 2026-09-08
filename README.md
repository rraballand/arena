# Factory Arena

Tournoi LoL / Valorant de l'InVivo Digital Factory. Nuxt 3 en SPA statique,
déployé sur GitHub Pages, données dans Airtable.

→ **https://rraballand.github.io/arena/**

## Démarrer

```sh
pnpm install
pnpm dev
```

Sans `.env`, l'app tourne en **mode local** : tout reste dans `localStorage` et
rien ne part vers Airtable. C'est suffisant pour développer l'interface. Pour
brancher la persistance, voir [AIRTABLE.md](./AIRTABLE.md).

## Commandes

| | |
| --- | --- |
| `pnpm dev` | serveur de développement |
| `pnpm generate` | build statique dans `.output/public` |
| `pnpm typecheck` | `vue-tsc` sur tout le projet |
| `pnpm test` | suite Playwright |
| `pnpm test:ui` | la même, en mode interactif |
| `pnpm members:sync` | réimporte l'annuaire GitLab et localise les avatars |
| `pnpm airtable:setup` | crée les tables Airtable manquantes |

## Tests

Playwright, **volontairement sans identifiants Airtable**. Sans PAT les stores
retombent sur `localStorage`, ce qui rend chaque exécution déterministe, hors
ligne, et incapable d'écrire dans une vraie base.

Les tests sèment leur état via `localStorage` avant le premier script de la page
(`tests/helpers.ts`), et bloquent les ressources tierces — vidéos de fond Riot,
emblèmes de rang, polices Google. Ce n'est pas une optimisation : `page.goto`
attend l'événement `load`, et un MP4 de 50 Mo servi par un CDN en fait un tirage
au sort.

Deux projets Playwright :

- **`unit`** — `tests/mappers.spec.ts`, round-trip pur des mappers Airtable, sans
  navigateur ni serveur. La propriété testée est la **stabilité** : `useRemoteStore`
  décide quoi écrire en comparant `JSON.stringify(toFields(item))` au dernier
  instantané synchronisé. Si un aller-retour n'est pas un point fixe, l'app
  réécrit toute la base à chaque chargement.
- **`chromium`** — le reste, contre un vrai serveur de dev.

## Structure

| | |
| --- | --- |
| `composables/useStores.ts` | état du tournoi et toutes les mutations |
| `composables/useRemoteStore.ts` | synchro Airtable, cache local, flush debouncé |
| `composables/airtableMappers.ts` | domaine ↔ colonnes Airtable, **source unique** |
| `pages/admin.vue` | gestion du roster |
| `scripts/` | annuaire GitLab, avatars, initialisation Airtable |
