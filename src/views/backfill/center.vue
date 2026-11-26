<template>
  <div class="app-container bf">
    <h2>模板中心</h2>
    <el-table v-loading="loading" :data="topics" stripe empty-text="暂无已授权的启用模板">
      <el-table-column prop="name" label="模板" />
      <el-table-column prop="version" label="版本" width="70" />
      <el-table-column prop="frequency" label="频率" />
      <el-table-column label="首次提交"><template #default="{ row }">{{ row.stages.length ? '进入补录审核' : '直接生效' }}</template></el-table-column>
      <el-table-column label="操作" min-width="140">
        <template #default="{ row }"><el-button text @click="open(row)">导入数据</el-button></template>
      </el-table-column>
    </el-table>
    <el-dialog v-if="topic" :title="topic.name + ' · V' + topic.version" v-model="show" width="min(620px,96vw)" append-to-body>
      <el-form label-position="top">
        <el-form-item label="报送期间"><el-input v-model.trim="period" maxlength="40" placeholder="例如 2026-11" /></el-form-item>
        <el-form-item label="Excel 工作簿">
          <el-button text @click="download">下载当前版本模板</el-button>
          <p>从第 3 行开始填写，每批最多 {{ topic.import_max_rows }} 条有效数据，空行不计数。请保留前两行、列顺序和工作表名称。</p>
          <input :key="fileKey" type="file" accept=".xlsx" @change="file = $event.target.files[0]">
        </el-form-item>
        <p>{{ topic.stages.length ? '导入成功后，数据进入补录审核。' : '导入成功后，数据立即生效。' }}</p>
      </el-form>
      <template #footer><el-button type="primary" :loading="busy" :disabled="!period || !file" @click="upload">确认导入</el-button></template>
    </el-dialog>
  </div>
</template>
<script>
import { get, post } from '@/api/backfill'
import { saveAs } from 'file-saver'
export default {
  name: 'BackfillTemplateCenter',
  data: () => ({ topics: [], topic: null, show: false, file: null, fileKey: 0, period: '', loading: false, busy: false }),
  activated() { this.load() },
  created() { this.load() },
  methods: {
    async load() {
      if (this.loading) return
      this.loading = true
      try { this.topics = (await get('topics')).filter(t => t.can_enter) } finally { this.loading = false }
    },
    open(topic) {
      this.topic = topic
      this.period = ''
      this.file = null
      this.fileKey++
      this.show = true
    },
    async download() {
      const encoded = await get('templates/' + this.topic.id + '/file')
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
      saveAs(new Blob([bytes]), this.topic.name + '-V' + this.topic.version + '.xlsx')
    },
    async upload() {
      if (this.busy) return
      this.busy = true
      try {
        const form = new FormData()
        form.append('period', this.period)
        form.append('file', this.file)
        const result = await post('templates/' + this.topic.id + '/import', form)
        this.$message.success(result.msg)
        this.show = false
      } finally { this.busy = false }
    }
  }
}
</script>
