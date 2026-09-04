# Persistance Airtable

Le tournoi (joueurs + matchs) est stocké dans une base Airtable. `localStorage`
ne sert plus que de cache : si l'API est injoignable, l'app affiche la dernière
copie connue en lecture seule au lieu d'un écran vide.

## ⚠️ Le token est public

L'app est un SPA statique (`nuxt generate` → GitHub Pages) : **il n'y a aucun
serveur**. Le PAT Airtable est donc embarqué dans le bundle JS et lisible par
n'importe qui ayant l'URL de l'app. C'est un choix assumé, pas un oubli.

Conséquences à accepter :

- N'importe qui avec l'URL peut lire **et écrire** la base.
- Le PAT du front doit être **data-only** et **mono-base**. Jamais de scope
  schéma, jamais une base qui contient autre chose que ce tournoi.
- En cas de fuite gênante : révoquer le PAT dans Airtable, en créer un autre,
  mettre à jour le secret GitHub, redéployer. Rien d'autre à faire.

Si un jour ça devient un problème, la sortie propre est de passer en
`nuxt build` avec un preset serveur (Vercel / Cloudflare) et de déplacer les
appels dans `server/api/*` : le token redevient privé, et le front n'a rien
d'autre à changer que l'URL des appels.

## Créer les deux tokens

Sur https://airtable.com/create/tokens :

| Token | Scopes | Accès | Où |
| --- | --- | --- | --- |
| **admin** | `schema.bases:read`, `schema.bases:write`, `data.records:read`, `data.records:write` | la base tournoi | `.env` local uniquement |
| **front** | `data.records:read`, `data.records:write` | la base tournoi | `.env` local + secret GitHub |

L'ID de base (`appXXXXXXXXXXXXXX`) se lit dans l'URL de la base, ou via
https://airtable.com/api.

## Configurer

Crée un `.env` à la racine (il est déjà dans `.gitignore`) :

```sh
# Front-end — EMBARQUÉ DANS LE BUNDLE, data-only + mono-base
NUXT_PUBLIC_AIRTABLE_PAT=patXXXXXXXXXXXXXX
NUXT_PUBLIC_AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
NUXT_PUBLIC_AIRTABLE_PLAYERS_TABLE=Players
NUXT_PUBLIC_AIRTABLE_MATCHES_TABLE=Matches

# scripts/airtable-setup.mjs uniquement — jamais bundlé
AIRTABLE_ADMIN_PAT=patYYYYYYYYYYYYYY
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# scripts/fetch-members.mjs uniquement
GITLAB_URL=
GITLAB_TOKEN=
```

## Initialiser la base

```sh
pnpm airtable:setup        # crée les tables Players / Matches
pnpm airtable:seed         # ... et importe .data/*.json (refuse si la table n'est pas vide)
```

`airtable:setup` est idempotent : relancé sur une base existante, il n'ajoute
que les colonnes manquantes.

## Déploiement

Dans **Settings → Secrets and variables → Actions** du repo, ajoute :

- `AIRTABLE_PAT` → le PAT front
- `AIRTABLE_BASE_ID` → l'ID de base

`.github/workflows/deploy.yml` les injecte au moment du `pnpm generate`.

## Schéma

Les colonnes sont volontairement **plates** : l'intérêt d'Airtable ici, c'est de
pouvoir corriger un roster ou un score à la main dans la grille. Les objets
imbriqués sont donc éclatés en colonnes scalaires, pas sérialisés en JSON.

`appId` est la clé métier (l'`id` numérique de l'app) et le champ primaire.

**Players** — `appId`, `pseudo`, `tagline`, `region`, `avatarSeed`,
`registeredAt`, `factoryUsername`, `factoryName`, `factoryAvatar`, `archived`,
`lolPlaying`, `lolRole`, `lolRank`, `lolMain`, `valPlaying`, `valRole`,
`valRank`, `valMain`

**Matches** — `appId`, `game`, `createdAt`, `batchId`, `outcome`, `benched`,
`teamAName`, `teamAPlayerIds`, `teamASlots`, `teamBName`, `teamBPlayerIds`,
`teamBSlots`, `powerA`, `powerB`

Les listes d'IDs (`benched`, `team*PlayerIds`) sont des chaînes `"3,8,2"`, pour
rester lisibles dans la grille.

## Comment la synchro marche

`composables/useRemoteStore.ts` :

1. Au boot (`plugins/stores.client.ts`), affichage immédiat depuis le cache
   `localStorage`, puis `GET` de la table qui devient la vérité.
2. Chaque mutation déclenche un flush **debouncé à 700 ms**, qui diffe l'état
   courant contre le dernier snapshot synchronisé et n'envoie que les
   `create` / `update` / `delete` réellement nécessaires, par lots de 10.
3. Toutes les requêtes passent par une file espacée de 220 ms — Airtable
   plafonne à **5 req/s par base**.
4. Si le `GET` initial échoue, le store reste en cache local **sans écrire**.
   C'est volontaire : pousser sans connaître l'état distant recréerait des
   lignes qu'on a juste échoué à lire.

Les 15 fonctions de mutation de `useStores.ts` sont inchangées — elles
remplacent le tableau entier, c'est le diff qui déduit ce qui a bougé.

## Limites connues

- **IDs concurrents.** `nextPlayerId()` fait `max(id) + 1` côté client. Deux
  inscriptions strictement simultanées depuis deux navigateurs peuvent produire
  le même `appId`. Acceptable pour un tournoi piloté par une personne ; à
  reprendre (UUID, ou `recordId` Airtable comme clé) si ça devient un vrai
  multi-utilisateur.
- **Pas de temps réel.** Les autres onglets voient les changements au
  rechargement, ou via `refreshTournament()`.
- **Dernier écrivain gagne.** Aucune détection de conflit.
