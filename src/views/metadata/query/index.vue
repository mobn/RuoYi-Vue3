<template>
  <div class="app-container metadata-query-page">
    <el-card shadow="never" class="hero-card">
      <div class="hero-head">
        <div>
          <div class="hero-title">元数据查询</div>
          <div class="hero-desc">在一个页面中集中查看并检索三份元数据 Excel 的入库内容。</div>
        </div>
        <el-tag size="small" type="success">单页集中查看</el-tag>
      </div>
      <div class="hero-files">
        <span>来源一：FDM_公共模型数据字典_20260123_1769137650331.xls</span>
        <span>来源二：元数据汇总_全量_updated.xlsx</span>
        <span>来源三：数仓模型数据字典.xlsx</span>
      </div>
    </el-card>

    <el-card shadow="never" class="tab-card">
      <el-tabs v-model="mainTab" @tab-click="handleMainTabChange">
        <el-tab-pane label="FDM 公共模型数据字典" name="fdm">
          <div class="source-note">当前来源文件：FDM_公共模型数据字典_20260123_1769137650331.xls</div>
          <el-tabs v-model="fdmTab" class="inner-tabs" @tab-click="handleFdmTabChange">
            <el-tab-pane label="数据字典调整说明" name="fdmChange" />
            <el-tab-pane label="FDM_DDL_20260123" name="fdmDdl" />
            <el-tab-pane label="TAB_LIST" name="fdmTabList" />
            <el-tab-pane label="选项" name="fdmOption" />
          </el-tabs>
        </el-tab-pane>
        <el-tab-pane label="元数据汇总" name="summary">
          <div class="source-note">当前来源文件：元数据汇总_全量_updated.xlsx</div>
        </el-tab-pane>
        <el-tab-pane label="数仓模型数据字典" name="warehouse">
          <div class="source-note">当前来源文件：数仓模型数据字典.xlsx</div>
          <el-tabs v-model="warehouseTab" class="inner-tabs" @tab-click="handleWarehouseTabChange">
            <el-tab-pane label="主题" name="dwTheme" />
            <el-tab-pane label="表清单" name="dwTable" />
            <el-tab-pane label="数据字典" name="dwDict" />
          </el-tabs>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-card shadow="never" class="dataset-card">
      <template #header><div class="dataset-header">
        <div>
          <span class="dataset-title">{{ currentConfig.label }}</span>
          <span class="dataset-desc">{{ currentConfig.description }}</span>
        </div>
        <el-tag size="small" type="info">{{ currentState.total || 0 }} 条</el-tag>
      </div></template>

      <el-form :model="currentState.queryParams" size="small" :inline="true" label-width="96px" class="query-form">
        <el-form-item v-for="field in currentConfig.searchFields" :key="field.prop" :label="field.label">
          <el-input
            v-model="currentState.queryParams[field.prop]"
            :placeholder="field.placeholder"
            clearable
            style="width: 220px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="currentState.queryParams.keyword"
            placeholder="支持多字段模糊搜索"
            clearable
            style="width: 260px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="currentState.loading" :data="currentState.list" border stripe class="metadata-table">
        <el-table-column
          v-for="column in currentConfig.columns"
          :key="column.prop"
          :label="column.label"
          :prop="column.prop"
          :width="column.width"
          :min-width="column.minWidth || 140"
          :show-overflow-tooltip="column.showTooltip !== false"
        >
          <template #default="scope">
            <span>{{ formatCellValue(scope.row[column.prop]) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="currentState.total > 0"
        :total="currentState.total"
        :page="currentState.queryParams.pageNum"
        :limit="currentState.queryParams.pageSize"
        @pagination="handlePagination"
      />
    </el-card>
  </div>
</template>

<script>
import {
  listFdmDictChange,
  listFdmDdl,
  listFdmTabList,
  listFdmOptionList,
  listMetadataSummary,
  listDwTheme,
  listDwTable,
  listDwModelDict
} from '@/api/metadata/query'

const DATASET_CONFIG = {
  fdmChange: {
    label: '数据字典调整说明',
    description: '适合查看 FDM 模型的字段变更前后差异。',
    api: listFdmDictChange,
    searchFields: [
      { prop: 'modelEnName', label: '模型英文名', placeholder: '请输入模型英文名' },
      { prop: 'modelCnName', label: '模型中文名', placeholder: '请输入模型中文名' },
      { prop: 'adjustType', label: '调整类型', placeholder: '请输入调整类型' }
    ],
    columns: [
      { prop: 'sourceRowNum', label: '行号', width: 80 },
      { prop: 'registerDate', label: '登记日期', width: 120 },
      { prop: 'modelEnName', label: '模型英文名', minWidth: 220 },
      { prop: 'modelCnName', label: '模型中文名', minWidth: 180 },
      { prop: 'adjustType', label: '调整类型', minWidth: 140 },
      { prop: 'afterFieldCn', label: '调整后字段中文', minWidth: 180 },
      { prop: 'afterFieldEn', label: '调整后字段英文', minWidth: 180 },
      { prop: 'afterFieldTypeStandard', label: '调整后字段类型标准', minWidth: 160 },
      { prop: 'afterActualFieldType', label: '调整后实际字段类型', minWidth: 160 },
      { prop: 'afterStandardType', label: '调整后标准类型', minWidth: 140 },
      { prop: 'afterCodeRef', label: '调整后挂码值', minWidth: 160 },
      { prop: 'afterEnumValue', label: '调整后枚举值', minWidth: 220 },
      { prop: 'beforeFieldCn', label: '调整前字段中文', minWidth: 180 },
      { prop: 'beforeFieldEn', label: '调整前字段英文', minWidth: 180 },
      { prop: 'beforeFieldTypeStandard', label: '调整前字段类型标准', minWidth: 160 },
      { prop: 'beforeActualFieldType', label: '调整前实际字段类型', minWidth: 160 },
      { prop: 'beforeStandardType', label: '调整前标准类型', minWidth: 140 },
      { prop: 'beforeCodeRef', label: '调整前挂码值', minWidth: 160 },
      { prop: 'beforeEnumValue', label: '调整前枚举值', minWidth: 220 },
      { prop: 'remark', label: '备注', minWidth: 180 }
    ]
  },
  fdmDdl: {
    label: 'FDM_DDL_20260123',
    description: '适合按主题、模型、字段检索 FDM DDL 明细。',
    api: listFdmDdl,
    searchFields: [
      { prop: 'subjectName', label: '主题', placeholder: '请输入主题' },
      { prop: 'modelEnName', label: '模型英文名', placeholder: '请输入模型英文名' },
      { prop: 'fieldEnName', label: '字段英文名', placeholder: '请输入字段英文名' }
    ],
    columns: [
      { prop: 'sourceRowNum', label: '行号', width: 80 },
      { prop: 'pkValue', label: 'PK', minWidth: 260 },
      { prop: 'subjectName', label: '主题', minWidth: 120 },
      { prop: 'modelEnName', label: '模型英文名', minWidth: 220 },
      { prop: 'modelCnName', label: '模型中文名', minWidth: 180 },
      { prop: 'seqNo', label: '序号', width: 90 },
      { prop: 'fieldCnName', label: '字段中文名', minWidth: 180 },
      { prop: 'fieldEnName', label: '字段英文名', minWidth: 180 },
      { prop: 'fieldTypeStandard', label: '字段类型标准', minWidth: 150 },
      { prop: 'actualFieldType', label: '实际字段类型', minWidth: 150 },
      { prop: 'standardType', label: '标准类型', minWidth: 140 },
      { prop: 'codeRef', label: '挂码值', minWidth: 150 },
      { prop: 'codeEnum', label: '码值枚举', minWidth: 220 }
    ]
  },
  fdmTabList: {
    label: 'TAB_LIST',
    description: '适合查看模型与主题编号、数据域主题的对应关系。',
    api: listFdmTabList,
    searchFields: [
      { prop: 'modelEnName', label: '模型英文名', placeholder: '请输入模型英文名' },
      { prop: 'subjectCode', label: '主题编号', placeholder: '请输入主题编号' },
      { prop: 'dataDomainSubject', label: '数据域主题', placeholder: '请输入数据域主题' }
    ],
    columns: [
      { prop: 'sourceRowNum', label: '行号', width: 80 },
      { prop: 'modelEnName', label: '模型英文名', minWidth: 240 },
      { prop: 'subjectCode', label: '主题编号', minWidth: 120 },
      { prop: 'dataDomainSubject', label: '数据域主题', minWidth: 160 }
    ]
  },
  fdmOption: {
    label: '选项',
    description: '适合查看调整类型、序号和主题编号映射。',
    api: listFdmOptionList,
    searchFields: [
      { prop: 'adjustType', label: '调整类型', placeholder: '请输入调整类型' },
      { prop: 'seqNo', label: '序号', placeholder: '请输入序号' },
      { prop: 'subjectCode', label: '主题编号', placeholder: '请输入主题编号' }
    ],
    columns: [
      { prop: 'sourceRowNum', label: '行号', width: 80 },
      { prop: 'adjustType', label: '调整类型', minWidth: 200 },
      { prop: 'seqNo', label: '序号', minWidth: 140 },
      { prop: 'subjectCode', label: '主题编号', minWidth: 120 }
    ]
  },
  summary: {
    label: '元数据汇总',
    description: '适合按系统、表、字段维度检索全量元数据。',
    api: listMetadataSummary,
    searchFields: [
      { prop: 'systemEnName', label: '系统英文名', placeholder: '请输入系统英文名' },
      { prop: 'tableEnName', label: '表英文名', placeholder: '请输入表英文名' },
      { prop: 'fieldEnName', label: '字段英文名', placeholder: '请输入字段英文名' }
    ],
    columns: [
      { prop: 'sourceRowNum', label: '行号', width: 90 },
      { prop: 'systemEnName', label: '系统英文名', minWidth: 140 },
      { prop: 'systemCnName', label: '系统中文名', minWidth: 140 },
      { prop: 'tableEnName', label: '表英文名', minWidth: 180 },
      { prop: 'tableCnName', label: '表中文名', minWidth: 180 },
      { prop: 'fieldEnName', label: '字段英文名', minWidth: 180 },
      { prop: 'fieldCnName', label: '字段中文名', minWidth: 180 },
      { prop: 'fieldDataType', label: '字段数据类型', minWidth: 150 },
      { prop: 'fieldLength', label: '字段长度', minWidth: 120 },
      { prop: 'isPrimaryKey', label: '是否主键', minWidth: 100 },
      { prop: 'codeInfo', label: '代码信息', minWidth: 220 },
      { prop: 'codeValue', label: '代码值', minWidth: 220 },
      { prop: 'remark', label: '备注', minWidth: 180 }
    ]
  },
  dwTheme: {
    label: '主题',
    description: '适合按 schema、主题名称、主题英文名检索数仓主题定义。',
    api: listDwTheme,
    searchFields: [
      { prop: 'schemaCode', label: 'Schema', placeholder: '请输入 Schema' },
      { prop: 'themeName', label: '主题名称', placeholder: '请输入主题名称' },
      { prop: 'themeEnglishName', label: '主题英文名', placeholder: '请输入主题英文名' }
    ],
    columns: [
      { prop: 'sourceRowNum', label: '行号', width: 80 },
      { prop: 'schemaCode', label: 'Schema', minWidth: 100 },
      { prop: 'dataLevel', label: '数据层级', minWidth: 120 },
      { prop: 'themeName', label: '主题名称', minWidth: 180 },
      { prop: 'themeDesc', label: '主题描述', minWidth: 320 },
      { prop: 'dataSource', label: '数据来源', minWidth: 120 },
      { prop: 'themeAbbr', label: '主题缩写', minWidth: 120 },
      { prop: 'warehouseSource', label: '仓库来源', minWidth: 120 },
      { prop: 'themeCode', label: '主题代码', minWidth: 100 },
      { prop: 'themeEnglishName', label: '主题英文名', minWidth: 200 },
      { prop: 'themeOrderCode', label: '主题序号', minWidth: 100 },
      { prop: 'themeShortName', label: '主题简称', minWidth: 120 }
    ]
  },
  dwTable: {
    label: '表清单',
    description: '适合按主题、表中文名、表英文名、负责人检索数仓表清单。',
    api: listDwTable,
    searchFields: [
      { prop: 'subjectName', label: '归属主题', placeholder: '请输入归属主题' },
      { prop: 'tableCnName', label: '表中文名', placeholder: '请输入表中文名' },
      { prop: 'tableEnName', label: '表英文名', placeholder: '请输入表英文名' },
      { prop: 'owner', label: '负责人', placeholder: '请输入负责人' }
    ],
    columns: [
      { prop: 'sourceRowNum', label: '行号', width: 80 },
      { prop: 'businessSource', label: '业务源', minWidth: 110 },
      { prop: 'tableCnName', label: '表中文名', minWidth: 200 },
      { prop: 'tableOrderNum', label: '表序号', minWidth: 100 },
      { prop: 'subjectName', label: '归属主题', minWidth: 150 },
      { prop: 'tableEnName', label: '表英文名', minWidth: 240 },
      { prop: 'tableDesc', label: '表描述', minWidth: 260 },
      { prop: 'subjectDataSource', label: '主题数据来源', minWidth: 260 },
      { prop: 'implementType', label: '实现方式', minWidth: 110 },
      { prop: 'commonFlag', label: '常用标志', minWidth: 100 },
      { prop: 'remark', label: '备注', minWidth: 200 },
      { prop: 'owner', label: '负责人', minWidth: 100 },
      { prop: 'planFinishDate', label: '计划完成时间', minWidth: 130 },
      { prop: 'actualFinishDate', label: '实际完成时间', minWidth: 130 },
      { prop: 'checkTableEnName', label: '校验表英文名', minWidth: 220 },
      { prop: 'checkedFlag', label: '已检查', minWidth: 90 }
    ]
  },
  dwDict: {
    label: '数据字典',
    description: '适合按主题、表、字段检索数仓模型字段定义。',
    api: listDwModelDict,
    searchFields: [
      { prop: 'subjectName', label: '归属主题', placeholder: '请输入归属主题' },
      { prop: 'tableEnName', label: '表英文名', placeholder: '请输入表英文名' },
      { prop: 'fieldEnName', label: '字段英文名', placeholder: '请输入字段英文名' },
      { prop: 'fieldCnName', label: '字段中文名', placeholder: '请输入字段中文名' }
    ],
    columns: [
      { prop: 'sourceRowNum', label: '行号', width: 80 },
      { prop: 'tableCnName', label: '表中文名', minWidth: 180 },
      { prop: 'tableOrderNum', label: '表序号', minWidth: 100 },
      { prop: 'subjectName', label: '归属主题', minWidth: 150 },
      { prop: 'tableEnName', label: '表英文名', minWidth: 240 },
      { prop: 'fieldCnName', label: '字段中文名', minWidth: 180 },
      { prop: 'fieldEnName', label: '字段英文名', minWidth: 180 },
      { prop: 'fieldType', label: '字段类型', minWidth: 120 },
      { prop: 'fieldOrderNum', label: '字段序号', minWidth: 100 },
      { prop: 'pkFlag', label: 'PK标志', minWidth: 90 },
      { prop: 'codeNo', label: '代码编号', minWidth: 100 },
      { prop: 'distributionKeyFlag', label: '是否分布键', minWidth: 110 },
      { prop: 'remark', label: '备注', minWidth: 180 },
      { prop: 'caliberDesc', label: '口径说明', minWidth: 260 }
    ]
  }
}

function createQueryParams(config) {
  const queryParams = {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined
  }
  config.searchFields.forEach(field => {
    queryParams[field.prop] = undefined
  })
  return queryParams
}

function createDatasetStates() {
  const states = {}
  Object.keys(DATASET_CONFIG).forEach(key => {
    states[key] = {
      loading: false,
      loaded: false,
      total: 0,
      list: [],
      queryParams: createQueryParams(DATASET_CONFIG[key])
    }
  })
  return states
}

export default {
  name: 'MetadataQuery',
  data() {
    return {
      mainTab: 'fdm',
      fdmTab: 'fdmChange',
      warehouseTab: 'dwTheme',
      datasetStates: createDatasetStates()
    }
  },
  computed: {
    currentDatasetKey() {
      if (this.mainTab === 'fdm') {
        return this.fdmTab
      }
      if (this.mainTab === 'warehouse') {
        return this.warehouseTab
      }
      return 'summary'
    },
    currentConfig() {
      return DATASET_CONFIG[this.currentDatasetKey]
    },
    currentState() {
      return this.datasetStates[this.currentDatasetKey]
    }
  },
  created() {
    this.ensureLoaded(this.currentDatasetKey)
  },
  methods: {
    ensureLoaded(datasetKey) {
      const state = this.datasetStates[datasetKey]
      if (!state.loaded) {
        this.getList(datasetKey)
      }
    },
    getList(datasetKey = this.currentDatasetKey) {
      const config = DATASET_CONFIG[datasetKey]
      const state = this.datasetStates[datasetKey]
      state.loading = true
      config.api({ ...state.queryParams }).then(response => {
        state.list = response.rows
        state.total = response.total
        state.loaded = true
        state.loading = false
      }).catch(() => {
        state.loading = false
      })
    },
    handleMainTabChange() {
      this.ensureLoaded(this.currentDatasetKey)
    },
    handleFdmTabChange() {
      this.ensureLoaded(this.currentDatasetKey)
    },
    handleWarehouseTabChange() {
      this.ensureLoaded(this.currentDatasetKey)
    },
    handleQuery() {
      this.currentState.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      const datasetKey = this.currentDatasetKey
      this.datasetStates[datasetKey].queryParams = createQueryParams(DATASET_CONFIG[datasetKey])
      this.getList(datasetKey)
    },
    handlePagination({ page, limit }) {
      this.currentState.queryParams.pageNum = page
      this.currentState.queryParams.pageSize = limit
      this.getList()
    },
    formatCellValue(value) {
      if (value === null || value === undefined || value === '') {
        return '-'
      }
      return value
    }
  }
}
</script>

<style scoped>
.metadata-query-page {
  background: linear-gradient(180deg, #f4f8f7 0%, #ffffff 220px);
}

.hero-card,
.tab-card,
.dataset-card {
  margin-bottom: 16px;
}

.hero-head,
.dataset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hero-title {
  font-size: 22px;
  font-weight: 600;
  color: #1f2f3d;
  margin-bottom: 8px;
}

.hero-desc {
  color: #60707f;
  line-height: 1.6;
}

.hero-files {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-top: 16px;
  color: #4f6475;
  font-size: 13px;
}

.source-note {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #f8fbfa;
  border: 1px solid #dfe9e5;
  border-radius: 6px;
  color: #5a6b79;
}

.inner-tabs {
  margin-top: 4px;
}

.dataset-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
  margin-right: 12px;
}

.dataset-desc {
  font-size: 13px;
  color: #6b7b8a;
}

.query-form {
  margin-bottom: 16px;
}

.metadata-table {
  width: 100%;
}

@media (max-width: 768px) {
  .hero-head,
  .dataset-header {
    display: block;
  }

  .hero-head .el-tag,
  .dataset-header .el-tag {
    margin-top: 12px;
  }

  .hero-files {
    display: block;
  }

  .hero-files span {
    display: block;
    margin-bottom: 8px;
  }
}
</style>
