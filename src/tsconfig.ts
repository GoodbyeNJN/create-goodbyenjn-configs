import { $ } from "@goodbyenjn/utils/exec/safe";
import { isArray, isPlainObject, isString } from "@goodbyenjn/utils/fp";
import { VFile } from "@goodbyenjn/utils/fs/safe";
import { parse } from "@goodbyenjn/utils/json/safe";
import { Ok } from "@goodbyenjn/utils/result";

import { JSONC, mergeDeep } from "./utils";

import type { TsConfigJson } from "@goodbyenjn/utils/types";

const TSCONFIG_TEMPLATE = `{
    "extends": "@goodbyenjn/configs/tsconfigs/base",
    "compilerOptions": {
        "types": ["@goodbyenjn/utils/global-types"]
    },
    "include": ["./*", "src", "tests", "types"]
}
`;

const COMPILER_OPTIONS_CASE_INSENSITIVE_KEYS = [
    "module",
    "moduleResolution",
    "newLine",
    "target",
] as const;
const COMPILER_OPTIONS_CASE_INSENSITIVE_ARRAY_KEYS = ["lib"] as const;
const COMPILER_OPTIONS_ARRAY_KEYS = [
    "rootDirs",
    "typeRoots",
    "types",
    "moduleSuffixes",
    "customConditions",
] as const;

export const COMPILER_OPTIONS_SORTED_KEYS = [
    // Type Checking
    "allowUnreachableCode",
    "allowUnusedLabels",
    "alwaysStrict",
    "exactOptionalPropertyTypes",
    "noFallthroughCasesInSwitch",
    "noImplicitAny",
    "noImplicitOverride",
    "noImplicitReturns",
    "noImplicitThis",
    "noPropertyAccessFromIndexSignature",
    "noUncheckedIndexedAccess",
    "noUnusedLocals",
    "noUnusedParameters",
    "strict",
    "strictBindCallApply",
    "strictBuiltinIteratorReturn",
    "strictFunctionTypes",
    "strictNullChecks",
    "strictPropertyInitialization",
    "useUnknownInCatchVariables",

    // Modules
    "allowArbitraryExtensions",
    "allowImportingTsExtensions",
    "allowUmdGlobalAccess",
    "baseUrl",
    "customConditions",
    "module",
    "moduleResolution",
    "moduleSuffixes",
    "noResolve",
    "noUncheckedSideEffectImports",
    "paths",
    "resolveJsonModule",
    "resolvePackageJsonExports",
    "resolvePackageJsonImports",
    "rewriteRelativeImportExtensions",
    "rootDir",
    "rootDirs",
    "typeRoots",
    "types",

    // Emit
    "declaration",
    "declarationDir",
    "declarationMap",
    "downlevelIteration",
    "emitBOM",
    "emitDeclarationOnly",
    "importHelpers",
    "inlineSourceMap",
    "inlineSources",
    "mapRoot",
    "newLine",
    "noEmit",
    "noEmitHelpers",
    "noEmitOnError",
    "outDir",
    "outFile",
    "preserveConstEnums",
    "removeComments",
    "sourceMap",
    "sourceRoot",
    "stripInternal",

    // JavaScript Support
    "allowJs",
    "checkJs",
    "maxNodeModuleJsDepth",

    // Editor Support
    "disableSizeLimit",
    "plugins",

    // Interop Constraints
    "allowSyntheticDefaultImports",
    "erasableSyntaxOnly",
    "esModuleInterop",
    "forceConsistentCasingInFileNames",
    "isolatedDeclarations",
    "isolatedModules",
    "preserveSymlinks",
    "verbatimModuleSyntax",

    // Backwards Compatibility
    "charset",
    "importsNotUsedAsValues",
    "keyofStringsOnly",
    "noImplicitUseStrict",
    "noStrictGenericChecks",
    "out",
    "preserveValueImports",
    "suppressExcessPropertyErrors",
    "suppressImplicitAnyIndexErrors",

    // Language and Environment
    "emitDecoratorMetadata",
    "experimentalDecorators",
    "jsx",
    "jsxFactory",
    "jsxFragmentFactory",
    "jsxImportSource",
    "lib",
    "libReplacement",
    "moduleDetection",
    "noLib",
    "reactNamespace",
    "target",
    "useDefineForClassFields",

    // Compiler Diagnostics
    "diagnostics",
    "explainFiles",
    "extendedDiagnostics",
    "generateCpuProfile",
    "generateTrace",
    "listEmittedFiles",
    "listFiles",
    "noCheck",
    "traceResolution",

    // Projects
    "composite",
    "disableReferencedProjectLoad",
    "disableSolutionSearching",
    "disableSourceOfProjectReferenceRedirect",
    "incremental",
    "tsBuildInfoFile",

    // Output Formatting
    "noErrorTruncation",
    "preserveWatchOutput",
    "pretty",

    // Completeness
    "skipDefaultLibCheck",
    "skipLibCheck",

    // Command Line

    // Watch Options
    "assumeChangesOnlyAffectDirectDependencies",
] as const;
const WATCH_OPTIONS_SORTED_KEYS = [
    "watchFile",
    "watchDirectory",
    "fallbackPolling",
    "synchronousWatchDirectory",
    "excludeDirectories",
    "excludeFiles",
] as const;
const TYPE_ACQUISITION_SORTED_KEYS = [
    "enable",
    "include",
    "exclude",
    "disableFilenameBasedTypeAcquisition",
] as const;

export class TsConfigFile {
    private vfile: VFile<TsConfigJson>;

    constructor(
        private dryRun?: boolean,
        private cwd?: string,
    ) {
        this.vfile = new VFile<TsConfigJson>("tsconfig.json", cwd).transformer(JSONC);
    }

    sortConfig(json: TsConfigJson) {
        const sorted: TsConfigJson = {};

        if (json.extends) {
            sorted.extends = json.extends;
        }
        if (json.references) {
            sorted.references = json.references;
        }
        if (json.compilerOptions) {
            sorted.compilerOptions ??= {};

            for (const key of COMPILER_OPTIONS_SORTED_KEYS) {
                if (Object.hasOwn(json.compilerOptions, key)) {
                    sorted.compilerOptions[key as keyof TsConfigJson.CompilerOptions] = json
                        .compilerOptions[key] as any;
                }
            }
        }
        if (json.watchOptions) {
            sorted.watchOptions ??= {};

            for (const key of WATCH_OPTIONS_SORTED_KEYS) {
                if (Object.hasOwn(json.watchOptions, key)) {
                    sorted.watchOptions ??= {};
                    sorted.watchOptions[key as keyof TsConfigJson.WatchOptions] = json.watchOptions[
                        key
                    ] as any;
                }
            }
        }
        if (json.typeAcquisition) {
            sorted.typeAcquisition ??= {};

            for (const key of TYPE_ACQUISITION_SORTED_KEYS) {
                if (Object.hasOwn(json.typeAcquisition, key)) {
                    sorted.typeAcquisition[key as keyof TsConfigJson.TypeAcquisition] = json
                        .typeAcquisition[key] as any;
                }
            }
        }
        if (json.files) {
            sorted.files = json.files;
        }
        if (json.include) {
            sorted.include = json.include;
        }
        if (json.exclude) {
            sorted.exclude = json.exclude;
        }

        return sorted;
    }

    async resolveConfig() {
        const template = JSON.parse(TSCONFIG_TEMPLATE) as TsConfigJson;

        const [readOk, _, old] = (await this.read()).iter();
        if (!readOk) return { old: null, template, resolved: null };

        const temp = new VFile<TsConfigJson>("tsconfig.temp.json", this.cwd).transformer("json");
        const [writeOk] = (await temp.raw(TSCONFIG_TEMPLATE).write()).iter();
        if (!writeOk) return { old, template, resolved: null };

        const withCleanup = async <T>(value: T) => temp.rm().then(() => value);

        const [tscOk, __, output] = (await $`tsc -p ${temp.pathname()} --showConfig`).iter();
        if (!tscOk) return withCleanup({ old, template, resolved: null });

        const stdout = output.stdout.trim();
        const [parseOk, ___, parsedJson] = parse<TsConfigJson>(stdout).iter();
        if (!parseOk) return withCleanup({ old, template, resolved: null });

        return withCleanup({ old, template, resolved: parsedJson });
    }

    compareOldAndResolved(old: TsConfigJson, resolved: TsConfigJson) {
        const diff: TsConfigJson = {};

        if (isPlainObject(old.compilerOptions)) {
            diff.compilerOptions ??= {};
            const resolvedCompilerOptions = resolved.compilerOptions ?? {};

            for (const [k, v] of Object.entries(old.compilerOptions)) {
                if (COMPILER_OPTIONS_CASE_INSENSITIVE_KEYS.includes(k)) {
                    if (!isString(v)) continue;

                    type Key = (typeof COMPILER_OPTIONS_CASE_INSENSITIVE_KEYS)[number];

                    const resolvedValue = resolvedCompilerOptions[k as Key] ?? "";
                    if (v.toLowerCase() !== resolvedValue.toLowerCase()) {
                        diff.compilerOptions[k as Key] = v as any;
                    }
                } else if (COMPILER_OPTIONS_CASE_INSENSITIVE_ARRAY_KEYS.includes(k)) {
                    if (!isArray(v)) continue;

                    type Key = (typeof COMPILER_OPTIONS_CASE_INSENSITIVE_ARRAY_KEYS)[number];

                    const oldValue = v.filter(isString);
                    const resolvedValue = new Set(
                        resolvedCompilerOptions[k as Key]?.map(v => v.toLowerCase()) ?? [],
                    );

                    for (const item of oldValue) {
                        if (!resolvedValue.has(item.toLowerCase())) {
                            diff.compilerOptions[k as Key] ??= [];
                            diff.compilerOptions[k as Key]!.push(item as any);
                        }
                    }
                } else if (COMPILER_OPTIONS_ARRAY_KEYS.includes(k)) {
                    if (!isArray(v)) continue;

                    type Key = (typeof COMPILER_OPTIONS_ARRAY_KEYS)[number];

                    const oldValue = new Set(v.filter(isString));
                    const resolvedValue = new Set(resolvedCompilerOptions[k as Key] ?? []);
                    const difference = oldValue.difference(resolvedValue);
                    if (difference.size > 0) {
                        diff.compilerOptions[k as Key] ??= [];
                        diff.compilerOptions[k as Key]!.push(...Array.from(difference));
                    }
                } else if (k === "paths") {
                    if (!isPlainObject(v)) continue;

                    const resolvedPaths = resolvedCompilerOptions.paths ?? {};

                    for (const [pk, pv] of Object.entries(
                        v as TsConfigJson.CompilerOptions["paths"],
                    )) {
                        if (!isArray(pv)) continue;

                        const oldPath = new Set(pv.filter(isString));
                        const resolvedPath = new Set(resolvedPaths[pk] ?? []);
                        const difference = oldPath.difference(resolvedPath);
                        if (difference.size > 0) {
                            diff.compilerOptions.paths ??= {};
                            diff.compilerOptions.paths[pk] = Array.from(difference);
                        }
                    }
                } else if (k === "plugins") {
                    if (!isArray(v)) continue;

                    const oldPlugins = new Set(
                        (v as TsConfigJson.CompilerOptions["plugins"])!
                            .filter(isPlainObject)
                            .map(plugin => plugin.name)
                            .filter(isString),
                    );
                    const resolvedPlugins = new Set(
                        resolvedCompilerOptions.plugins?.map(plugin => plugin.name) ?? [],
                    );
                    const difference = oldPlugins.difference(resolvedPlugins);
                    if (difference.size > 0) {
                        diff.compilerOptions.plugins ??= [];
                        diff.compilerOptions.plugins.push(
                            ...Array.from(difference).map(name => ({ name })),
                        );
                    }
                } else {
                    diff.compilerOptions[k] = v as any;
                }
            }
        }

        if (isArray(old.include)) {
            const oldIncludes = new Set(old.include.filter(isString));
            const resolvedIncludes = new Set(resolved.include ?? []);
            const difference = oldIncludes.difference(resolvedIncludes);
            if (difference.size > 0) {
                diff.include ??= [];
                diff.include.push(...Array.from(difference));
            }
        }

        for (const [k, v] of Object.entries(old)) {
            if (["compilerOptions", "include"].includes(k)) {
                continue;
            }

            diff[k] = v as any;
        }

        return diff;
    }

    async read() {
        return this.vfile.value().orElse(async () => this.vfile.read());
    }

    async *write() {
        const { old, template, resolved } = await this.resolveConfig();

        let json: TsConfigJson;
        if (old) {
            const diff = this.compareOldAndResolved(old, resolved ?? template);
            json = mergeDeep(diff, template);
        } else {
            json = template;
        }
        const content = JSON.stringify(this.sortConfig(json), null, 4);

        yield {
            filename: this.vfile.pathname.relative(),
            result: this.dryRun ? Ok() : await this.vfile.raw(content).write(),
        };
    }
}
