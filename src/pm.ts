import { $ } from "@goodbyenjn/utils/exec/safe";
import { Err, Ok, Result } from "@goodbyenjn/utils/result";
import { detect } from "package-manager-detector";

import type { Agent, DetectResult, ResolvedCommand } from "package-manager-detector";

export class PackageManager {
    private pm?: DetectResult;

    constructor(
        private dryRun?: boolean,
        private cwd?: string,
    ) {}

    async detect(): Promise<Result<DetectResult, Error>> {
        if (this.pm) return Ok(this.pm);

        const pm = await detect({ cwd: this.cwd });
        if (!pm) return Err(new Error("Failed to detect package manager"));

        this.pm = pm;

        return Ok(pm);
    }

    resolveInstallCommand(agent: Agent): Result<ResolvedCommand, Error> {
        switch (agent) {
            case "npm": {
                return Ok({ command: "npm", args: ["install"] });
            }
            case "pnpm": {
                return Ok({ command: "pnpm", args: ["install"] });
            }
            case "yarn":
            case "yarn@berry": {
                return Ok({ command: "yarn", args: ["install"] });
            }
            case "bun": {
                return Ok({ command: "bun", args: ["install"] });
            }
            default: {
                return Err(new Error(`Unsupported package manager: ${agent}`));
            }
        }
    }

    async getKeyValue(key: string) {
        return (await $`npm pkg --force get ${key}`).andThen(({ exitCode, stdout }) => {
            if (exitCode !== 0) {
                return Err(new Error("Failed to get value from package.json"));
            }

            return Ok(stdout.trim());
        });
    }

    async setKeyValue(pairs: string[]) {
        const args = pairs.join(" ");

        return (await $`npm pkg --force set ${args}`).andThen(({ exitCode }) => {
            if (exitCode !== 0) {
                return Err(new Error("Failed to set key-value pairs in package.json"));
            }

            return Ok();
        });
    }

    async isEsmProject() {
        return Result.gen(async function* () {
            const value = yield* (await this.getKeyValue("type")).context(
                "Failed to check if project is ESM",
            );
            const type = value.replace(/['"]/g, "");

            return type === "module";
        }, this);
    }

    async fetchPackageVersions(packages: string[]) {
        return Result.gen(async function* () {
            const meta = yield* await Result.try(async () => {
                const url = new URL("https://npm.antfu.dev");
                url.pathname = packages.join("+");

                const response = await fetch(url);
                const json = await response.json();

                return json as {
                    name: string;
                    version: string | null;
                    specifier: string;
                    publishedAt: string | null;
                    lastSynced: number;
                }[];
            }, Error);

            const versions: { name: string; version: string }[] = [];
            for (const { name, version } of meta) {
                if (!version) {
                    return Err(new Error(`Failed to fetch version for package: ${name}`));
                }

                versions.push({ name, version });
            }

            return versions;
        }, this);
    }

    async install() {
        return Result.gen(async function* () {
            const { agent } = yield* await this.detect();
            const { command, args } = yield* this.resolveInstallCommand(agent);
            if (this.dryRun) return { command, args, proc: null };

            const proc = $(command, args, {
                spawnOptions: { cwd: this.cwd, stdio: "inherit" },
            });

            return { command, args, proc };
        }, this);
    }

    async addPackages(versions: { name: string; version: string }[], dev?: boolean) {
        if (this.dryRun) return Ok();

        const kind = dev ? "devDependencies" : "dependencies";
        const pairs = versions.map(({ name, version }) => `${kind}['${name}']='^${version}'`);

        return (await this.setKeyValue(pairs)).context(`Failed to add packages as ${kind}`);
    }

    async addScripts(scripts: Record<string, string>) {
        if (this.dryRun) return Ok();

        const pairs = Object.entries(scripts).map(([k, v]) => `scripts['${k}']='${v}'`);

        return (await this.setKeyValue(pairs)).context("Failed to add npm scripts");
    }
}
