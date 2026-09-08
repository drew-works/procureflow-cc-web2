import { defineStore } from 'pinia'
import { listMembers } from '@/lib/kuroco/client'
import type { Member, Role } from '@/lib/kuroco/types'

const STORAGE_KEY = 'procureflow_current_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null as Member | null,
    allMembers: [] as Member[],
  }),
  getters: {
    isLoggedIn: (state) => state.currentUser !== null,
    role: (state): Role | null => state.currentUser?.role ?? null,
  },
  actions: {
    async loadMembers() {
      if (this.allMembers.length === 0) {
        this.allMembers = await listMembers()
      }
      return this.allMembers
    },
    async restoreSession() {
      await this.loadMembers()
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const memberId = Number(saved)
        const found = this.allMembers.find((m) => m.memberId === memberId)
        if (found) this.currentUser = found
      }
    },
    async loginAsMember(memberId: number) {
      await this.loadMembers()
      const found = this.allMembers.find((m) => m.memberId === memberId)
      if (!found) throw new Error('ユーザーが見つかりません')
      // 動的アクセストークン方式を想定したモックトークンを発行
      sessionStorage.setItem('procureflow_access_token', `mock-token-${found.memberId}`)
      sessionStorage.setItem(STORAGE_KEY, String(found.memberId))
      this.currentUser = found
      return found
    },
    logout() {
      this.currentUser = null
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem('procureflow_access_token')
    },
  },
})
