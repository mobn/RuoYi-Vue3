<template>
  <div class="app-container template-center">
    <el-card shadow="never" class="hero-card">
      <div class="hero-card__title">模板中心</div>
      <div class="hero-card__desc">这里会自动展示所有启用中的模板。你在模板配置里新增一个模板并保存字段后，这里就会直接出现入口，不需要再改前后端代码。</div>
    </el-card>

    <el-empty v-if="!loading && !templateList.length" description="暂无可用模板，请先去模板配置页面新增模板。" />

    <el-row v-else :gutter="16">
      <el-col v-for="item in templateList" :key="item.templateId" :xs="24" :sm="12" :lg="8" class="template-card-col">
        <el-card shadow="hover" class="template-card">
          <div class="template-card__header">
            <div>
              <div class="template-card__title">{{ item.templateName }}</div>
              <div class="template-card__meta">{{ item.systemName || '未设置系统名称' }}</div>
            </div>
            <el-tag size="small" type="success">{{ item.fieldCount }} 个字段</el-tag>
          </div>
          <div class="template-card__desc">{{ item.templateDesc || '未填写模板说明' }}</div>
          <div class="template-card__footer">
            <el-tag size="small" effect="plain">{{ item.templateKey }}</el-tag>
            <el-button type="primary" size="small" @click="handleEntry(item)">进入填写</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { listActiveTemplate } from '@/api/work/template'

function safeJsonParse(text, fallback) {
  if (!text) {
    return fallback
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    return fallback
  }
}

export default {
  name: 'WorkTemplateCenter',
  data() {
    return {
      loading: false,
      templateList: []
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listActiveTemplate().then(response => {
        const list = Array.isArray(response.data) ? response.data : []
        this.templateList = list.map(item => ({
          ...item,
          fieldCount: safeJsonParse(item.schemaJson, []).length
        }))
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    handleEntry(row) {
      this.$router.push({
        path: '/work/templateEntry',
        query: {
          templateId: row.templateId
        }
      })
    }
  }
}
</script>

<style scoped>
.hero-card {
  margin-bottom: 18px;
  border-radius: 10px;
}

.hero-card__title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.hero-card__desc {
  color: #606266;
  line-height: 1.7;
}

.template-card-col {
  margin-bottom: 16px;
}

.template-card {
  min-height: 210px;
  border-radius: 12px;
}

.template-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.template-card__title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.template-card__meta {
  margin-top: 6px;
  color: #909399;
}

.template-card__desc {
  color: #606266;
  line-height: 1.7;
  min-height: 74px;
}

.template-card__footer {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
