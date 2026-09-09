import { defineConfig } from "rolldown";

const dist = "dist";

export default defineConfig({
    input: "src/index.ts",

    output: {
        dir: dist,
        cleanDir: true,
        format: "esm",
    },

    platform: "node",
    resolve: {
        mainFields: ["module", "main"],
    },

    treeshake: {
        moduleSideEffects: false,
    },
});
