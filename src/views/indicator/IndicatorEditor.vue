<template>
  <el-drawer :model-value="true" :title="title" :wrapper-closable="!busy" :before-close="close" append-to-body size="min(640px, 96vw)">
    <div class="sheet">
      <template v-if="mode === 'import'">
        <p>支持原始工作簿和当前字段模板。相同记录会在导入时跳过。</p>
        <el-button size="small" icon="Download" @click="templateFile">下载 Excel 模板</el-button>
        <label class="filebox">选择工作簿 <input type="file" accept=".xlsx,.xls" :disabled="busy" @change="preview"></label>
        <div v-loading="reading">
          <template v-if="report">
            <h3>{{ report.sheet }}</h3>
            <p>可新增 {{ ready.length }} 条 · 重复 {{ report.rows.filter(r => r.status === '跳过').length }} 条 · 异常 {{ errors }} 条</p>
            <el-table :data="report.rows" max-height="360" size="small">
              <el-table-column prop="line" label="来源行" width="70" />
              <el-table-column label="记录名称"><template #default="s">{{ s.row.values[processMode ? 1 : 6] }}</template></el-table-column>
              <el-table-column prop="status" label="处理结果" width="160" />
            </el-table>
          </template>
        </div>
      </template>
      <label v-else-if="mode === 'column'" class="field">字段名称
        <el-input v-model.trim="field" maxlength="60" placeholder="例如：业务归属" />
        <small>新字段会出现在录入表单、详情和导入模板中。</small>
      </label>
      <div v-else class="grid">
        <template v-for="group in groups" :key="group.name">
          <h3>{{ group.name }}</h3>
          <label v-for="i in group.cols" :key="i" class="field" :class="{ wide: multiline(i) }">
            {{ catalog.headers[i] }}{{ required.includes(i) ? ' *' : '' }}
            <el-input v-model="values[i]" :readonly="processMode && !!entry && i === 1" :type="multiline(i) ? 'textarea' : 'text'" :rows="3" :placeholder="processMode && i === 3 ? '每行一个上游过程名' : ''" />
          </label>
        </template>
      </div>
      <div class="actions">
        <el-button size="small" :disabled="busy" @click="close">取消</el-button>
        <el-button size="small" class="primary" :disabled="disabled" :loading="busy" @click="save">{{ mode === 'import' ? '确认导入' : '保存' }}</el-button>
      </div>
    </div>
  </el-drawer>
</template>
<script>
import { previewWorkbook, saveChange } from '@/api/indicator'

export default {
  props: {
    kind: { type: String, required: true },
    catalog: { type: Object, required: true },
    mode: { type: String, required: true },
    entry: { type: Object, default: null },
    defaults: { type: Array, required: true }
  },
  data() {
    const row = this.entry ? this.entry.values : this.defaults
    return { values: this.catalog.headers.map((_, i) => row[i] || ''), field: '', busy: false,
      reading: false, sequence: 0, report: null, version: this.catalog.version }
  },
  computed: {
    processMode() { return this.kind === 'process' },
    required() { return this.processMode ? [0, 1, 2] : [0, 1, 6, 11] },
    title() {
      const subject = this.processMode ? '加工过程' : '特征'
      if (this.mode === 'import') return 'Excel 导入 · ' + subject
      if (this.mode === 'column') return '新增' + subject + '字段'
      return (this.entry ? '编辑' : '新增') + subject
    },
    groups() {
      const groups = this.processMode ? [{ name: '过程定义', cols: [0, 1, 2, 3] }] : [
        { name: '基本信息', cols: [6, 7, 0, 1, 4, 2, 3, 5] },
        { name: '口径与应用', cols: [11, 10, 13, 12, 14, 15, 16] },
        { name: '开发与落表', cols: [8, 9, 18, 19, 17] }
      ]
      const base = this.processMode ? 4 : 20
      if (this.catalog.headers.length > base) groups.push({ name: '扩展字段', cols: this.catalog.headers.slice(base).map((_, i) => base + i) })
      return groups
    },
    ready() { return this.report ? this.report.rows.filter(r => r.status === '新增') : [] },
    errors() { return this.report ? this.report.rows.filter(r => !['跳过', '新增'].includes(r.status)).length : 0 },
    disabled() {
      if (this.mode === 'import') return this.reading || !this.ready.length || !!this.errors
      if (this.mode === 'column') return !this.field.trim()
      return !!this.validate(this.values)
    }
  },
  methods: {
    close() { if (!this.busy) this.$emit('close') },
    multiline(i) { return this.processMode ? i === 3 : [10, 11, 13, 17].includes(i) },
    validate(row) {
      const missing = this.required.find(i => !String(row[i] || '').trim())
      if (missing !== undefined) return '缺少' + this.catalog.headers[missing]
      if (this.processMode && !/^[1-9]\d{0,8}$/.test(row[0])) return '批次须为正整数（最多9位）'
      return ''
    },
    key(row) {
      return this.processMode ? row[1].trim().toUpperCase() : JSON.stringify([row[0], row[1], row[6]].map(v => v.trim()))
    },
    templateFile() {
      this.download('indicator/' + this.kind + '/template', {}, (this.processMode ? '加工过程' : '特征') + '导入模板.xlsx')
    },
    async preview(event) {
      const sequence = ++this.sequence
      this.report = null
      const file = event.target.files[0]
      if (!file) { this.reading = false; return }
      this.reading = true
      try {
        const { data } = await previewWorkbook(this.kind, file)
        if (sequence !== this.sequence) return
        if (data.version !== this.version) { this.$message.warning('目录已有更新，请关闭窗口并刷新后重试'); return }
        const keys = new Set(this.catalog.rows.map(r => this.key(r.values)))
        data.rows.forEach(row => {
          const key = this.key(row.values)
          row.status = this.validate(row.values) || (keys.has(key) ? '跳过' : '新增')
          keys.add(key)
        })
        this.report = data
      } finally { if (sequence === this.sequence) this.reading = false }
    },
    async save() {
      if (this.busy || this.disabled) return
      const change = { version: this.version }
      if (this.mode === 'column') change.field = this.field
      else {
        change.rows = this.mode === 'import' ? this.ready.map(r => r.values) : [this.values]
        if (this.entry) change.id = this.entry.id
      }
      this.busy = true
      try {
        await saveChange(this.kind, change)
        this.$message.success(this.mode === 'import' ? '已导入 ' + change.rows.length + ' 条记录' : '已保存')
        this.$emit('saved', this.mode === 'form' ? this.values : null)
      } finally { this.busy = false }
    }
  }
}
</script>
<style scoped>
.sheet {
  padding: 0 24px 24px;
  color: #243d4e;
  height: 100%;
  overflow: auto
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px
}

.grid h3,
.wide {
  grid-column: 1/-1
}

.grid h3 {
  border-top: 1px solid #dae4e8;
  margin: 8px 0 0;
  padding-top: 14px
}

.field {
  display: grid;
  gap: 6px;
  font-size: 13px
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px
}

.primary,
.primary:focus,
.primary:hover {
  background: #096b60;
  color: white
}

.filebox {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  background: #f1f7f6;
  border: 1px dashed #86ada7;
  border-radius: 6px;
  padding: 14px;
  margin: 18px 0
}

.filebox input {
  max-width: 100%
}

.sheet small {
  color: #627784
}

@media(max-width:600px) {
  .grid {
    grid-template-columns: 1fr
  }
}
</style>
