<template>
  <div v-loading="loading" class="indicator-page">
    <div class="heading">
      <h1>客户特征模型</h1>
      <div v-if="canEdit" class="modes">
        <button :aria-pressed="!managing" @click="managing = false">模型浏览</button>
        <button :aria-pressed="managing" @click="managing = true">模型管理</button>
      </div>
    </div>
    <template v-if="model">
      <div class="summary">
        <span><b>{{ tree.length }}</b> 特征大类</span><span><b>{{ model.feature.rows.length }}</b> 项特征</span>
        <span><b>{{ model.process.rows.length }}</b> 个存储过程</span><span><b>{{ batches.length }}</b> 个跑批批次</span>
      </div>
      <div class="tabs"><button :class="{ selected: !processMode }" @click="kind = 'feature'">特征目录</button><button :class="{ selected: processMode }" @click="kind = 'process'">加工依赖</button></div>
      <div class="layout">
        <aside class="panel">
          <h2>{{ processMode ? '跑批批次' : '业务分类' }}</h2>
          <button class="node" :class="{ active: processMode ? !batch : !category }" @click="selectAll">{{ processMode ? '全部批次' : '全部特征' }}<small>{{ catalog.rows.length }}</small></button>
          <template v-if="processMode">
            <button v-for="b in batches" :key="b.name" class="node" :class="{ active: batch === b.name }" @click="batch = b.name">第 {{ b.name }} 批 <small>{{ b.rows.length }}</small></button>
          </template>
          <template v-else>
            <details v-for="g in tree" :key="g.name" :open="group === g.name">
              <summary>{{ g.name }} · {{ g.count }}</summary>
              <button v-for="c in g.children" :key="c.name" class="node child" :class="{ active: group === g.name && category === c.name }" @click="choose(g.name, c.name)">{{ c.name }}<small>{{ c.count }}</small></button>
            </details>
          </template>
        </aside>
        <section class="panel">
          <div class="section-head"><h2>{{ processMode ? (batch ? '第 '+batch+' 批' : '全部跑批批次') : category || '全部特征' }}</h2>
            <span>{{ processMode ? shownBatches.reduce((n,b) => n+b.rows.length,0) + ' 个过程' : filtered.length + ' 项特征' }}</span>
          </div>
          <div v-if="managing && canEdit" class="actions">
            <button class="primary" @click="edit('form')">＋ 新增{{ processMode ? '加工过程' : '特征' }}</button>
            <button @click="edit('import')">Excel 导入</button><button @click="edit('column')">新增字段</button>
          </div>
          <template v-if="!processMode">
            <div class="filters">
              <el-input v-model="search" size="small" clearable prefix-icon="Search" placeholder="搜索特征名称或业务口径" />
              <el-select v-model="cycle" size="small" clearable placeholder="全部跑批周期"><el-option v-for="v in cycles" :key="v" :label="v" :value="v" /></el-select>
              <el-select v-model="sensitivity" size="small" clearable placeholder="全部安全级别"><el-option v-for="v in levels" :key="v" :label="v" :value="v" /></el-select>
            </div>
            <el-table :data="paged" size="small" empty-text="没有符合条件的特征" :header-cell-style="{ background: '#f2f6f8', color: '#526576' }">
              <el-table-column label="特征名称" min-width="220"><template #default="s"><button class="link" @click="detail = s.row">{{ s.row.values[6] }}</button></template></el-table-column>
              <el-table-column label="特征小类" min-width="105"><template #default="s">{{ s.row.values[4] }}</template></el-table-column>
              <el-table-column label="域" width="65"><template #default="s">{{ s.row.values[5] }}</template></el-table-column>
              <el-table-column label="跑批周期" width="85"><template #default="s">{{ s.row.values[14] }}</template></el-table-column>
              <el-table-column label="安全级别" width="90"><template #default="s"><span class="pill" :class="{ high:s.row.values[15] === '高敏感' }">{{ s.row.values[15] || '未登记' }}</span></template></el-table-column>
              <el-table-column v-if="managing && canEdit" label="操作" width="55"><template #default="s"><button class="link" @click="edit('form',s.row)">编辑</button></template></el-table-column>
            </el-table>
            <el-pagination v-model:current-page="page" :page-size="10" :pager-count="5" :total="filtered.length" layout="prev, pager, next" hide-on-single-page />
          </template>
          <template v-else>
            <section v-for="b in shownBatches" :key="b.name" class="batch">
              <h3>第 {{ b.name }} 批</h3>
              <article v-for="r in b.rows" :key="r.id">
                <button v-if="managing && canEdit" class="link edit" @click="edit('form',r)">编辑</button>
                <button class="link proc-name" @click="detail = r">{{ r.values[2] }}</button>
                <code>{{ r.values[1] }}</code><div class="up">直接上游 ·
                  <template v-if="r.values[3]"><button v-for="id in refs(r)" :key="id" class="link ref" @click="openProcess(id)">{{ processLabel(id) }}</button></template>
                  <span v-else>未登记</span>
                </div>
              </article>
            </section>
          </template>
        </section>
      </div>
      <el-drawer v-if="detail" :model-value="true" :title="detail.values[processMode ? 2 : 6]" append-to-body size="min(530px, 96vw)" :before-close="clearDetail">
        <div class="detail">
          <template v-if="!processMode">
            <small>{{ [0,1,4].map(i => detail.values[i]).join(' / ') }}</small>
            <section v-for="i in [11,13,10]" :key="i"><h3>{{ catalog.headers[i] }}</h3><p>{{ detail.values[i] === '/' ? '未列出' : detail.values[i] || '未登记' }}</p></section>
          </template>
          <dl><template v-for="i in detailCols" :key="i"><dt>{{ catalog.headers[i] }}</dt><dd>{{ detail.values[i] || '未登记' }}</dd></template>
            <template v-if="processMode"><dt>直接下游</dt><dd><button v-for="r in downstream" :key="r.id" class="link ref" @click="detail = r">{{ r.values[2] }}</button>{{ downstream.length ? '' : '未登记' }}</dd></template>
          </dl>
        </div>
      </el-drawer>
      <indicator-editor v-if="mode" :kind="kind" :catalog="catalog" :mode="mode" :entry="editing" :defaults="defaults" @saved="saved" @close="mode = ''" />
    </template>
    <div v-else-if="!loading" class="panel">指标目录加载失败。 <el-button text @click="load">重新加载</el-button></div>
  </div>
</template>
<script>
import { getCatalog } from '@/api/indicator'
import { checkPermi } from '@/utils/permission'
import IndicatorEditor from './IndicatorEditor'

export default {
  name: 'Indicator',
  components: { IndicatorEditor },
  data() {
    return { model: null, kind: 'feature', group: '客户资产信息', category: '存款类资产', batch: '',
      managing: false, mode: '', editing: null, detail: null, page: 1, search: '', cycle: '', sensitivity: '', loading: true }
  },
  computed: {
    canEdit() { return checkPermi(['indicator:model:edit']) },
    processMode() { return this.kind === 'process' },
    catalog() { return this.model[this.kind] },
    tree() {
      const groups = new Map()
      this.model.feature.rows.forEach(({ values: [group, category] }) => {
        if (!groups.has(group)) groups.set(group, new Map())
        const children = groups.get(group)
        children.set(category, (children.get(category) || 0) + 1)
      })
      return Array.from(groups, ([name, items]) => ({ name, count: [...items.values()].reduce((a, b) => a + b, 0),
        children: Array.from(items, ([name, count]) => ({ name, count })) }))
    },
    batches() {
      const batches = new Map()
      this.model.process.rows.forEach(r => {
        const b = r.values[0]
        if (!batches.has(b)) batches.set(b, [])
        batches.get(b).push(r)
      })
      return Array.from(batches, ([name, rows]) => ({ name, rows })).sort((a, b) => Number(a.name) - Number(b.name))
    },
    shownBatches() { return this.batches.filter(b => !this.batch || b.name === this.batch) },
    cycles() { return this.options(14) },
    levels() { return this.options(15) },
    filtered() {
      const term = this.search.trim().toLowerCase()
      return this.model.feature.rows.filter(({ values: v }) => (!this.category || (v[0] === this.group && v[1] === this.category)) &&
        (!this.cycle || this.cycle === v[14]) && (!this.sensitivity || this.sensitivity === v[15]) &&
        [v[6], v[11]].some(text => (text || '').toLowerCase().includes(term)))
    },
    paged() { return this.filtered.slice((this.page - 1) * 10, this.page * 10) },
    defaults() { return this.processMode ? [this.batch] : [this.group, this.category] },
    detailCols() { return this.catalog.headers.map((_, i) => i).filter(i => this.processMode || ![0, 1, 4, 6, 10, 11, 13].includes(i)) },
    downstream() { return this.model.process.rows.filter(r => this.refs(r).includes(this.detail.values[1])) }
  },
  watch: { filtered() { this.page = 1 } },
  created() { this.load() },
  methods: {
    async load() {
      this.loading = true
      try { this.model = (await getCatalog()).data } catch { this.model = null } finally { this.loading = false }
    },
    clearDetail() { this.detail = null },
    options(i) { return [...new Set(this.model.feature.rows.map(r => r.values[i]).filter(Boolean))] },
    refs(r) { return (r.values[3] || '').split('\n').filter(Boolean) },
    processById(id) { return this.model.process.rows.find(r => r.values[1] === id) },
    processLabel(id) { const r = this.processById(id); return r ? r.values[2] + '（第 ' + r.values[0] + ' 批）' : id },
    openProcess(id) { this.detail = this.processById(id) },
    selectAll() { if (this.processMode) this.batch = ''; else this.choose('', '') },
    choose(group, category) { this.group = group; this.category = category },
    edit(mode, entry = null) { this.editing = entry; this.mode = mode },
    async saved(row) {
      const imported = this.mode === 'import'
      this.mode = ''
      if (row || imported) {
        this.search = this.cycle = this.sensitivity = ''
        if (this.processMode) this.batch = row ? row[0] : ''
        else { this.choose(row ? row[0] : '', row ? row[1] : ''); this.search = row ? row[6] : '' }
      }
      await this.load()
    }
  }
}
</script>
<style scoped>
.indicator-page {
  padding: 26px clamp(14px, 2.3vw, 38px);
  background: #f4f6fa;
  color: #192d41;
  min-height: calc(100vh - 84px);
  font-size: 14px
}

.indicator-page button,
.detail button {
  font: inherit;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 0
}

.heading,
.section-head,
.filters,
.actions,
.summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px
}

.heading,
.section-head {
  justify-content: space-between
}

h1 {
  font-size: 30px;
  letter-spacing: .03em;
  margin: 0
}

h2 {
  margin: 0;
  font-size: 18px
}

.modes {
  padding: 3px;
  background: #e3eaf0;
  border: 1px solid #cfdae3;
  border-radius: 8px
}

.modes button {
  padding: 7px 15px;
  border-radius: 5px
}

.modes [aria-pressed=true] {
  background: white;
  color: #046555;
  font-weight: 700;
  box-shadow: 0 1px 4px #20435626
}

.summary {
  margin: 13px 0 18px
}

.summary span {
  background: #e5edf2;
  border-radius: 5px;
  padding: 5px 11px
}

.summary b {
  margin-right: 4px
}

.tabs {
  border-bottom: 1px solid #cdd9df;
  margin-bottom: 16px
}

.tabs button {
  padding: 10px 18px;
  border-bottom: 3px solid transparent
}

.tabs .selected {
  border-color: #078778;
  color: #07675c;
  font-weight: bold
}

.layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px
}

.panel {
  background: white;
  border: 1px solid #dae2e8;
  border-radius: 10px;
  padding: 18px;
  min-width: 0
}

aside {
  align-self: start
}

aside h2 {
  margin-bottom: 12px
}

.node {
  width: 100%;
  text-align: left;
  border-radius: 5px;
  padding: 8px
}

.node small {
  float: right;
  color: #53687a
}

.node.child {
  padding-left: 22px
}

.node.active {
  background: #e0f3ee;
  color: #096855;
  font-weight: bold
}

summary {
  cursor: pointer;
  padding: 9px 0;
  font-weight: 600
}

.section-head span,
.detail small {
  color: #586e80
}

.filters,
.actions {
  margin: 15px 0
}

.filters .el-input {
  flex: 1;
  min-width: 185px
}

.filters .el-select {
  width: 140px
}

.actions {
  border-block: 1px solid #e0e8ed;
  padding: 11px 0
}

.actions button {
  border: 1px solid #bdccd6;
  padding: 7px 12px;
  border-radius: 5px
}

.actions .primary {
  background: #096b60;
  color: white;
  border-color: #096b60
}

.indicator-page .link,
.detail .link {
  color: #096b73;
  text-align: left;
  padding: 0
}

.link:hover {
  text-decoration: underline
}

.pill {
  background: #f0f3f5;
  border-radius: 4px;
  padding: 3px 7px
}

.high {
  background: #fff0de;
  color: #80501b
}

.el-pagination {
  text-align: right;
  margin-top: 14px
}

.batch h3 {
  border-left: 4px solid #188775;
  padding-left: 10px;
  font-size: 16px;
  margin: 18px 0 5px
}

article {
  padding: 12px 0;
  border-bottom: 1px solid #e0e8ed
}

.proc-name {
  font-weight: 600 !important
}

.edit {
  float: right
}

code,
.up {
  display: block;
  color: #576e80;
  font-size: 13px;
  margin-top: 5px;
  overflow-wrap: anywhere
}

.ref {
  margin-right: 6px
}

.detail {
  height: 100%;
  overflow: auto;
  padding: 0 24px 24px;
  color: #243d4e
}

.detail h3 {
  font-size: 16px
}

.detail p,
.detail dd {
  white-space: pre-line;
  line-height: 1.6
}

.detail dl {
  display: grid;
  grid-template-columns: minmax(85px, 28%) 1fr;
  gap: 10px;
  border-top: 1px solid #e1e8ed;
  padding-top: 16px
}

.detail dt {
  color: #617687
}

.detail dd {
  margin: 0;
  overflow-wrap: anywhere
}

@media(max-width:850px) {
  .layout {
    grid-template-columns: 1fr
  }

  aside {
    max-height: 210px;
    overflow: auto
  }

  .panel {
    padding: 13px
  }
}
</style>
