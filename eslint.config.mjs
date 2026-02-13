import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  {
    ignores: ['public/', 'dist/', 'node_modules/*', '.config.js'],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prettier/prettier': 'error',
    },
  },
)
