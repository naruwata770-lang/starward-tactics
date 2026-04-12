import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // GitHub Pages のプロジェクトページは /starward-tactics/ 配下でホストされるため、
  // build 時のみ base を設定する。dev/preview はローカルなので / のまま。
  base: command === 'build' ? '/starward-tactics/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    // Inspector 配下の React コンポーネント (CostSelector / LockTargetSelector 等) の
    // ボタンクリック → dispatch 経路を検証するため happy-dom で DOM 環境を提供する。
    // reducer などの純粋ロジックテストは DOM を参照しないのでこのままで動く。
    environment: 'happy-dom',
  },
}))
