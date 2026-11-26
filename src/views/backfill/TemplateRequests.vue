<template>
  <section>
    <h3>{{ assigned ? '模板启用审批' : '模板申请记录' }}</h3>
    <el-button size="small" icon="Refresh" @click="load">刷新申请</el-button>
    <el-table :data="rows" stripe empty-text="暂无模板申请">
      <el-table-column prop="payload.name" label="模板" />
      <el-table-column prop="applicant" label="申请人" />
      <el-table-column prop="reviewer" label="审批人" />
      <el-table-column label="状态"><template #default="{ row }">{{ states[row.status] }}</template></el-table-column>
      <el-table-column label="操作"><template #default="{ row }"><el-button text @click="open(row)">查看申请</el-button></template></el-table-column>
    </el-table>
    <el-dialog v-if="selected" :title="selected.payload.name" v-model="show" append-to-body width="min(760px,96vw)">
      <p>{{ definition.frequency }} · {{ definition.sensitivity }} · {{ states[selected.status] }}</p>
      <p>授权角色：{{ definition.entry_acl.roles.join('、') || '无' }}</p>
      <p>额外人员：{{ definition.entry_acl.users.join('、') || '无' }}</p>
      <p>数据审批：{{ definition.stages.map(s => s.join(' + ')).join(' → ') || '提交后直接生效' }}</p>
      <p>自动派发：{{ definition.owners.join('、') || '无' }}，截止天数 {{ definition.due_days == null ? 5 : definition.due_days }}</p>
      <el-table :data="definition.fields" size="small">
        <el-table-column prop="label" label="字段" />
        <el-table-column prop="key" label="编码" />
        <el-table-column prop="type" label="类型" />
        <el-table-column label="规则" min-width="180"><template #default="{ row }">{{ rules(row) }}</template></el-table-column>
      </el-table>
      <p v-if="selected.opinion">审批意见：{{ selected.opinion }}</p>
      <template v-if="assigned && selected.status === 'PENDING'">
        <el-input v-model="opinion" type="textarea" maxlength="500" placeholder="审批意见（拒绝时必填）" />
      </template>
      <template #footer><div>
        <template v-if="assigned && selected.status === 'PENDING'">
          <el-button :disabled="busy" @click="decide('REJECT')">拒绝</el-button>
          <el-button type="primary" :loading="busy" @click="decide('APPROVE')">通过并启用</el-button>
        </template>
        <el-button v-if="!assigned && selected.status === 'REJECTED'" @click="revise">修改并重新申请</el-button>
      </div></template>
    </el-dialog>
  </section>
</template>
<script>
import { get, post } from '@/api/backfill'
export default {
  props: { assigned: Boolean },
  data: () => ({
    rows: [], selected: null, show: false, opinion: '', busy: false,
    states: { PENDING: '待审批', APPROVED: '已通过', REJECTED: '已拒绝' }
  }),
  computed: {
    definition() { return this.selected.payload }
  },
  created() { this.load() },
  methods: {
    async load() { this.rows = await get(this.assigned ? 'template-reviews' : 'template-requests') },
    open(row) { this.selected = row; this.show = true; this.opinion = '' },
    revise() { this.show = false; this.$emit('revise', this.definition) },
    rules(f) {
      return [f.required ? '必填' : '选填', f.min != null && '最小 ' + f.min,
        f.max != null && '最大 ' + f.max, f.gteField && '≥ ' + f.gteField,
        (f.options || []).join('、'), f.defaultValue && '默认 ' + f.defaultValue].filter(Boolean).join(' · ')
    },
    async decide(action) {
      if (action === 'REJECT' && !this.opinion.trim()) return this.$message.warning('请填写拒绝原因')
      this.busy = true
      try {
        await post('template-reviews/' + this.selected.id, { action, opinion: this.opinion })
        this.show = false
        await this.load()
      } finally { this.busy = false }
    }
  }
}
</script>
