<template>
  <div class="app-container bf">
    <h2>操作审计</h2>
    <div class="bf-bar">
      <el-input v-model="query" clearable placeholder="人员、操作、记录编号或批次" />
      <el-button @click="load">刷新</el-button>
    </div>
    <el-table
      :data="rows.filter((r) => [r.actor, label(r.action), r.record_id, r.detail].join(' ').includes(query))"
      stripe
    >
      <el-table-column prop="created" label="时间" sortable />
      <el-table-column prop="actor" label="操作人" />
      <el-table-column label="操作">
        <template #default="{ row }">{{ label(row.action) }}</template>
      </el-table-column>
      <el-table-column prop="record_id" label="记录编号" show-overflow-tooltip />
      <el-table-column prop="detail" label="详情" />
    </el-table>
  </div>
</template>
<script>
import { get, label } from '@/api/backfill'
export default {
  name: 'BackfillAudit',
  data: () => ({ rows: [], query: '' }),
  created() {
    this.load()
  },
  methods: {
    label,
    async load() {
      this.rows = await get('audit')
    }
  }
}
</script>
