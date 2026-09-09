# create-goodbyenjn-configs

A small CLI tool for bootstrapping a JavaScript or TypeScript project with a modern OXC-based linting and formatting setup.

It detects the current package manager, installs the required dependencies, adds the recommended npm scripts, and writes configuration files for TypeScript, `oxlint`, `oxfmt`, and VS Code.

## What it configures

The tool normally creates or updates the following:

- `package.json`
    - adds `@goodbyenjn/configs`
    - adds `oxlint`
    - adds `oxfmt`
    - adds `oxlint-tsgolint`
    - adds `typescript`
    - adds standard scripts for linting and formatting
- `tsconfig.json`
    - extends `@goodbyenjn/configs/tsconfigs/base`
    - includes `@goodbyenjn/utils/global-types`
- `oxlint.config.ts` or `oxlint.config.mts`
- `oxfmt.config.ts` or `oxfmt.config.mts`
- `.vscode/extensions.json`
- `.vscode/settings.json`

It also removes older config formats such as `.oxlintrc.json`, `.oxlintrc.jsonc` when they are no longer needed.

## Installation

Because this package exposes a binary, you can run it with the package manager of your choice:

```bash
npx create-goodbyenjn-configs
```

Or install it globally:

```bash
npm install -g create-goodbyenjn-configs
create-goodbyenjn-configs
```

## Usage

Run the CLI in the target directory by using the `--cwd` option:

```bash
npx create-goodbyenjn-configs --cwd /path/to/project
```

Preview changes without writing anything:

```bash
npx create-goodbyenjn-configs --dry-run
```

## Requirements

- Node.js `^22.2.0 || ^24.0.0 || >=26.0.0`
- A project directory with a `package.json` file
- Git repository state should be clean unless using `--dry-run`

## License

MIT
