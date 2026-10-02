import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['dist/**', '.wrangler/**'] }, js.configs.recommended, ...tseslint.configs.recommended, { files: ['**/*.{ts,tsx}'], languageOptions: { globals: { document: 'readonly', window: 'readonly', localStorage: 'readonly', crypto: 'readonly', Intl: 'readonly', URL: 'readonly', Request: 'readonly', Response: 'readonly', console: 'readonly' } } });
