// @ts-check
'use strict';

/** @type {import('prettier').Config} */
module.exports = {
  // Use single quotes for strings
  singleQuote: true,
  
  // Use double quotes for JSX
  jsxSingleQuote: false,
  
  // Print trailing commas wherever possible when multi-line
  trailingComma: 'es5',
  
  // Use 2 spaces for indentation
  tabWidth: 2,
  
  // Use spaces instead of tabs
  useTabs: false,
  
  // Print semicolons at the end of statements
  semi: true,
  
  // Line width before wrapping
  printWidth: 100,
  
  // Enforce consistent line endings (lf on Unix, crlf on Windows)
  endOfLine: 'auto',
  
  // Put the > of a multi-line JSX element at the end of the last line instead of being alone on the next line
  bracketSameLine: false,
  
  // Include parentheses around a sole arrow function parameter
  arrowParens: 'always',
  
  // Format only specific file patterns (prevents formatting node_modules, etc.)
  overrides: [
    {
      files: '*.{js,jsx,ts,tsx,json,md,mdx,html,css,scss,yml,yaml}',
      options: {
        // Additional file-specific options can go here
      },
    },
  ],
  
  // Plugins
  plugins: [
    // Sorts package.json
    'prettier-plugin-packagejson',
    // Sorts imports
    '@trivago/prettier-plugin-sort-imports',
    // Sorts Tailwind CSS classes
    'prettier-plugin-tailwindcss',
  ],
  
  // @trivago/prettier-plugin-sort-imports configuration
  importOrder: [
    '^react(.*)$',
    '^next(.*)$',
    '^@?[a-zA-Z]',
    '^@/components/(.*)$',
    '^@/lib/(.*)$',
    '^@/hooks/(.*)$',
    '^@/styles/(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  
  // Tailwind CSS configuration
  tailwindConfig: './tailwind.config.ts',
  tailwindFunctions: ['cn', 'clsx', 'tw'],
};
