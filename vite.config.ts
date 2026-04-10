import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // pure logic（reducer / urlCodec など）のみテストする方針のため node 環境で十分。
    // React コンポーネントの DOM テストを書きたくなったら 'jsdom' に変更し
    // jsdom を devDependency に追加すること。
    environment: 'node',
  },
})
