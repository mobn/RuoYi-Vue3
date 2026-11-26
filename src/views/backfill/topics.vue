<template>
  <div class="app-container bf">
    <h2>模板配置</h2>
    <el-button type="primary" icon="Plus" @click="edit()">新建模板</el-button>
    <el-button icon="Refresh" @click="refresh">刷新模板</el-button>
    <el-table :data="rows" stripe>
      <el-table-column prop="name" label="主题" />
      <el-table-column prop="frequency" label="频率" />
      <el-table-column prop="sensitivity" label="敏感级别" />
      <el-table-column prop="version" label="版本" />
      <el-table-column label="操作">
        <template #default="{ row }"><el-button text @click="edit(row)">配置</el-button></template>
      </el-table-column>
    </el-table>
    <template-requests :key="revision" @revise="edit" />
    <el-dialog title="模板配置" v-model="show" width="min(820px,96vw)" append-to-body>
      <el-form v-if="form" label-position="top">
        <el-form-item label="主题名称"><el-input v-model="form.name" maxlength="100" /></el-form-item>
        <el-form-item label="报送频率">
          <el-select v-model="form.frequency">
            <el-option v-for="f in ['日报', '周报', '月报', '季报', '年报', '临时']" :key="f" :value="f" />
          </el-select>
        </el-form-item>
        <el-form-item label="敏感级别">
          <el-radio-group v-model="form.sensitivity">
            <el-radio-button v-for="s in ['一般', '关键', '敏感']" :key="s" :label="s" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="可录入和导入的角色">
          <el-select v-model="form.entry_acl.roles" multiple filterable>
            <el-option v-for="r in roles" :key="r.role_key" :value="r.role_key" :label="r.role_name" />
          </el-select>
        </el-form-item>
        <el-form-item label="额外授权人员（与角色任选其一即可获得模板授权）">
          <el-select v-model="form.entry_acl.users" multiple filterable>
            <el-option v-for="u in users" :key="u.user_name" :value="u.user_name" :label="u.nick_name + '（' + u.user_name + '）'" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板启用审批人">
          <el-select v-model="form.reviewer" filterable placeholder="选择有补录审核权限的其他人员">
            <el-option v-for="u in reviewers" :key="u.user_name" :value="u.user_name" :label="u.nick_name + '（' + u.user_name + '）'" />
          </el-select>
        </el-form-item>
        <el-form-item label="每期自动派发给（账号，逗号分隔）">
          <el-input v-model="ownerList" placeholder="留空时手工建任务" />
        </el-form-item>
        <el-form-item label="从周期首日算起的截止天数">
          <el-input-number v-model="form.due_days" :min="0" :max="366" />
        </el-form-item>
        <h3>录入字段</h3>
        <div v-for="(f, i) in form.fields" :key="i" class="bf-field">
          <el-input v-model="f.key" placeholder="英文编码" />
          <el-input v-model="f.label" placeholder="字段名称" />
          <el-select v-model="f.type">
            <el-option v-for="(n, k) in types" :key="k" :label="n" :value="k" />
          </el-select>
          <el-checkbox v-model="f.required">必填</el-checkbox>
          <el-button text @click="form.fields.splice(i, 1)">移除</el-button>
          <el-input v-model="f.defaultValue" placeholder="清洗缺省值（可选）" />
          <template v-if="f.type === 'number'">
            <el-input v-model.number="f.min" type="number" placeholder="最小值" />
            <el-input v-model.number="f.max" type="number" placeholder="最大值" />
          </template>
          <el-select v-if="f.type === 'number'" v-model="f.gteField" clearable placeholder="须大于等于字段">
            <el-option
              v-for="p in form.fields.filter((p) => p.type === 'number' && p.key && p.key !== f.key)"
              :key="p.key"
              :value="p.key"
              :label="p.label || p.key"
            />
          </el-select>
          <el-select
            v-if="f.type === 'select'"
            v-model="f.options"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入选项后回车"
          />
        </div>
        <el-button icon="Plus" @click="field">添加字段</el-button>
        <el-form-item label="新录入或导入的数据需要审批"><el-switch v-model="form.review_required" /></el-form-item>
        <template v-if="form.review_required">
          <h3>数据审核顺序</h3>
          <p>按环节依次审核。同一环节所选角色均需通过，每个角色自动分配给待办较少的审核人。</p>
          <el-form-item v-for="(stage, i) in form.stages" :key="i" :label="'第 ' + (i + 1) + ' 环节'">
            <el-select v-model="form.stages[i]" multiple>
              <el-option v-for="r in roles" :key="r.role_key" :value="r.role_key" :label="r.role_name" />
            </el-select>
            <el-button text @click="form.stages.splice(i, 1)">移除此环节</el-button>
          </el-form-item>
          <el-button @click="form.stages.push([])">添加审核环节</el-button>
        </template>
      </el-form>
      <template #footer><el-button type="primary" :loading="busy" @click="save">提交模板审批</el-button></template>
    </el-dialog>
  </div>
</template>
<script>
import { get, post, copy } from '@/api/backfill'
import TemplateRequests from './TemplateRequests'
export default {
  name: 'BackfillTopics',
  components: { TemplateRequests },
  data: () => ({
    rows: [],
    roles: [],
    users: [],
    revision: 0,
    form: null,
    show: false,
    busy: false,
    types: { text: '文本', number: '数值', date: '日期', select: '枚举' }
  }),
  computed: {
    reviewers() {
      return this.users.filter(u => Number(u.can_review) && u.user_name !== this.$store.getters.name)
    },
    ownerList: {
      get() {
        return this.form.owners || ''
      },
      set(v) {
        this.form['owners'] = v
      }
    }
  },
  async created() {
    [this.rows, this.roles, this.users] = await Promise.all([get('topics'), get('roles'), get('template-users')])
  },
  methods: {
    async refresh() {
      this.rows = await get('topics')
      this.revision++
    },
    edit(row) {
      this.form = row
        ? copy(row)
        : { name: '', frequency: '月报', sensitivity: '一般', entry_role: '', fields: [], stages: [] }
      this.form = { ...this.form,
        owners: Array.isArray(this.form.owners) ? this.form.owners.join(',') : this.form.owners,
        entry_acl: this.form.entry_acl || { roles: this.form.entry_role ? [this.form.entry_role] : [], users: [] },
        review_required: this.form.stages.length > 0
      }
      this.show = true
    },
    field() {
      this.form.fields.push({ key: '', label: '', type: 'text', required: false, options: [] })
    },
    async save() {
      this.busy = true
      try {
        const body = copy(this.form)
        if (!body.review_required) body.stages = []
        if (!body.reviewer || !(body.entry_acl.roles.length + body.entry_acl.users.length)) {
          return this.$message.warning('请选择模板审批人，并至少授权一个角色或人员')
        }
        body.owners = (body.owners || '')
          .split(/[,，]/)
          .map((n) => n.trim())
          .filter(Boolean)
        body.fields.forEach((f) => {
          if (!f.gteField || f.type !== 'number') delete f.gteField
          for (const k of ['min', 'max']) if (f[k] === '' || f.type !== 'number') delete f[k]
        })
        await post('topics', body)
        this.$message.success('已提交模板审批')
        await this.refresh()
        this.show = false
      } finally {
        this.busy = false
      }
    }
  }
}
</script>
<style scoped>
.bf-field {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.bf-field > .el-input,
.bf-field > .el-select {
  width: 145px;
}
</style>
