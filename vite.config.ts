/// <reference types="vitest" />
import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.build.json',
      rollupTypes: true,
      // fails the build when the generated declarations import a type by a node_modules path,
      // which does not resolve in a consumer's installation
      afterBuild: () => {
        const dist = resolve(import.meta.dirname, 'dist');
        const paths = readdirSync(dist, { recursive: true, encoding: 'utf-8' })
          .filter((file) => file.endsWith('.d.ts'))
          .flatMap((file) => readFileSync(resolve(dist, file), 'utf-8')
            .match(/(?:from |import\()['"][^'"]*node_modules[^'"]*['"]/g) ?? []);
        if (paths.length) throw new Error(`declarations import from node_modules paths: ${paths.join(', ')}`);
      },
    }),
    visualizer({
      open: false,
      filename: 'coverage/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    extensions: [
      '.js',
      '.mjs',
      '.ts',
    ],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      fileName: 'dynamicforms-translatable',
    },
    rollupOptions: {
      external: [
        'vue',
      ],
      output: [
        {
          format: 'es',
          entryFileNames: 'dynamicforms-translatable.js',
        },
      ],
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'src/**/*'
      ],
      exclude: [
        '**/index.ts',
      ],
    },
    globals: true,
    environment: 'node',
  },
});
