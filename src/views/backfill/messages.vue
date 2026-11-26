<template>
  <div class="app-container bf">
    <h2>消息中心</h2>
    <div class="bf-bar">
      <el-switch v-model="unread" active-text="仅看未读" />
      <el-button @click="load">刷新</el-button>
    </div>
    <el-table :data="rows.filter((r) => !unread || !Number(r.seen))" stripe>
      <el-table-column prop="body" label="消息" min-width="220" />
      <el-table-column prop="created" label="接收时间" />
      <el-table-column label="状态">
        <template #default="{ row }">
          <el-button v-if="!Number(row.seen)" text @click="mark(row)">标为已读</el-button>
          <span v-else>已读</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script>
import { get, seen } from '@/api/backfill'
export default {
  name: 'BackfillMessages',
  data: () => ({ rows: [], unread: false, timer: null }),
  activated() {
    this.start()
  },
  mounted() {
    this.start()
  },
  deactivated() {
    clearInterval(this.timer)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    start() {
      clearInterval(this.timer)
      this.load()
      this.timer = setInterval(() => this.load(), 10000)
    },
    async load() {
      this.rows = await get('messages')
    },
    async mark(r) {
      await seen(r.id)
      await this.load()
    }
  }
}
</script>
