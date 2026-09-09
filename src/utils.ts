import { styleText as nodeStyleText } from "node:util";

import { isArray, isPlainObject } from "@goodbyenjn/utils/fp";
import { stringify } from "@goodbyenjn/utils/json/safe";
import { Result } from "@goodbyenjn/utils/result";
import { parse as parseJsonc } from "jsonc-parser";

import type { StyleTextOptions } from "node:util";

type OmitArray<T> = T extends (infer U)[] ? U : T extends readonly (infer U)[] ? U : T;
type Format = OmitArray<Parameters<typeof nodeStyleText>[0]>;
type Text = Parameters<typeof nodeStyleText>[1];
type Return = ReturnType<typeof nodeStyleText>;

type StyleText = {
    /**
     * Returns a formatted text with `format` applied.
     *
     * @example
     *     ```
     *     import styleText from 'nodeStyle';
     *
     *     styleText.red('Hello, world!');
     *     styleText.bold('Hello, world!');
     *     styleText.red.bold('Hello, world!');
     *     ```;
     *
     * @param text - Text to add style.
     *
     *   The full list of formats can be found in
     *   [colors](https://nodejs.org/docs/latest/api/util.html#customizing-utilinspect-colors).
     */
    (text: Text): Return;

    /**
     * Returns a formatted text with `format` applied.
     *
     * @example
     *     ```
     *     import styleText from 'nodeStyle';
     *
     *     styleText.red`Hello, ${'world'}!`;
     *     styleText.bold`Hello, ${'world'}!`;
     *     styleText.red.bold`Hello, ${'world'}!`;
     *     ```
     *
     * @param template A well-formed template string call site representation.
     * @param substitutions A set of substitution values.
     *
     *   The full list of formats can be found in
     *   [colors](https://nodejs.org/docs/latest/api/util.html#customizing-utilinspect-colors).
     */
    (template: TemplateStringsArray, ...substitutions: any[]): Return;
} & { [key in Format]: StyleText };

const factory = (
    style: typeof nodeStyleText,
    options?: StyleTextOptions,
    formats: any[] = [],
): StyleText => {
    return new Proxy<any>(
        (raw: any, ...substitutions: any[]) => {
            const text = raw.raw ? String.raw({ raw }, ...substitutions) : raw;
            return style(formats, text, options);
        },

        {
            get: (_, format) => {
                return factory(style, options, [...formats, format]);
            },
        },
    );
};

export const styleText = factory(nodeStyleText);

export const JSONC = {
    parse: Result.wrap(parseJsonc, Error),
    stringify: (value: any) => stringify(value, null, 4),
};

export const mergeDeep = (destination: object, source: object) => {
    if (isArray(destination) && isArray(source)) {
        const output = [...destination, ...source];

        return output;
    }

    const output: any = { ...destination, ...source };

    for (const key in source) {
        if (!Object.hasOwn(destination, key)) continue;

        if (isArray(destination[key]) && isArray((source as any)[key])) {
            output[key] = mergeDeep(destination[key], (source as any)[key]);
            continue;
        }

        if (!isPlainObject(destination[key])) {
            continue;
        }

        if (!isPlainObject((source as any)[key])) {
            continue;
        }

        output[key] = mergeDeep(destination[key], (source as any)[key]);
    }

    return output;
};
