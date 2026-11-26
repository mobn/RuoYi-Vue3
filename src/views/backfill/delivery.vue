<template>
  <div class="app-container bf">
    <h2>同步管理</h2>
    <el-tabs v-model="tab">
      <el-tab-pane label="传输任务" name="jobs">
        <div class="bf-bar">
          <el-select v-model="status" clearable placeholder="全部状态">
            <el-option v-for="s in states" :key="s" :label="label(s)" :value="s" />
          </el-select>
          <el-button @click="load">刷新</el-button>
        </div>
        <p>
          共 {{ jobs.length }} 次交付 · 已送达或已确认 {{ delivered }} 次 · 成功率
          {{ jobs.length ? ((100 * delivered) / jobs.length).toFixed(1) : 0 }}% · 已传输 {{ bytes }} 字节
        </p>
        <el-table :data="jobs.filter((j) => !status || j.status === status)" stripe>
          <el-table-column prop="target" label="目标" />
          <el-table-column prop="record_id" label="记录编号" show-overflow-tooltip />
          <el-table-column prop="edition" label="版本" width="64" />
          <el-table-column label="状态">
            <template #default="{ row }">{{ label(row.status) }}</template>
          </el-table-column>
          <el-table-column prop="attempts" label="次数" width="60" />
          <el-table-column prop="elapsed_ms" label="耗时(ms)" />
          <el-table-column label="速度(KB/s)">
            <template #default="{ row }">
              {{
                row.elapsed_ms && row.bytes_sent
                  ? ((row.bytes_sent * 1000) / 1024 / row.elapsed_ms).toFixed(1)
                  : '—'
              }}
            </template>
          </el-table-column>
          <el-table-column prop="finished" label="完成时间" min-width="145" />
          <el-table-column prop="detail" label="结果" show-overflow-tooltip />
          <el-table-column label="处理" width="170">
            <template #default="{ row }">
              <template v-if="row.status === 'FAILED'">
                <el-button text @click="act(row, 'retry')">重试</el-button>
                <el-button text @click="act(row, 'ignore')">忽略</el-button>
                <el-button v-if="row.edition > 1" type="text" @click="rollback(row)">回滚</el-button>
              </template>
              <el-button v-if="row.status === 'DELIVERED'" text @click="act(row, 'confirm')">
                核对回执
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="目标配置" name="targets">
        <el-button type="primary" @click="show = true">添加同步目标</el-button>
        <el-table :data="targets">
          <el-table-column prop="id" label="目标编号" show-overflow-tooltip />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="topic" label="主题" />
          <el-table-column prop="endpoint" label="地址" show-overflow-tooltip />
          <el-table-column prop="format" label="格式" />
          <el-table-column prop="contact" label="负责人" />
          <el-table-column label="启用">
            <template #default="{ row }">
              <el-switch :value="!!Number(row.enabled)" @change="toggle(row, $event)" />
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="同步日志" name="attempts">
        <el-table :data="attempts" stripe>
          <el-table-column prop="target" label="目标" />
          <el-table-column prop="delivery_id" label="交付编号" show-overflow-tooltip />
          <el-table-column prop="attempt" label="尝试序号" />
          <el-table-column prop="started" label="开始时间" />
          <el-table-column prop="elapsed_ms" label="耗时(ms)" />
          <el-table-column prop="bytes_sent" label="传输字节" />
          <el-table-column prop="detail" label="结果说明" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
    <el-dialog title="添加同步目标" v-model="show" width="min(560px,96vw)" append-to-body>
      <el-form label-position="top">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="主题">
          <el-select v-model="form.topic_id">
            <el-option v-for="t in topics" :key="t.id" :value="t.id" :label="t.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="接收地址">
          <el-input v-model="form.endpoint" placeholder="HTTPS、SFTP、FTPS、FTP 或 stream://队列名" />
        </el-form-item>
        <el-form-item label="格式">
          <el-radio-group v-model="form.format">
            <el-radio v-for="f in ['JSON', 'XML', 'CSV']" :key="f" :value="f">{{ f }}</el-radio>
          </el-radio-group>
          <el-checkbox v-model="form.compressed">GZIP 压缩</el-checkbox>
        </el-form-item>
        <el-form-item label="源字段到目标字段的映射">
          <el-input v-model="mapping" type="textarea" placeholder="{&quot;unit&quot;:&quot;orgName&quot;}" />
        </el-form-item>
        <el-form-item label="负责人账号"><el-input v-model="form.contact" /></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>
<script>
import { get, post, label } from '@/api/backfill'
export default {
  name: 'BackfillDelivery',
  data: () => ({
    jobs: [],
    attempts: [],
    targets: [],
    topics: [],
    status: '',
    tab: 'jobs',
    show: false,
    mapping: '{}',
    form: { name: '', topic_id: '', format: 'JSON', compressed: false, contact: '', endpoint: '' },
    timer: null
  }),
  computed: {
    states() {
      return [...new Set(this.jobs.map((j) => j.status))]
    },
    delivered() {
      return this.jobs.filter((j) => ['DELIVERED', 'CONFIRMED'].includes(j.status)).length
    },
    bytes() {
      return this.jobs.reduce((s, j) => s + Number(j.bytes_sent || 0), 0)
    }
  },
  async created() {
    await this.load()
    this.topics = await get('topics')
  },
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
    label,
    start() {
      clearInterval(this.timer)
      this.timer = setInterval(() => this.load(), 10000)
    },
    async load() {
      const r = await get('sync')
      this.jobs = r.jobs
      this.attempts = r.attempts
      this.targets = r.targets
    },
    async save() {
      let mapping
      try {
        mapping = JSON.parse(this.mapping)
      } catch (e) {
        return this.$message.warning('字段映射需要有效 JSON')
      }
      await post('sync/targets', { ...this.form, mapping })
      this.show = false
      await this.load()
    },
    async rollback(r) {
      const { value } = await this.$prompt('提交上一正式版本作为修正申请，请填写回滚原因')
      await post('sync/rollback/' + r.id, { reason: value })
      await this.load()
    },
    async toggle(r, enabled) {
      await post('sync/targets/' + r.id + '/toggle', { enabled })
      await this.load()
    },
    async act(row, action) {
      let checksum
      if (action === 'confirm') {
        checksum = (await this.$prompt('输入下游应用后计算的 SHA-256（Base64）')).value
      }
      if (action === 'ignore') await this.$confirm('忽略此版本后，后续版本可以继续发送。确认忽略？')
      await post('sync/jobs/' + row.id + '/' + action, { checksum })
      await this.load()
    }
  }
}
</script>
