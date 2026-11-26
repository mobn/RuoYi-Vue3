<!--  --><template>
  <div class="app-container online-doc-page">
    <aside class="doc-sidebar">
      <div class="doc-sidebar__header">
        <div class="doc-sidebar__title">在线文档</div>
        <el-button icon="Refresh" size="small" circle @click="getTemplateList" />
      </div>

      <el-input
        v-model="keyword"
        size="small"
        clearable
        prefix-icon="Search"
        placeholder="搜索文档"
        class="doc-sidebar__search"
      />

      <el-empty v-if="!loading && !filteredTemplateList.length" description="暂无可填写文档" />

      <div v-else v-loading="loading" class="doc-list">
        <button
          v-for="item in filteredTemplateList"
          :key="item.templateId"
          type="button"
          class="doc-list__item"
          :class="{ 'is-active': item.templateId === currentTemplateId }"
          @click="handleSelect(item)"
        >
          <span class="doc-list__name">{{ item.templateName }}</span>
          <span class="doc-list__meta">{{ item.systemName || item.templateKey }}</span>
        </button>
      </div>
    </aside>

    <main class="doc-main">
      <template-record-engine
        v-if="currentTemplateId"
        :key="currentTemplateId"
        page-title="在线文档填报"
        :permission-keys="permissionKeys"
      />
      <el-empty v-else description="请选择左侧文档开始填写" />
    </main>
  </div>
</template>

<script>
import { listActiveTemplate } from '@/api/work/template'
import TemplateRecordEngine from '@/views/work/template/components/TemplateRecordEngine'

export default {
  name: 'WorkOnlineDoc',
  components: {
    TemplateRecordEngine
  },
  data() {
    return {
      loading: false,
      keyword: '',
      templateList: [],
      permissionKeys: {
        add: ['work:template:center'],
        edit: ['work:template:center'],
        remove: ['work:template:center'],
        import: ['work:template:center'],
        export: ['work:template:center']
      }
    }
  },
  computed: {
    currentTemplateId() {
      const templateId = this.$route.query.templateId
      return templateId ? Number(templateId) : undefined
    },
    filteredTemplateList() {
      const value = this.keyword.trim().toLowerCase()
      if (!value) {
        return this.templateList
      }
      return this.templateList.filter(item => {
        return [item.templateName, item.templateKey, item.systemName]
          .filter(Boolean)
          .some(text => String(text).toLowerCase().includes(value))
      })
    }
  },
  created() {
    this.getTemplateList()
  },
  methods: {
    getTemplateList() {
      this.loading = true
      listActiveTemplate().then(response => {
        this.templateList = Array.isArray(response.data) ? response.data : []
        this.loading = false
        if (!this.currentTemplateId && this.templateList.length) {
          this.handleSelect(this.templateList[0], true)
        }
      }).catch(() => {
        this.loading = false
      })
    },
    handleSelect(row, replace = false) {
      const route = {
        path: '/work/onlineDoc',
        query: {
          templateId: row.templateId
        }
      }
      if (replace) {
        this.$router.replace(route)
      } else if (row.templateId !== this.currentTemplateId) {
        this.$router.push(route)
      }
    }
  }
}
</script>

<style scoped>
.online-doc-page {
  min-height: calc(100vh - 84px);
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 14px;
  background: #f5f7fa;
}

.doc-sidebar,
.doc-main {
  min-height: 0;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.doc-sidebar {
  padding: 14px;
}

.doc-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.doc-sidebar__title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.doc-sidebar__search {
  margin: 12px 0;
}

.doc-list {
  max-height: calc(100vh - 190px);
  overflow-y: auto;
}

.doc-list__item {
  width: 100%;
  min-height: 58px;
  padding: 9px 10px;
  margin-bottom: 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.doc-list__item:hover,
.doc-list__item.is-active {
  border-color: #409eff;
  background: #ecf5ff;
}

.doc-list__name,
.doc-list__meta {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-list__name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.doc-list__meta {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}

.doc-main {
  overflow: auto;
}

.doc-main ::v-deep .dynamic-template-page {
  padding: 14px;
}

@media (max-width: 768px) {
  .online-doc-page {
    grid-template-columns: 1fr;
  }

  .doc-list {
    max-height: 220px;
  }
}
</style>
