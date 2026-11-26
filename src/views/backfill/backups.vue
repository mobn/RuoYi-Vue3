<template>
  <div class="app-container bf">
    <h2>备份与恢复</h2>
    <el-form inline>
      <el-form-item label="自动备份">
        <el-select v-model="policy.cadence">
          <el-option v-for="v in ['关闭', '每日', '每周', '每月']" :key="v" :value="v" />
        </el-select>
      </el-form-item>
      <el-form-item><el-checkbox v-model="monthEnd">月末备份</el-checkbox></el-form-item>
      <el-form-item><el-button @click="schedule">保存计划</el-button></el-form-item>
    </el-form>
    <div class="bf-bar">
      <el-button type="primary" :loading="busy" @click="backup(false)">备份补录数据</el-button>
      <el-button v-if="isAdmin" :loading="busy" @click="backup(true)">备份全部数据库表</el-button>
      <el-button @click="load">刷新</el-button>
    </div>
    <p>
      最近自动备份 {{ policy.last_backup || '尚未执行' }} · 最近完整性检查
      {{ policy.last_check || '尚未执行' }}
    </p>
    <el-table :data="versions">
      <el-table-column prop="name" label="备份版本" min-width="220" />
      <el-table-column label="时间">
        <template #default="{ row }">{{ new Date(row.created).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column prop="bytes" label="字节数" />
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button text @click="inspect(row)">校验与恢复</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog title="恢复范围与结果" v-model="show" width="min(700px,96vw)" append-to-body>
      <p>{{ version }}</p>
      <el-alert
        :title="
          finished ? '恢复完成，已核对以下表的行数' : '已通过备份完整性检查。恢复会替换勾选表中的现有数据。'
        "
        :type="finished ? 'success' : 'warning'"
        :closable="false"
      />
      <el-checkbox
        v-if="!finished"
        :value="selected.length === Object.keys(preview).length"
        @change="selected = $event ? Object.keys(preview) : []"
      >
        全选
      </el-checkbox>
      <el-checkbox-group v-model="selected" :disabled="finished">
        <el-checkbox v-for="(n, t) in preview" :key="t" :value="t">{{ t }}（{{ n }} 行）</el-checkbox>
      </el-checkbox-group>
      <template #footer><el-button
        v-if="!finished"
       
        :disabled="!selected.length"
        :loading="busy"
        type="danger"
        @click="restore"
      >
        恢复所选表
      </el-button></template>
    </el-dialog>
  </div>
</template>
<script>
import { get, post } from '@/api/backfill'
export default {
  name: 'BackfillBackups',
  data: () => ({
    policy: {},
    monthEnd: false,
    versions: [],
    preview: {},
    selected: [],
    version: '',
    show: false,
    busy: false,
    finished: false
  }),
  computed: {
    isAdmin() {
      return Number(this.$store.state.user.id) === 1
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      const r = await get('backups')
      this.versions = r.versions
      this.policy = r.policy
      this.monthEnd = !!Number(r.policy.month_end)
    },
    async schedule() {
      await post('backups/policy', { cadence: this.policy.cadence, month_end: this.monthEnd })
      this.$message.success('计划已保存')
      this.load()
    },
    async backup(full) {
      this.busy = true
      try {
        await post('backups', { full })
        await this.load()
      } finally {
        this.busy = false
      }
    },
    async inspect(row) {
      this.version = row.name
      this.preview = await get('backups/' + row.name)
      this.selected = []
      this.finished = false
      this.show = true
    },
    async restore() {
      const { value } = await this.$prompt('输入完整备份版本号确认覆盖所选数据表', this.version)
      if (value !== this.version) return this.$message.warning('版本号不匹配')
      this.busy = true
      try {
        const r = await post('backups/' + this.version + '/restore', {
          confirm: value,
          tables: this.selected
        })
        this.preview = r.data
        this.finished = true
        await this.load()
      } finally {
        this.busy = false
      }
    }
  }
}
</script>
