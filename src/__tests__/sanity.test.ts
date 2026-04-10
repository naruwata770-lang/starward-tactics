import { describe, it, expect } from 'vitest'

// vitest のセットアップが正しく動くことを確認するための smoke test。
// Phase 2 で reducer や urlCodec のテストを追加する。
describe('test environment', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
