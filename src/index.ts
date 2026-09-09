import process from "node:process";

import { $ } from "@goodbyenjn/utils/exec/safe";
import { pipe } from "@goodbyenjn/utils/fp";
import { Err, Result, ResultError } from "@goodbyenjn/utils/result";

import { OxfmtConfigFile, OxlintConfigFile } from "./oxc";
import { PackageManager } from "./pm";
import { TsConfigFile } from "./tsconfig";
import { styleText as s } from "./utils";
import { VSCodeConfigFile } from "./vscode";

const dryRun = process.argv.includes("--dry-run");
const cwd = process.argv.includes("--cwd")
    ? process.argv[process.argv.indexOf("--cwd") + 1] || process.cwd()
    : process.cwd();

const PACKAGES = ["@goodbyenjn/configs", "oxlint", "oxfmt", "oxlint-tsgolint", "typescript"];
const SCRIPTS = {
    check: "tsc && oxlint && oxfmt --check",
    "check:type": "tsc",
    lint: "oxlint",
    "lint:fix": "oxlint --fix",
    format: "oxfmt --check",
    "format:write": "oxfmt",
};

const write = (text: string) => {
    process.stdout.write(text);
};
const print = (text: string) => {
    write(text);
    write("\n");
};

const INDENT = "    ";
const COLON = s.dim(":");
const SEPARATOR_SHORT = s.dim("-".repeat(20));
const SEPARATOR_LONG = s.dim("-".repeat(40));
const DRY_RUN = dryRun ? s.dim("[DRY_RUN] ") : "";
const DONE = `  ${s.green("DONE")}`;
const FAILED = `  ${s.red("FAILED")}`;

const indent = (text: string) => INDENT + text;
const colon = (args: [key: string, value: string]) =>
    `${s.cyan(args[0])}${COLON} ${s.blue(args[1])}`;
const dryrun = (text: string) => DRY_RUN + text;
const done = () => print(DONE);
const failed = () => print(FAILED);

const result = await Result.gen(async function* () {
    const modifiedFiles: string[] = [];

    const pm = new PackageManager(dryRun, cwd);

    let isEsmProject: boolean;
    {
        write("Checking if repository is clean...");
        if (!dryRun) {
            const { exitCode } = yield* await $`git diff --quiet HEAD`;
            if (exitCode !== 0) {
                yield* Err(
                    new Error(
                        "Repository is not clean, please commit or stash your changes before proceeding.",
                    ),
                );
            }
        }
        done();

        write("Resolving project type...");
        isEsmProject = yield* await pm.isEsmProject();
        done();
        print(pipe(["type", isEsmProject ? "ES Module" : "CommonJS"], colon, indent));
    }

    print("");

    {
        write("Fetching latest package versions...");
        const versions = yield* await pm.fetchPackageVersions(PACKAGES);
        done();
        for (const { name, version } of versions) {
            print(pipe([name, version], colon, indent));
        }

        print("");

        print("Installing packages...");
        yield* await pm.addPackages(versions, true);
        const { command, args, proc } = (yield* await pm.install()) || {};

        print(SEPARATOR_SHORT);
        if (proc) {
            yield* await proc;
        } else {
            write(pipe(s.cyan(`${command} ${args.join(" ")}`), dryrun, indent));
            done();
        }
        print(SEPARATOR_SHORT);
    }

    print("");

    {
        print("Writing npm scripts...");
        yield* await pm.addScripts(SCRIPTS);
        for (const [name, command] of Object.entries(SCRIPTS)) {
            write(pipe([name, command], colon, dryrun, indent));
            done();
        }
    }

    print("");

    {
        const oxlintConfigFile = new OxlintConfigFile(isEsmProject, dryRun, cwd);

        print("Writing oxlint configuration file...");
        for await (const { filename, result } of oxlintConfigFile.write()) {
            modifiedFiles.push(filename);

            write(pipe(s.cyan(filename), dryrun, indent));
            yield* result;
            done();
        }

        print("Deleting other oxlint configuration files...");
        for await (const { filename, result } of oxlintConfigFile.deleteOthers()) {
            write(pipe(s.cyan(filename), dryrun, indent));
            yield* result;
            done();
        }
    }

    print("");

    {
        const oxfmtConfigFile = new OxfmtConfigFile(isEsmProject, dryRun, cwd);

        print("Writing oxfmt configuration file...");
        for await (const { filename, result } of oxfmtConfigFile.write()) {
            modifiedFiles.push(filename);

            write(pipe(s.cyan(filename), dryrun, indent));
            yield* result;
            done();
        }

        print("Deleting other oxfmt configuration files...");
        for await (const { filename, result } of oxfmtConfigFile.deleteOthers()) {
            write(pipe(s.cyan(filename), dryrun, indent));
            yield* result;
            done();
        }
    }

    print("");

    {
        const tsConfigFile = new TsConfigFile(dryRun, cwd);

        print("Writing tsconfig.json...");
        for await (const { filename, result } of tsConfigFile.write()) {
            modifiedFiles.push(filename);

            write(pipe(s.cyan(filename), dryrun, indent));
            yield* result;
            done();
        }
    }

    print("");

    {
        const vscodeConfigFile = new VSCodeConfigFile(dryRun, cwd);

        print("Writing VSCode configuration files...");
        for await (const { filename, result } of vscodeConfigFile.write()) {
            modifiedFiles.push(filename);

            write(pipe(s.cyan(filename), dryrun, indent));
            yield* result;
            done();
        }
    }

    print("");

    {
        print("Formatting files...");
        for (const filename of modifiedFiles) {
            write(pipe(s.cyan(filename), dryrun, indent));
            yield* await $`oxfmt ${filename}`;
            done();
        }
    }
});

if (result.isErr()) {
    failed();

    print("");
    print(SEPARATOR_LONG);
    print(s.red("Initialization failed"));

    console.log();
    console.log(ResultError.fmt(result));

    process.exit(1);
} else {
    print("");
    print(SEPARATOR_LONG);
    print(s.green("Initialization complete"));

    process.exit(0);
}
