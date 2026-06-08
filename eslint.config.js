import stylistic from "@stylistic/eslint-plugin";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser
        },
        plugins: {
            "@typescript-eslint": tseslint,
            "@stylistic": stylistic
        },
        rules: {
            // ...stylistic.configs["recommended"].rules,
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: false }],
            "@stylistic/object-curly-newline": ["error", "always"],
            "@stylistic/function-paren-newline": ["error", "multiline"],
            "@stylistic/comma-dangle": ["error", "never"],
            "@stylistic/indent": ["error", 4],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/arrow-spacing": ["error", { before: true, after: true }],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/no-multiple-empty-lines": ["error", { max: 1 }],
            "@stylistic/array-element-newline": ["error", "always"],
            "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: false }],
            "@stylistic/array-bracket-newline": ["error", "always"]
        }
    }
];