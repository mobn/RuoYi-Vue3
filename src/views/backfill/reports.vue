<template>
  <section class="app-container bf">
    <h2>统计与质量</h2>
    <div class="bf-bar">
      <el-select v-model="metric">
        <el-option v-for="m in metrics" :key="m.key" :label="m.name" :value="m.key" />
      </el-select>
      <el-select v-model="group">
        <el-option v-for="g in groups" :key="g.key" :value="g.key" :label="g.name" />
      </el-select>
      <el-select v-model="topic" clearable placeholder="全部主题">
        <el-option v-for="t in topics" :key="t" :value="t" />
      </el-select>
      <el-date-picker
        v-model="range"
        type="daterange"
        value-format="yyyy-MM-dd"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
      />
      <el-radio-group v-model="chartType" size="small">
        <el-radio-button label="bar">柱状</el-radio-button>
        <el-radio-button label="line">折线</el-radio-button>
        <el-radio-button label="pie">饼图</el-radio-button>
      </el-radio-group>
      <el-button @click="load">刷新</el-button>
      <el-button @click="download">导出报告</el-button>
    </div>
    <p>{{ description }}</p>
    <div ref="chart" class="chart" />
    <el-alert v-if="advice" :title="advice" type="info" :closable="false" />
    <div class="bf-bar">
      <h3>{{ selected || '全部分组' }} · 明细</h3>
      <el-button v-if="selected" text @click="selected = ''">清除下钻</el-button>
    </div>
    <el-table :data="details.slice((page - 1) * 25, page * 25)" stripe>
      <el-table-column prop="topic" label="主题" sortable />
      <el-table-column prop="period" label="报送期间" sortable />
      <el-table-column prop="person" label="责任人 / 审核人" sortable />
      <el-table-column prop="day" label="统计日期" sortable />
      <el-table-column prop="value" :label="unit" sortable />
      <el-table-column prop="detail" label="说明" min-width="180" />
    </el-table>
    <el-pagination
      v-model:current-page="page"
      :total="details.length"
      :page-size="25"
      layout="total,prev,pager,next"
    />
  </section>
</template>
<script>
import * as echarts from 'echarts'
import { get, downloadJson, label } from '@/api/backfill'
const stamp = (v) => (!v ? null : new Date(typeof v === 'string' ? v.replace(' ', 'T') : v).getTime())
const day = (v) => {
  const d = new Date(stamp(v))
  return [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-')
}
const minutes = (a, b) => Math.max(0, Math.round((stamp(b) - stamp(a)) / 600) / 100)
export default {
  name: 'BackfillReports',
  data: () => ({
    records: [],
    reviews: [],
    checks: [],
    range: [],
    topic: '',
    metric: 'volume',
    group: 'topic',
    chartType: 'bar',
    selected: '',
    page: 1,
    metrics: [
      { key: 'volume', name: '补录条数' },
      { key: 'entry', name: '补录完成用时' },
      { key: 'ontime', name: '按期提交率' },
      { key: 'review', name: '审核任务用时' },
      { key: 'flow', name: '审批流程总时长' },
      { key: 'quality', name: '数据错误率' }
    ],
    groups: [
      { key: 'topic', name: '按主题' },
      { key: 'day', name: '按日期趋势' },
      { key: 'person', name: '按人员' },
      { key: 'stage', name: '按环节' }
    ]
  }),
  computed: {
    topics() {
      return [...new Set(this.records.map((r) => r.topic))]
    },
    unit() {
      return { quality: '错误率 (%)', ontime: '按期提交率 (%)', volume: '条数' }[this.metric] || '分钟'
    },
    description() {
      return {
        volume: '按创建日期统计补录记录，每条记录计一次。',
        entry: '从创建任务到首次成功提交的历时，包含等待时间。',
        ontime: '按到期日期分组。分母为已到期任务，分子为截止日结束前首次成功提交的任务。',
        review: '从审核环节开放到作出决定的平均分钟数。',
        flow: '每轮流程从首个环节开放到最后一个决定的实际历时。',
        quality: '按提交时间统计，校验失败次数除以提交校验总次数。重复提交分别计数。'
      }[this.metric]
    },
    points() {
      const out = []
      const byId = new Map(this.records.map((r) => [r.id, r]))
      const add = (r, date, person, stage, value, detail) => {
        if (!date || !r) return
        const d = day(date)
        if (
          (this.topic && this.topic !== r.topic) ||
          (this.range && this.range.length && (d < this.range[0] || d > this.range[1]))
        ) {
          return
        }
        out.push({ id: r.id, topic: r.topic, period: r.period, person, stage, day: d, value, detail })
      }
      if (this.metric === 'quality') {
        for (const e of this.checks) {
          add(
            byId.get(e.record_id),
            e.created,
            e.actor,
            '提交校验',
            e.action === 'INVALID' ? 100 : 0,
            e.detail || '通过校验'
          )
        }
      } else if (['volume', 'entry', 'ontime'].includes(this.metric)) {
        const first = new Map()
        for (const e of this.checks) {
          if (e.action === 'SUBMIT' && !first.has(e.record_id)) first.set(e.record_id, e.created)
        }
        for (const r of this.records) {
          const submitted = first.get(r.id)
          if (this.metric === 'volume') add(r, r.created, r.owner, '填报', 1, label(r.status))
          else if (this.metric === 'entry' && submitted) { add(r, submitted, r.owner, '填报', minutes(r.created, submitted), label(r.status)) } else if (this.metric === 'ontime' && r.due_date && day(r.due_date) < day(Date.now())) {
            const timely = submitted && day(submitted) <= day(r.due_date)
            add(
              r,
              r.due_date,
              r.owner,
              '填报',
              timely ? 100 : 0,
              timely ? '按期提交' : submitted ? '逾期提交' : '尚未提交'
            )
          }
        }
      } else {
        const rounds = {}
        for (const t of this.reviews) {
          const r = byId.get(t.record_id)
          if (!r) continue
          ;(rounds[t.round_id] || (rounds[t.round_id] = [])).push(t)
          if (this.metric === 'review' && t.opened && ['APPROVE', 'REJECT', 'RETURN'].includes(t.status)) {
            add(
              r,
              t.finished,
              t.assignee,
              '第 ' + (t.stage_no + 1) + ' 环节',
              minutes(t.opened, t.finished),
              label(t.status)
            )
          }
        }
        if (this.metric === 'flow') {
          Object.values(rounds).forEach((tasks) => {
            if (tasks.some((t) => ['PENDING', 'WAITING'].includes(t.status))) return
            const opened = tasks.filter((t) => t.opened).map((t) => stamp(t.opened))
            const closed = tasks
              .filter((t) => ['APPROVE', 'REJECT', 'RETURN'].includes(t.status))
              .map((t) => stamp(t.finished))
            if (opened.length && closed.length) {
              const r = byId.get(tasks[0].record_id)
              const end = Math.max(...closed)
              add(r, end, r.owner, '完整流程', minutes(Math.min(...opened), end), '流程 ' + tasks[0].round_id)
            }
          })
        }
      }
      return out
    },
    series() {
      const groups = new Map()
      for (const p of this.points) {
        const k = p[this.group]
        const g = groups.get(k) || { total: 0, count: 0 }
        g.total += p.value
        g.count++
        groups.set(k, g)
      }
      return [...groups]
        .map(([name, g]) => ({
          name,
          value: +(this.metric === 'volume' ? g.total : g.total / g.count).toFixed(2)
        }))
        .sort((a, b) => (this.group === 'day' ? a.name.localeCompare(b.name) : b.value - a.value))
    },
    details() {
      return this.points.filter((p) => !this.selected || p[this.group] === this.selected)
    },
    advice() {
      if (!this.series.length) return ''
      if (this.metric === 'quality') {
        const issue = this.points.filter((p) => p.value > 0).map((p) => p.detail)[0]
        return issue
          ? '优先核查字段：' + issue + '。可在主题中调整选项、默认值或范围。'
          : '当前范围的提交校验均已通过。'
      }
      if (this.metric === 'review' && this.group === 'stage') {
        const slow = [...this.series].sort((a, b) => b.value - a.value)[0]
        return slow.name + '平均耗时最长（' + slow.value + ' 分钟），可检查该环节待办量及可用审核人。'
      }
      return ''
    }
  },
  watch: {
    series() {
      this.selected = ''
      this.draw()
    },
    chartType() {
      this.draw()
    },
    details() {
      this.page = 1
    }
  },
  mounted() {
    this.plot = echarts.init(this.$refs.chart)
    this.plot.on('click', (e) => {
      this.selected = e.name
    })
    window.addEventListener('resize', this.resize)
    this.load()
  },
  activated() {
    this.$nextTick(this.resize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resize)
    if (this.plot) this.plot.dispose()
  },
  methods: {
    async load() {
      const r = await get('reports')
      this.records = r.records
      this.reviews = r.reviews
      this.checks = r.checks
    },
    resize() {
      if (this.plot) this.plot.resize()
    },
    draw() {
      if (!this.plot) return
      const series = this.series
      const pie = this.chartType === 'pie'
      this.plot.setOption(
        {
          color: ['#247596', '#57a694', '#d49b46'],
          tooltip: { trigger: pie ? 'item' : 'axis' },
          grid: { containLabel: true, left: 15, right: 25 },
          xAxis: pie ? undefined : { type: 'category', data: series.map((s) => s.name) },
          yAxis: pie ? undefined : { type: 'value', name: this.unit },
          series: [{ type: this.chartType, data: series, barMaxWidth: 46 }]
        },
        true
      )
    },
    download() {
      downloadJson('补录统计与质量报告', { 指标: this.description, 分组: this.series, 明细: this.details })
    }
  }
}
</script>
<style scoped>
.chart {
  width: 100%;
  height: 330px;
}
.bf p {
  color: #5d6e7b;
}
</style>
