# id_toolbox

Outillage de dev partagé par les projets TypeScript d'iDStudio : ressources FiveM, sites React (Vite, Next.js) et serveurs Bun (Elysia, NestJS). Une seule source pour la config Biome, les tsconfig et le build FiveM.

Ce n'est **pas** une ressource FiveM : pas de `fxmanifest.lua`, rien n'est chargé par FXServer ni par un navigateur. Le package ne sert qu'au moment du dev et du build.

## Quoi utiliser

| Projet                  | tsconfig                               | Biome           | Build         |
| ----------------------- | -------------------------------------- | --------------- | ------------- |
| Ressource FiveM         | `fivem`                                | `base`          | `fivem-build` |
| Serveur Bun / Elysia    | `bun`                                  | `base`          | Bun           |
| Serveur NestJS sous Bun | `nest`                                 | `base` + `nest` | Bun           |
| Bot Discord (id_node)   | `bot`                                  | `base`          | Bun           |
| Site Vite + React       | `web` (src) + `bun` (`vite.config.ts`) | `base`          | `vite build`  |
| Site Next.js            | `web`                                  | `base`          | `next build`  |

Les presets tsconfig, tous construits sur `tsconfig/base.json` :

| Preset  | Environnement                       | `lib`                     | En plus                       |
| ------- | ----------------------------------- | ------------------------- | ----------------------------- |
| `fivem` | FXServer, Node 22                   | ES2024                    |                               |
| `bun`   | Bun 1.4                             | ESNext                    |                               |
| `nest`  | Bun 1.4                             | ESNext                    | décorateurs legacy + metadata |
| `bot`   | Bun 1.4                             | ESNext                    | `nest` + options strictes     |
| `web`   | navigateurs (cible Vite par défaut) | ES2023, DOM, DOM.Iterable | `jsx: react-jsx`              |

`web` s'arrête à ES2023 car ni Vite ni Next ne polyfillent : `Object.groupBy` (ES2024) casserait sur Safari 16.

## Installation

```json
"devDependencies": {
	"@biomejs/biome": "^2.6.2",
	"@types/bun": "^1.4.3",
	"id_toolbox": "github:iDStudi0/id_toolbox#v1.0.0",
	"typescript": "^7.0.2"
}
```

`@biomejs/biome` (≥ 2.6) et `typescript` restent des dépendances de chaque projet. `@types/bun` aussi, sauf pour un site Next.js : c'est lui qui fournit `"bun"` dans `types` et `bun:test`.

Deux règles valent pour tous les projets :
- **tsconfig** : étendre par chemin, `./node_modules/id_toolbox/tsconfig/<preset>.json`, jamais par nom de package. Bun ignore sans erreur un `extends` comme `id_toolbox/tsconfig/…` et perdrait par exemple les décorateurs de `nest`.
- **`types` et `paths`** restent dans le projet : ils dépendent de ses paquets et de son arborescence.

`biome.json`, identique partout sauf NestJS :

```json
{
	"$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
	"extends": ["id_toolbox/configs/base"]
}
```

Scripts communs :

```json
"typecheck": "tsc --noEmit",
"check": "biome check --write .",
"check:ci": "biome ci ."
```

## Par type de projet

### Ressource FiveM

`tsconfig.json` :

```json
{
	"extends": "./node_modules/id_toolbox/tsconfig/fivem.json",
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

`fivem-build` bundle `src/index.ts` vers `dist/build.js` (CJS minifié, enveloppé dans une IIFE), depuis le dossier courant. `@citizenfx/server` est toujours externe. `--external a,b` en ajoute d'autres, par exemple `fivem-build --external bufferutil,utf-8-validate` pour `ws`.

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

`bot` ajoute à `nest` `exactOptionalPropertyTypes` (une propriété optionnelle n'accepte pas `undefined` explicite) et `noPropertyAccessFromIndexSignature` (`record["key"]` obligatoire pour une clé non déclarée).

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
		"tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
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
		"tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
		"types": ["bun"]
	},
	"include": ["vite.config.ts"]
}
```

Scripts : `tsc -b` à la place de `tsc --noEmit`, pour vérifier les deux contextes.

```json
"typecheck": "tsc -b",
"build": "tsc -b && vite build"
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

> **À vérifier :** `typescript@7` n'expose plus l'API JS que `next build` utilise pour son typecheck et la vérification du tsconfig. Si `next build` échoue avec TS 7, mets `"typescript": "^6"` dans le projet Next.

## Ce que la config impose

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

## Mettre à jour un projet

Changer le tag dans la devDependency (`#v1.0.0` → `#v1.1.0`), puis `bun install`, `bun run typecheck` et `bun run check`.

## Développer le toolbox

```sh
bun install
bun run typecheck
bun run check
```

Publier une version : mettre à jour `version` dans `package.json`, committer, puis pousser un tag `vX.Y.Z`.
- **patch** : correction sans effet sur les projets.
- **minor** : ajout qui ne casse rien (nouveau preset, nouvelle option de `fivem-build`).
- **major** : changement qui peut faire échouer le typecheck, le lint ou le build d'un projet existant (règle plus stricte, preset modifié).
