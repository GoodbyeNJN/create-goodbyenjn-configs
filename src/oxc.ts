import { template } from "@goodbyenjn/utils";
import { VFile } from "@goodbyenjn/utils/fs/safe";
import { Ok } from "@goodbyenjn/utils/result";

import { JSONC } from "./utils";

import type { OxfmtConfig } from "oxfmt";
import type { OxlintConfig } from "oxlint";

const CONFIG_TEMPLATE = `import { withConfig } from "@goodbyenjn/configs/{name}";
{additional}
export default withConfig({parameters});
`;

class OxcConfigFile<Config> {
    protected newConfigFile: VFile;
    protected jsonConfigFile: VFile<Config>;
    protected jsoncConfigFile: VFile<Config>;
    protected mtsConfigFile: VFile;
    protected tsConfigFile: VFile;
    protected shouldDeletedConfigFiles: VFile<any>[];

    constructor(
        private name: "oxlint" | "oxfmt",
        isEsmProject?: boolean,
        private dryRun?: boolean,
        cwd?: string,
    ) {
        this.newConfigFile = new VFile(`${name}.config.${isEsmProject ? "ts" : "mts"}`, cwd);

        this.jsonConfigFile = new VFile<Config>(`${name}rc.json`, cwd).transformer("json");
        this.jsoncConfigFile = new VFile<Config>(`${name}rc.jsonc`, cwd).transformer(JSONC);
        this.mtsConfigFile = new VFile(`${name}.config.mts`, cwd);
        this.tsConfigFile = new VFile(`${name}.config.ts`, cwd);

        this.shouldDeletedConfigFiles = [
            this.jsonConfigFile,
            this.jsoncConfigFile,
            isEsmProject ? this.mtsConfigFile : this.tsConfigFile,
        ];
    }

    async resolveOldConfig() {
        const json = await this.jsonConfigFile.read();
        if (json.isOk()) {
            return `const OLD_CONFIG = ${JSON.stringify(json.unwrap(), null, 4)};`;
        }

        const jsonc = await this.jsoncConfigFile.read();
        if (jsonc.isOk()) {
            return `const OLD_CONFIG = ${JSON.stringify(jsonc.unwrap(), null, 4)};`;
        }

        const mts = await this.mtsConfigFile.read();
        if (mts.isOk()) {
            return mts.unwrap().replace(/^export\s+default\s+/gm, "const OLD_CONFIG = ");
        }

        const ts = await this.tsConfigFile.read();
        if (ts.isOk()) {
            return ts.unwrap().replace(/^export\s+default\s+/gm, "const OLD_CONFIG = ");
        }

        return null;
    }

    generateContent(oldConfig: string | null) {
        let additional = "";
        let parameters = "";

        if (oldConfig !== null) {
            additional = `${oldConfig.trim()}\n`;
            parameters = "{}, OLD_CONFIG";
        }

        return template(CONFIG_TEMPLATE, {
            name: this.name,
            additional,
            parameters,
        });
    }

    async *write() {
        const oldConfig = await this.resolveOldConfig();
        const content = this.generateContent(oldConfig);

        yield {
            filename: this.newConfigFile.pathname.relative(),
            result: this.dryRun ? Ok() : await this.newConfigFile.raw(content).write(),
        };
    }

    async *deleteOthers() {
        for (const file of this.shouldDeletedConfigFiles) {
            yield {
                filename: file.pathname.relative(),
                result: this.dryRun ? Ok() : await file.rm(),
            };
        }
    }
}

export class OxlintConfigFile extends OxcConfigFile<OxlintConfig> {
    constructor(isEsmProject?: boolean, dryRun?: boolean, cwd?: string) {
        super("oxlint", isEsmProject, dryRun, cwd);
    }
}

export class OxfmtConfigFile extends OxcConfigFile<OxfmtConfig> {
    constructor(isEsmProject?: boolean, dryRun?: boolean, cwd?: string) {
        super("oxfmt", isEsmProject, dryRun, cwd);
    }
}
