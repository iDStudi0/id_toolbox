# id_toolbox

Outillage de dev partagé par les projets TypeScript d'iDStudio : ressources FiveM, sites React (Vite, Next.js) et serveurs Bun (Elysia, NestJS). Une seule source pour la config Biome, les tsconfig, le build FiveM et les workflows CI.

Ce n'est **pas** une ressource FiveM : pas de `fxmanifest.lua`, rien n'est chargé par FXServer ni par un navigateur. Le package ne sert qu'au moment du dev et du build.

## Quoi utiliser

| Projet                  | tsconfig                               | Biome           | Build         |
| ----------------------- | -------------------------------------- | --------------- | ------------- |
| Ressource FiveM         | `fivem-server`, `fivem-client`         | `base`          | `fivem-build` |
| UI NUI FiveM (Vite)     | `fivem-nui` + `bun` (`vite.config.ts`) | `base`          | `vite build`  |
| Serveur Bun / Elysia    | `bun`                                  | `base`          | Bun           |
| Serveur NestJS sous Bun | `nest`                                 | `base` + `nest` | Bun           |
| Bot Discord (id_node)   | `bot`                                  | `base`          | Bun           |
| Site Vite + React       | `web` (src) + `bun` (`vite.config.ts`) | `base`          | `vite build`  |
| Site Next.js            | `web`                                  | `base`          | `next build`  |

## Installation

```json
"devDependencies": {
	"@biomejs/biome": "^2.6.3",
	"@types/bun": "^1.4.4",
	"id_toolbox": "github:iDStudi0/id_toolbox#v2.4.0",
	"typescript": "^7.0.2"
}
```

`@biomejs/biome` (≥ 2.6.3, comme la peerDependency) et `typescript` restent des dépendances de chaque projet. `@types/bun` aussi, sauf pour un site Next.js : c'est lui qui fournit `"bun"` dans `types` et `bun:test`.

`biome.json`, identique partout sauf NestJS :

```json
{
	"$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
	"extends": ["id_toolbox/configs/base"]
}
```

Scripts communs :

```json
"typecheck": "bun check",
"quality": "biome ci .",
"quality:fix": "biome check --write ."
```

`quality` vérifie sans rien écrire (lint, format et tri des imports, comme en CI), `quality:fix` corrige ce qui peut l'être. Les tests passent par `bun test`, sans script.

## Règles communes

- **tsconfig** : étendre par chemin, `./node_modules/id_toolbox/tsconfig/<preset>.json`, jamais par nom de package. Bun ignore sans erreur un `extends` comme `id_toolbox/tsconfig/…` et perdrait par exemple les décorateurs de `nest`. Au runtime, Bun ne suit pas non plus un `extends` enchaîné à l'intérieur de `node_modules` : un preset qui a besoin d'options au runtime (décorateurs) les déclare lui-même au lieu de les hériter.
- **`types` et `paths`** restent dans le projet : ils dépendent de ses paquets et de son arborescence.
- **Noms de scripts** : pas de script `check`, `fmt`, `test` ni `ci`. Un script `check` ou `fmt` remplace en silence la commande Bun du même nom (`bun check` lancerait Biome au lieu du typecheck), et `bun test` ou `bun ci` ignorent le leur. `build` reste, car Vite, Next et les plateformes de déploiement l'attendent, mais `bun build` lance le bundler de Bun : les scripts se lancent toujours avec `bun run <script>`.

## Par type de projet

### Ressource FiveM

En plus des dépendances communes : `@citizenfx/server` et/ou `@citizenfx/client`.

`tsconfig.json` :

```json
{
	"extends": "./node_modules/id_toolbox/tsconfig/fivem-server.json",
	"compilerOptions": {
		"types": ["node", "bun", "@citizenfx/server"],
		"paths": {
			"@/*": ["./src/*"]
		}
	},
	"include": ["src/**/*", "scripts/**/*", "tests/**/*"]
}
```

Scripts :

```json
"build:fast": "fivem-build",
"build": "bun run typecheck && bun run build:fast"
```

`fivem-build` bundle `src/index.ts` vers `dist/build.js` (CJS minifié, enveloppé dans une IIFE), depuis le dossier courant. Options :

- `--side server|client` (défaut `server`) : `server` cible Node, `client` cible le V8 nu du client FiveM (pas de `require` ni de built-ins Node). `@citizenfx/<side>` est toujours externe.
- `--entry` et `--outfile` changent l'entrée et la sortie, relatives au dossier courant.
- `--external a,b` ajoute des externes, par exemple `fivem-build --external bufferutil,utf-8-validate` pour `ws`.

Une ressource avec les deux côtés a un tsconfig par côté (les globales `@citizenfx/server` et `@citizenfx/client` se contredisent) et deux builds :

```json
"build:fast": "fivem-build --entry src/server/index.ts --outfile dist/server.js && fivem-build --side client --entry src/client/index.ts --outfile dist/client.js"
```

Le tsconfig client étend `fivem-client.json` avec `"types": ["@citizenfx/client"]`.

`fivem-server` suppose Node 22 : le `fxmanifest.lua` doit déclarer `node_version '22'`, sinon FXServer lance Node 16. `fivem-client` vise le V8 9.3 du client : API jusqu'à ES2022, syntaxe ES2021 (les blocs `static {}` de classe n'existent pas encore).

### UI NUI FiveM

Comme un site Vite + React, avec `fivem-nui.json` à la place de `web.json` dans `tsconfig.app.json`.

### Serveur Bun / Elysia

`tsconfig.json` :

```json
{
	"extends": "./node_modules/id_toolbox/tsconfig/bun.json",
	"compilerOptions": {
		"types": ["bun"],
		"paths": {
			"@/*": ["./src/*"]
		}
	},
	"include": ["src/**/*", "tests/**/*"]
}
```

### Serveur NestJS sous Bun

`tsconfig.json` : comme Elysia, avec `nest.json` à la place de `bun.json`.

`biome.json` :

```json
{
	"$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
	"extends": ["id_toolbox/configs/base", "id_toolbox/configs/nest"]
}
```

`configs/nest` coupe deux règles qui cassent ou gênent NestJS. `useImportType` transformerait les imports injectés en `import type` : la metadata disparaît et l'injection de dépendances casse. `noUnusedFunctionParameters` signale à tort les paramètres décorés (`@Inject() private readonly x`). TypeScript couvre déjà les deux cas, avec `verbatimModuleSyntax` et `noUnusedParameters`.

### Bot Discord (id_node)

`tsconfig.json` : comme Elysia, avec `bot.json` à la place de `bun.json`.

### Site Vite + React

Deux contextes : le code navigateur (`web`) et `vite.config.ts`, exécuté par Bun ou Node (`bun`).

`tsconfig.json` :

```json
{
	"files": [],
	"references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

`tsconfig.app.json` :

```json
{
	"extends": "./node_modules/id_toolbox/tsconfig/web.json",
	"compilerOptions": {
		"types": ["vite/client"],
		"paths": {
			"@/*": ["./src/*"]
		}
	},
	"include": ["src"]
}
```

`tsconfig.node.json` :

```json
{
	"extends": "./node_modules/id_toolbox/tsconfig/bun.json",
	"compilerOptions": {
		"types": ["bun"]
	},
	"include": ["vite.config.ts"]
}
```

Scripts : `bun check` voit que `tsconfig.json` n'a pas de fichiers et vérifie les projets référencés, comme `tsc -b`.

```json
"build": "bun run typecheck && vite build"
```

### Site Next.js

`tsconfig.json` :

```json
{
	"extends": "./node_modules/id_toolbox/tsconfig/web.json",
	"compilerOptions": {
		"plugins": [{ "name": "next" }],
		"paths": {
			"@/*": ["./src/*"]
		}
	},
	"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
	"exclude": ["node_modules"]
}
```

Au premier `next dev`, Next peut ajouter des options ou des entrées d'`include` dans ce fichier : c'est attendu, garde-les.

## Couverture des tests

`bun test --coverage` ne compte que les fichiers importés par un test : un fichier jamais importé n'apparaît pas et ne fait pas baisser le total. `coverageGuard` ajoute un test qui importe tout `src/**/*.ts` (hors `.d.ts` et `.test.ts`), à placer dans `tests/coverage-guard.test.ts` :

```ts
import { coverageGuard } from "id_toolbox/testing/coverage-guard";

coverageGuard([/^src\/index\.ts$/, /^src\/prisma\//]);
```

Les motifs en argument excluent les fichiers qu'on ne peut pas importer sans effet de bord (point d'entrée qui démarre le serveur, client Prisma généré). Avec un seuil dans `bunfig.toml` :

```toml
[test]
coverage = true
coverageSkipTestFiles = true
coverageReporter = ["text", "lcov"]
coveragePathIgnorePatterns = ["../**"]
coverageThreshold = { lines = 1.0, functions = 1.0 }
```

## Ce que la config impose

Les presets tsconfig, tous construits sur `tsconfig/base.json` :

| Preset         | Environnement                       | `lib`                     | En plus                       |
| -------------- | ----------------------------------- | ------------------------- | ----------------------------- |
| `fivem-server` | FXServer, `node_version '22'`       | ES2024                    |                               |
| `fivem-client` | client FiveM, V8 9.3 sans Node      | ES2022                    |                               |
| `fivem-nui`    | CEF de FiveM, Chromium 144          | ES2025, DOM, DOM.Iterable | `web`                         |
| `bun`          | Bun 1.4                             | ESNext                    |                               |
| `nest`         | Bun 1.4                             | ESNext                    | décorateurs legacy + metadata |
| `bot`          | Bun 1.4                             | ESNext                    | `nest` + options strictes     |
| `web`          | navigateurs (cible Vite par défaut) | ES2023, DOM, DOM.Iterable | `jsx: react-jsx`              |

`web` s'arrête à ES2023 car ni Vite ni Next ne polyfillent : `Object.groupBy` (ES2024) casserait sur Safari 16. `fivem-nui` n'a pas cette contrainte : le NUI ne tourne que dans le Chromium embarqué par FiveM (`vendor/cef/cef_build_name.txt` dans citizenfx/fivem), indépendant du V8 des scripts client.

`bot` reprend les décorateurs de `nest` et ajoute `exactOptionalPropertyTypes` (une propriété optionnelle n'accepte pas `undefined` explicite) et `noPropertyAccessFromIndexSignature` (`record["key"]` obligatoire pour une clé non déclarée).

TypeScript (`base.json`) :
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, code inatteignable en erreur.
- `noUncheckedIndexedAccess` : `arr[i]` et `record[key]` sont typés `T | undefined`.
- `noImplicitOverride` : le mot-clé `override` est obligatoire quand une méthode redéfinit celle d'un parent.
- `verbatimModuleSyntax` : un import utilisé seulement comme type s'écrit `import type`.
- `allowImportingTsExtensions` : les imports peuvent finir en `.ts`.
- `noEmit` : TypeScript ne fait que vérifier, ce sont Bun, Vite ou Next qui buildent.

Biome (`configs/base`) :
- Indentation en tabulations (largeur 4), lignes de 200 caractères, YAML en 2 espaces.
- Imports triés automatiquement.
- Syntaxe Tailwind (`@theme`, `@apply`…) acceptée dans le CSS.
- `.gitignore` respecté, `dist/` ignoré.
- Les règles React et Next s'activent toutes seules quand ces dépendances sont dans le `package.json`.

## CI

Workflows réutilisables et action, appelés avec le même tag que la devDependency :

- `checks.yml` : installe Bun (`.bun-version`) et les dépendances, puis lance les étapes activées. `quality`, `typecheck` et `test` (`bun test --pass-with-no-tests`) sont actives par défaut, `build` (`bun run build`) non. `test-reports: true` ajoute la couverture lcov et un rapport JUnit, publiés en artifact.
- `github-release.yml` : vérifie que le tag correspond à la version du `package.json` et crée la release GitHub avec des notes générées.
- `publish-package.yml` : vérifie le tag, build (`build: false` pour sauter) et publie sur GitHub Packages.
- `workflows-lint.yml` : actionlint et zizmor sur les workflows du projet. Il lit la config du projet : `.github/zizmor.yml` (zizmor exige des actions épinglées par SHA : tant que le projet appelle id_toolbox par tag, y autoriser `"iDStudi0/*": ref-pin` dans `rules.unpinned-uses.config.policies`) et, avec des runners self-hosted, `.github/actionlint.yaml` pour déclarer leurs labels. Si les workflows utilisent des actions de dépôts privés de l'org, les audits en ligne de zizmor ne peuvent pas les lire avec le `github.token` : passer `private-repositories` (liste séparée par des virgules) et les secrets `app-client-id` / `app-private-key` d'une GitHub App installée sur ces dépôts.
- `.github/actions/fivem-version-check` : vérifie que le tag, le `package.json` et le `fxmanifest.lua` d'une ressource déclarent la même version (`fxmanifest.lua` seul pour une ressource sans `package.json`).

Les `permissions` du job appelant plafonnent celles du workflow appelé : chaque exemple ci-dessous donne le minimum nécessaire.

### GitHub Packages

Les workflows s'authentifient avec le `GITHUB_TOKEN`, en ajoutant le token dans `~/.npmrc`. Le scope reste déclaré dans le `.npmrc` du projet :

```
@idstudi0:registry=https://npm.pkg.github.com
```

Chaque package privé `@idstudi0` doit donner l'accès en lecture aux repos qui l'installent (_Package settings → Manage Actions access_).

### Exemples

`.github/workflows/ci.yml` :

```yaml
name: CI

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  workflow_dispatch:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    if: ${{ !github.event.pull_request.draft }}
    uses: iDStudi0/id_toolbox/.github/workflows/checks.yml@v2.4.0
    permissions:
      contents: read
      packages: read
    with:
      build: true
```

Les PR en brouillon ne lancent pas la CI : elle part au passage en _Ready for review_.

`.github/workflows/workflows-lint.yml`, dans un workflow à part pour ne payer une minute que quand `.github/` change, plus un passage par semaine pour les nouvelles alertes de zizmor :

```yaml
name: Workflows lint

on:
  pull_request:
    branches: [main]
    paths:
      - ".github/**"
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:

concurrency:
  group: workflows-lint-${{ github.ref }}
  cancel-in-progress: true

jobs:
  workflows-lint:
    uses: iDStudi0/id_toolbox/.github/workflows/workflows-lint.yml@v2.4.0
    permissions:
      contents: read
```

Ne pas le rendre obligatoire dans la protection de branche : sans changement dans `.github/`, il ne se lance pas et la PR resterait en attente.

`.github/workflows/release.yml` :

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

concurrency:
  group: release
  cancel-in-progress: false

jobs:
  checks:
    uses: iDStudi0/id_toolbox/.github/workflows/checks.yml@v2.4.0
    permissions:
      contents: read
      packages: read

  release:
    needs: checks
    uses: iDStudi0/id_toolbox/.github/workflows/github-release.yml@v2.4.0
    permissions:
      contents: write
```

Une lib publiée sur GitHub Packages insère la publication entre les deux :

```yaml
jobs:
  checks:
    uses: iDStudi0/id_toolbox/.github/workflows/checks.yml@v2.4.0
    permissions:
      contents: read
      packages: read
    with:
      build: true

  publish:
    needs: checks
    uses: iDStudi0/id_toolbox/.github/workflows/publish-package.yml@v2.4.0
    permissions:
      contents: read
      packages: write

  release:
    needs: publish
    uses: iDStudi0/id_toolbox/.github/workflows/github-release.yml@v2.4.0
    permissions:
      contents: write
```

Une ressource FiveM vérifie sa version dans son propre job de release :

```yaml
- uses: actions/checkout@v7
  with:
    persist-credentials: false

- uses: iDStudi0/id_toolbox/.github/actions/fivem-version-check@v2.4.0
  with:
    tag: ${{ github.ref_name }}
```

## Mettre à jour un projet

Changer le tag dans la devDependency (`#v1.0.0` → `#v1.1.0`) et dans les `uses:` des workflows, puis `bun install`, `bun run typecheck` et `bun run quality:fix`.

## Développer le toolbox

```sh
bun install
bun run typecheck
bun run quality:fix
```

Publier une version : mettre à jour `version` dans `package.json`, committer, puis pousser un tag `vX.Y.Z`.
- **patch** : correction sans effet sur les projets.
- **minor** : ajout qui ne casse rien (nouveau preset, nouvelle option de `fivem-build`).
- **major** : changement qui peut faire échouer le typecheck, le lint ou le build d'un projet existant (règle plus stricte, preset modifié).
