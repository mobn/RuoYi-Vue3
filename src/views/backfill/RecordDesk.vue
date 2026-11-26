<template>
  <div class="app-container bf">
    <h2>{{ titles[mode] }}</h2>
    <div class="bf-bar">
      <el-input v-model="search" clearable placeholder="搜索主题、期间、责任人" />
      <el-select v-model="status" clearable placeholder="全部状态">
        <el-option v-for="s in statuses" :key="s" :value="s" :label="label(s)" />
      </el-select>
      <el-select v-model="frequency" clearable placeholder="报送频率">
        <el-option v-for="f in frequencies" :key="f" :value="f" />
      </el-select>
      <el-button icon="Refresh" @click="load">刷新</el-button>
      <template v-if="mode === 'entry'">
        <el-button type="primary" icon="Plus" @click="newRow">新建补录</el-button>
        <el-button @click="$refs.file.click()">导入 JSON</el-button>
        <input ref="file" type="file" accept=".json" hidden @change="readFile">
        <el-button @click="exportRows">导出筛选结果</el-button>
        <el-button @click="deduplicate">清理重复草稿</el-button>
      </template>
    </div>
    <div v-if="mobile" v-loading="loading" class="bf-cards">
      <button
        v-for="r in filtered.slice((page - 1) * 20, page * 20)"
        :key="r.task || r.id"
        class="bf-card"
        @click="open(r)"
      >
        <strong>{{ r.topic }}</strong>
        <span>{{ label(state(r)) }}</span>
        <small>{{ r.period }} · {{ r.owner }} {{ r.archived ? ' · 已归档' : '' }}</small>
      </button>
      <el-empty v-if="!loading && !filtered.length" description="没有符合条件的任务" />
    </div>
    <el-table v-else v-loading="loading" :data="filtered.slice((page - 1) * 20, page * 20)" stripe>
      <el-table-column prop="topic" label="数据主题" min-width="150" sortable />
      <el-table-column prop="period" label="报送期间" sortable />
      <el-table-column prop="owner" label="责任人" />
      <el-table-column label="状态" min-width="125">
        <template #default="{ row: item }">
          <el-tag>{{ label(state(item)) }}</el-tag>
          {{ item.archived ? '已归档' : '' }}
        </template>
      </el-table-column>
      <el-table-column prop="edition" label="正式版本" width="85" />
      <el-table-column label="操作" fixed="right" width="80">
        <template #default="{ row: item }">
          <el-button text @click="open(item)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="page"
      :page-size="20"
      :total="filtered.length"
      layout="total,prev,pager,next"
    />
    <el-dialog title="创建补录任务" v-model="creating" width="min(520px, 96vw)" append-to-body>
      <el-form label-position="top">
        <el-form-item label="主题">
          <el-select v-model="create.topic_id">
            <el-option v-for="t in topics" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="报送期间">
          <el-input v-model="create.period" placeholder="例如 2026-11" maxlength="40" />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="create.due_date" value-format="yyyy-MM-dd" />
        </el-form-item>
        <el-form-item v-hasPermi="['backfill:config']" label="责任人账号">
          <el-input v-model="create.owner" placeholder="默认本人" />
        </el-form-item>
      </el-form>
      <template #footer><el-button type="primary" :loading="busy" @click="add">创建任务</el-button></template>
    </el-dialog>
    <el-dialog
      :title="row ? row.topic + ' · ' + row.period : ''"
      v-model="show"
      width="min(760px, 96vw)"
      append-to-body
    >
      <template v-if="row">
        <p>
          {{ row.owner }} · {{ label(row.status) }} · 正式版本 V{{ row.edition }}
          <span v-if="row.due_date">· 截止 {{ String(row.due_date).slice(0, 10) }}</span>
        </p>
        <p v-if="row.reason">修正原因：{{ row.reason }}</p>
        <p v-if="row.task">
          申请人 {{ row.applicant || row.owner }} ·
          {{
            row.review_kind === 'DELETE'
              ? '删除正式记录'
              : row.review_kind === 'REVIVE'
                ? '恢复正式记录'
                : '数据变更'
          }}
          · 审核环节 {{ row.stage_no + 1 }} · {{ row.assignee }} · {{ label(row.review_status) }}
          {{ row.opinion }}
        </p>
        <el-form label-position="top">
          <el-form-item
            v-for="f in row.template"
            :key="f.key"
            :label="f.label"
            :required="f.required"
            :error="editable ? errorFor(f, form[f.key], form) : ''"
          >
            <el-select v-if="f.type === 'select'" v-model="form[f.key]" :disabled="!editable">
              <el-option v-for="o in f.options" :key="o" :value="o" />
            </el-select>
            <el-date-picker
              v-else-if="f.type === 'date'"
              v-model="form[f.key]"
              type="date"
              value-format="yyyy-MM-dd"
              :disabled="!editable"
            />
            <el-input
              v-else
              v-model="form[f.key]"
              :type="f.type === 'number' ? 'number' : 'text'"
              maxlength="4000"
              :readonly="!editable"
            />
            <small v-if="row.official && String(row.official[f.key]) !== String(form[f.key])">
              正式值：{{ row.official[f.key] }}
            </small>
          </el-form-item>
        </el-form>
        <div v-if="mode === 'review' && row.review_status === 'PENDING'" class="bf-bar">
          <el-input v-model="opinion" placeholder="审核意见（退回、拒绝时必填）" maxlength="500" />
          <el-button v-for="a in ['APPROVE', 'RETURN', 'REJECT']" :key="a" :loading="busy" @click="act(a)">
            {{ label(a) }}
          </el-button>
        </div>
        <div v-else-if="mode !== 'review'" class="bf-bar">
          <template v-if="editable">
            <el-button type="primary" :loading="busy" @click="act('SAVE')">保存草稿</el-button>
            <el-button :loading="busy" @click="submit">保存并提交</el-button>
            <el-button @click="clean">清洗草稿</el-button>
            <el-button v-if="!row.official" @click="act('DELETE')">删除草稿</el-button>
          </template>
          <el-button v-if="row.status === 'DELETED' && !row.official" @click="act('UNDELETE')">
            恢复记录
          </el-button>
          <el-button
            v-if="row.status === 'DELETED' && row.official && mode === 'correction'"
            @click="requestLifecycle('REVIVE')"
          >
            申请恢复正式记录
          </el-button>
          <el-button v-if="row.status === 'PENDING'" @click="act('WITHDRAW')">撤回申请</el-button>
          <template v-if="row.status === 'EFFECTIVE' && mode === 'correction'">
            <el-input v-model="opinion" placeholder="填写修正原因" />
            <el-button @click="act('CORRECT')">发起修正</el-button>
            <el-button text @click="requestLifecycle('RETIRE')">申请删除正式记录</el-button>
            <el-button v-if="!row.archived" @click="act('ARCHIVE')">归档</el-button>
          </template>
        </div>
        <h4 v-if="progress.length">审核进度</h4>
        <el-table v-if="progress.length" :data="progress" size="small">
          <el-table-column label="环节" width="60">
            <template #default="{ row: t }">{{ t.stage_no + 1 }}</template>
          </el-table-column>
          <el-table-column prop="assignee" label="审核人" />
          <el-table-column label="状态">
            <template #default="{ row: t }">{{ label(t.status) }}</template>
          </el-table-column>
          <el-table-column prop="opinion" label="审核意见" />
          <el-table-column prop="opened" label="开始时间" min-width="130" />
        </el-table>
        <el-table v-if="history.length" :data="history" size="small">
          <el-table-column label="操作">
            <template #default="{ row: e }">{{ label(e.action) }}</template>
          </el-table-column>
          <el-table-column prop="actor" label="人员" />
          <el-table-column prop="detail" label="说明" />
          <el-table-column prop="created" label="时间" min-width="145" />
          <el-table-column v-if="editable" label="恢复">
            <template #default="{ row: e }">
              <el-button v-if="Number(e.restorable)" text @click="act('RESTORE', { event: e.id })">
                取回历史值
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>
<script>
import { get, post, copy, label, errorFor, downloadJson } from '@/api/backfill'
export default {
  props: { mode: { type: String, required: true }},
  data: () => ({
    titles: { entry: '补录工作台', review: '补录审核', correction: '归档与修正' },
    rows: [],
    topics: [],
    history: [],
    progress: [],
    search: '',
    status: '',
    frequency: '',
    row: null,
    form: {},
    create: {},
    opinion: '',
    creating: false,
    show: false,
    busy: false,
    loading: false,
    page: 1
  }),
  computed: {
    mobile() {
      return this.$store.state.app.device === 'mobile'
    },
    editable() {
      return (
        this.mode !== 'review' &&
        ['DRAFT', 'RETURNED', 'REJECTED'].includes(this.row.status) &&
        (!this.row.official || this.mode === 'correction')
      )
    },
    statuses() {
      return [...new Set(this.rows.map(this.state))]
    },
    frequencies() {
      return [...new Set(this.rows.map((r) => r.frequency).filter(Boolean))]
    },
    filtered() {
      return this.rows.filter(
        (r) =>
          (!this.status || this.state(r) === this.status) &&
          (!this.frequency || this.frequency === r.frequency) &&
          [r.period, r.owner, r.topic].join(' ').includes(this.search)
      )
    }
  },
  watch: {
    filtered() {
      this.page = 1
    }
  },
  created() {
    this.load()
  },
  methods: {
    label,
    errorFor,
    state(r) {
      return r.review_status || r.status
    },
    async load() {
      this.loading = true
      try {
        const rows = await get(this.mode === 'review' ? 'reviews' : 'records')
        this.rows = this.mode === 'correction' ? rows.filter((r) => r.official) : rows
        if (this.mode === 'entry') this.topics = (await get('topics')).filter(t => t.can_enter)
      } finally {
        this.loading = false
      }
    },
    newRow() {
      this.create = { topic_id: this.topics[0] && this.topics[0].id, period: '', due_date: null }
      this.creating = true
    },
    async add() {
      if (!this.create.period || !this.create.topic_id) return this.$message.warning('请选择主题并填写期间')
      this.busy = true
      try {
        if (!this.create.owner) delete this.create.owner
        const r = await post('records', this.create)
        this.creating = false
        await this.load()
        const row = this.rows.find((x) => x.id === r.data)
        if (row) await this.open(row)
      } finally {
        this.busy = false
      }
    },
    async open(row) {
      this.row = row
      this.form = copy(row.draft)
      this.history = []
      this.opinion = ''
      this.show = true
      this.progress = []
      const prefix = 'records/' + row.id
      const [progress, history] = await Promise.all([
        get(prefix + '/progress'),
        this.mode === 'review' ? [] : get(prefix + '/history')
      ])
      if (this.row === row) {
        this.progress = progress
        this.history = history
      }
    },
    async requestLifecycle(action) {
      const input = await this.$prompt(
        '填写申请原因，审核通过后会向下游发送相应版本',
        action === 'RETIRE' ? '申请删除正式记录' : '申请恢复正式记录'
      )
      this.opinion = input.value
      await this.act(action)
    },
    async clean() {
      await this.$confirm('按已保存的草稿去除首尾空格，并按模板填入缺省值。确认清洗？')
      await post('reports/' + this.row.id + '/clean', { version: this.row.version })
      this.show = false
      await this.load()
    },
    async submit() {
      await this.act('SUBMIT')
    },
    async act(action, extra = {}) {
      if (this.busy) return
      if (['DELETE', 'RESTORE', 'WITHDRAW'].includes(action)) {
        await this.$confirm('确认' + label(action) + '？')
      }
      this.busy = true
      try {
        const base = 'records/' + this.row.id + '/'
        let version = this.row.version
        if (action === 'SUBMIT' && JSON.stringify(this.form) !== JSON.stringify(this.row.draft)) {
          await post(base + 'SAVE', { version, draft: this.form })
          version++
          this.row.version = version
          this.row.draft = copy(this.form)
        }
        await post(base + action, {
          version,
          draft: this.form,
          task: this.row.task,
          reason: this.opinion,
          ...extra
        })
        this.$message.success('操作成功')
        this.show = false
        await this.load()
      } finally {
        this.busy = false
      }
    },
    async deduplicate() {
      const candidates = this.filtered.filter(
        (r) => r.status === 'DRAFT' && !r.official && !r.schedule_key && Object.keys(r.draft).length
      )
      const first = new Map()
      const duplicates = []
      for (const r of candidates.sort((a, b) => String(a.created).localeCompare(String(b.created)))) {
        const key = JSON.stringify([
          r.topic_id,
          r.owner,
          r.period,
          Object.keys(r.draft)
            .sort()
            .map((k) => [k, r.draft[k]])
        ])
        if (first.has(key)) duplicates.push(r)
        else first.set(key, r)
      }
      if (!duplicates.length) return this.$message.info('当前筛选范围没有完全相同的草稿')
      await this.$confirm('保留最早一条，将 ' + duplicates.length + ' 条完全重复草稿移入已删除。继续？')
      try {
        for (const r of duplicates) await post('records/' + r.id + '/DELETE', { version: r.version })
      } finally {
        await this.load()
      }
    },
    exportRows() {
      downloadJson(
        '补录数据',
        this.filtered.map(({ topic_id, period, draft }) => ({ topic_id, period, draft }))
      )
    },
    async readFile(e) {
      const file = e.target.files[0]
      e.target.value = ''
      if (!file) return
      try {
        const rows = JSON.parse(await file.text())
        await this.$confirm('将按各模板的审批设置提交，免审数据会直接生效。确认导入？')
        await post('import', rows)
        this.$message.success('导入完成')
        await this.load()
      } catch (err) {
        if (err instanceof SyntaxError) this.$message.error('请选择有效的 JSON 文件')
      }
    }
  }
}
</script>
<style>
.bf-cards {
  display: grid;
  gap: 10px;
}
.bf-card {
  border: 1px solid #dfe5eb;
  border-radius: 6px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  text-align: left;
  background: white;
  padding: 14px;
  color: #263b52;
}
.bf-card span {
  color: #276783;
}
.bf-card small {
  grid-column: 1/-1;
}
.bf h2 {
  font-size: 22px;
  margin: 2px 0 22px;
  color: #263b52;
}
.bf-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0 18px;
}
.bf-bar > .el-input,
.bf-bar > .el-select {
  width: 195px;
}
.bf-bar .el-button + .el-button {
  margin-left: 0;
}
.bf small,
.el-form-item small {
  display: block;
  color: #68798c;
}
.bf .el-pagination {
  margin-top: 14px;
}
@media (max-width: 650px) {
  .bf {
    padding: 12px;
  }
  .bf-bar > .el-input,
  .bf-bar > .el-select {
    width: 100%;
  }
  .el-dialog__body {
    overflow-wrap: anywhere;
  }
}
</style>
