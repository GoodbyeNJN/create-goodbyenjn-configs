import { VFile } from "@goodbyenjn/utils/fs/safe";
import { Ok, Result } from "@goodbyenjn/utils/result";

import { JSONC, mergeDeep } from "./utils";

import type { JsonObject } from "@goodbyenjn/utils/types";

const EXTENSIONS_TEMPLATE = `{
    "recommendations": ["oxc.oxc-vscode"]
}
`;
const SETTINGS_TEMPLATE = `{
    "oxc.enable": true,
    "prettier.enable": false,
    "eslint.enable": false,
    "editor.codeActionsOnSave": {
        "source.fixAll.oxc": "explicit"
    },
    "[yaml][yml][dockercompose][github-actions-workflow]": {
        "editor.defaultFormatter": "oxc.oxc-vscode"
    },
    "[javascript][javascriptreact][typescript][typescriptreact][vue][json][jsonc][html][css][scss][sass][less]": {
        "editor.defaultFormatter": "oxc.oxc-vscode"
    }
}
`;

export class VSCodeConfigFile {
    private extensions: VFile<JsonObject>;
    private settings: VFile<JsonObject>;

    constructor(
        private dryRun?: boolean,
        private cwd?: string,
    ) {
        this.extensions = new VFile<JsonObject>(".vscode/extensions.json", cwd).transformer(JSONC);
        this.settings = new VFile<JsonObject>(".vscode/settings.json", cwd).transformer(JSONC);
    }

    async resolveConfig() {
        const extensions: JsonObject = JSON.parse(EXTENSIONS_TEMPLATE);
        const settings: JsonObject = JSON.parse(SETTINGS_TEMPLATE);

        const [readOk, _, old] = (await this.read()).iter();
        if (!readOk) return { old: null, resolved: { extensions, settings } };

        return { old, resolved: { extensions, settings } };
    }

    async read() {
        return Result.all(
            await Promise.all([
                this.extensions.value().orElse(async () => this.extensions.read()),
                this.settings.value().orElse(async () => this.settings.read()),
            ]),
        ).map(([extensions, settings]) => ({ extensions, settings }));
    }

    async *write() {
        const { old, resolved } = await this.resolveConfig();

        let extensions: JsonObject;
        let settings: JsonObject;
        if (old) {
            extensions = mergeDeep(old.extensions, resolved.extensions);
            settings = mergeDeep(old.settings, resolved.settings);
        } else {
            extensions = resolved.extensions;
            settings = resolved.settings;
        }

        yield {
            filename: this.extensions.pathname.relative(),
            result: this.dryRun
                ? Ok()
                : await this.extensions.raw(JSON.stringify(extensions, null, 4)).write(),
        };
        yield {
            filename: this.settings.pathname.relative(),
            result: this.dryRun
                ? Ok()
                : await this.settings.raw(JSON.stringify(settings, null, 4)).write(),
        };
    }
}
