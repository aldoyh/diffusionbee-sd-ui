module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
  ],
  parserOptions: {
    parser: '@babel/eslint-parser',
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-mutating-props': 'off',
    // Allow unused vars starting with _ (common pattern for destructured imports)
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  globals: {
    // Electron preload bridge globals
    ipcRenderer: 'readonly',
    ipcRenderer_on: 'readonly',
    bind_ipc_renderer_on: 'readonly',
    bind_ipc_download_on: 'readonly',
    unbind_ipc_download_on: 'readonly',
  },
};
