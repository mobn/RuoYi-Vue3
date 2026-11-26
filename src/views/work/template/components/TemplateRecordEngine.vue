<template>
  <div class="app-container dynamic-template-page">
    <el-empty v-if="!loading && !template" description="未找到可用模板，请先在模板配置中创建模板。" />

    <template v-else>
      <el-card v-if="showSummary && template" shadow="never" class="template-summary">
        <template #header><div class="template-summary__header">
          <div>
            <div class="template-summary__title">{{ resolvedPageTitle }}</div>
            <div class="template-summary__meta">
              <span>模板标识：{{ template.templateKey }}</span>
              <span v-if="template.systemName">所属系统：{{ template.systemName }}</span>
            </div>
          </div>
          <el-tag size="small" :type="template.status === '0' ? 'success' : 'info'">
            {{ template.status === '0' ? '启用中' : '已停用' }}
          </el-tag>
        </div></template>
        <div class="template-summary__desc">
          {{ template.templateDesc || '字段和页面结构均来自模板配置，你后续新增模板或变更字段后会自动体现在这里。' }}
        </div>
      </el-card>

      <el-alert
        v-if="template && !fieldList.length"
        title="当前模板还没有配置字段，请先在模板配置页面添加字段后再进行填写。"
        type="warning"
        :closable="false"
        class="mb12"
      />

      <el-form
        v-if="template && searchFields.length && showSearch"
        ref="queryForm"
        :model="searchForm"
        size="small"
        :inline="true"
        label-width="110px"
        class="search-form"
      >
        <el-form-item
          v-for="field in searchFields"
          :key="'search_' + field.fieldName"
          :label="field.fieldLabel"
        >
          <template v-if="isSingleOptionField(field) || isRadioField(field)">
            <el-select v-model="searchForm[field.fieldName]" clearable filterable style="width: 200px" :placeholder="field.placeholder || ('请选择' + field.fieldLabel)" @change="handleLinkedFieldChange(field, searchForm)">
              <el-option
                v-for="option in getAvailableOptions(field, searchForm)"
                :key="field.fieldName + '_' + option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
          <template v-else-if="isMultiSelectField(field)">
            <el-select v-model="searchForm[field.fieldName]" clearable filterable multiple collapse-tags style="width: 220px" :placeholder="field.placeholder || ('请选择' + field.fieldLabel)" @change="handleLinkedFieldChange(field, searchForm)">
              <el-option
                v-for="option in getAvailableOptions(field, searchForm)"
                :key="field.fieldName + '_multi_' + option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
          <template v-else-if="field.fieldType === 'date'">
            <el-date-picker
              v-model="searchForm[field.fieldName]"
              type="date"
              value-format="yyyy-MM-dd"
              style="width: 200px"
              :placeholder="field.placeholder || ('请选择' + field.fieldLabel)"
            />
          </template>
          <template v-else-if="field.fieldType === 'datetime'">
            <el-date-picker
              v-model="searchForm[field.fieldName]"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              style="width: 220px"
              :placeholder="field.placeholder || ('请选择' + field.fieldLabel)"
            />
          </template>
          <template v-else-if="field.fieldType === 'number'">
            <el-input-number
              v-model="searchForm[field.fieldName]"
              :min="0"
              controls-position="right"
              style="width: 200px"
            />
          </template>
          <template v-else>
            <el-input
              v-model="searchForm[field.fieldName]"
              clearable
              style="width: 200px"
              :placeholder="field.placeholder || ('请输入' + field.fieldLabel)"
              @keyup.enter.native="handleQuery"
            />
          </template>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row v-if="template" :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button
            v-if="canAdd && fieldList.length"
            type="primary"
            plain
            icon="Plus"
            size="small"
            @click="handleAdd"
          >新增记录</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            v-if="canRemove && fieldList.length"
            type="danger"
            plain
            icon="Delete"
            size="small"
            :disabled="multiple"
            @click="handleDelete()"
          >删除</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            v-if="canImport && formFields.length"
            type="info"
            plain
            icon="UploadFilled"
            size="small"
            @click="handleImport"
          >导入登记</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            v-if="canEdit && fieldList.length"
            type="success"
            plain
            icon="EditPen"
            size="small"
            @click="handleBatchUpdate"
          >批量更新</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            v-if="canImport && formFields.length"
            type="info"
            plain
            icon="Document"
            size="small"
            @click="downloadImportTemplate"
          >下载模板</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            v-if="canExport && fieldList.length"
            type="warning"
            plain
            icon="Download"
            size="small"
            @click="handleExport"
          >导出</el-button>
        </el-col>
        <right-toolbar v-model:show-search="showSearch" @queryTable="getRecordList" />
      </el-row>

      <el-table
        v-if="template"
        v-loading="loading"
        :data="pageRecords"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="canRemove" type="selection" width="55" align="center" />
        <el-table-column label="记录ID" prop="recordId" align="center" width="90" />
        <el-table-column
          v-for="field in tableFields"
          :key="'table_' + field.fieldName"
          :label="field.fieldLabel"
          :min-width="field.width || 160"
          :show-overflow-tooltip="field.fieldType !== 'textarea'"
        >
          <template #default="scope">
            <div v-if="field.fieldType === 'textarea'" class="cell-text">
              {{ formatFieldValue(field, getRowFieldValue(scope.row, field.fieldName)) }}
            </div>
            <div v-else-if="isUploadField(field)" class="cell-files">
              <el-link
                v-for="file in getUploadFiles(getRowFieldValue(scope.row, field.fieldName))"
                :key="field.fieldName + '_' + file.uid"
                :href="file.url"
                target="_blank"
                type="primary"
                :underline="false"
              >{{ file.name }}</el-link>
              <span v-if="!getUploadFiles(getRowFieldValue(scope.row, field.fieldName)).length">-</span>
            </div>
            <span v-else>{{ formatFieldValue(field, getRowFieldValue(scope.row, field.fieldName)) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="填写人" prop="nickName" align="center" width="120">
          <template #default="scope">
            <span>{{ scope.row.nickName || scope.row.createBy || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updateTime" align="center" width="160">
          <template #default="scope">
            <span>{{ parseTime(scope.row.updateTime || scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="180">
          <template #default="scope">
            <el-button
              v-if="canEdit && fieldList.length"
              size="small"
              text
              icon="Edit"
              @click="handleUpdate(scope.row)"
            >编辑</el-button>
            <el-button
              v-if="canRemove && fieldList.length"
              size="small"
              text
              icon="Delete"
              @click="handleDelete(scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="template && total > 0"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handlePageChange"
      />

      <el-dialog :title="dialogTitle" v-model="open" width="920px" append-to-body>
        <el-form ref="form" :model="form" :rules="rules" label-width="120px">
          <el-row :gutter="18">
            <el-col
              v-for="field in formFields"
              :key="'form_' + field.fieldName"
              :span="field.fieldType === 'textarea' ? 24 : 12"
            >
              <el-form-item :label="field.fieldLabel" :prop="getFormProp(field)">
                <template v-if="isSingleOptionField(field)">
                  <el-select v-model="form.dataMap[field.fieldName]" clearable filterable style="width: 100%" :placeholder="field.placeholder || ('请选择' + field.fieldLabel)" @change="handleLinkedFieldChange(field, form.dataMap)">
                    <el-option
                      v-for="option in getAvailableOptions(field, form.dataMap)"
                      :key="field.fieldName + '_form_' + option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </template>
                <template v-else-if="isRadioField(field)">
                  <el-radio-group v-model="form.dataMap[field.fieldName]" @change="handleLinkedFieldChange(field, form.dataMap)">
                    <el-radio
                      v-for="option in getAvailableOptions(field, form.dataMap)"
                      :key="field.fieldName + '_radio_' + option.value"
                      :value="option.value"
                    >{{ option.label }}</el-radio>
                  </el-radio-group>
                </template>
                <template v-else-if="isMultiSelectField(field)">
                  <el-select v-model="form.dataMap[field.fieldName]" clearable filterable multiple collapse-tags style="width: 100%" :placeholder="field.placeholder || ('请选择' + field.fieldLabel)" @change="handleLinkedFieldChange(field, form.dataMap)">
                    <el-option
                      v-for="option in getAvailableOptions(field, form.dataMap)"
                      :key="field.fieldName + '_multi_form_' + option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </template>
                <template v-else-if="field.fieldType === 'textarea'">
                  <el-input
                    v-model="form.dataMap[field.fieldName]"
                    type="textarea"
                    :rows="4"
                    :placeholder="field.placeholder || ('请输入' + field.fieldLabel)"
                  />
                </template>
                <template v-else-if="field.fieldType === 'number'">
                  <el-input-number
                    v-model="form.dataMap[field.fieldName]"
                    :min="0"
                    controls-position="right"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="field.fieldType === 'date'">
                  <el-date-picker
                    v-model="form.dataMap[field.fieldName]"
                    type="date"
                    value-format="yyyy-MM-dd"
                    style="width: 100%"
                    :placeholder="field.placeholder || ('请选择' + field.fieldLabel)"
                  />
                </template>
                <template v-else-if="field.fieldType === 'datetime'">
                  <el-date-picker
                    v-model="form.dataMap[field.fieldName]"
                    type="datetime"
                    value-format="yyyy-MM-dd HH:mm:ss"
                    style="width: 100%"
                    :placeholder="field.placeholder || ('请选择' + field.fieldLabel)"
                  />
                </template>
                <template v-else-if="isUploadField(field)">
                  <el-upload
                    :action="uploadFieldAction"
                    :headers="uploadHeaders"
                    :accept="field.accept || undefined"
                    :limit="getUploadLimit(field)"
                    :multiple="getUploadLimit(field) > 1"
                    :file-list="getUploadFiles(form.dataMap[field.fieldName])"
                    :on-success="(response, file, fileList) => handleFieldUploadSuccess(field, response, file, fileList)"
                    :on-remove="(file, fileList) => handleFieldUploadRemove(field, fileList)"
                    :on-error="handleFieldUploadError"
                    :on-exceed="(files, fileList) => handleFieldUploadExceed(field)"
                    list-type="text"
                  >
                    <el-button size="small" type="primary">上传附件</el-button>
                    <template #tip><div class="el-upload__tip">{{ buildUploadTip(field) }}</div></template>
                  </el-upload>
                </template>
                <template v-else>
                  <el-input
                    v-model="form.dataMap[field.fieldName]"
                    :placeholder="field.placeholder || ('请输入' + field.fieldLabel)"
                  />
                </template>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template #footer><div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div></template>
      </el-dialog>

      <el-dialog :title="upload.title" v-model="upload.open" width="420px" append-to-body>
        <el-upload
          ref="upload"
          :limit="1"
          accept=".xlsx, .xls"
          :headers="upload.headers"
          :action="upload.url"
          :disabled="upload.isUploading"
          :on-progress="handleImportUploadProgress"
          :on-success="handleImportFileSuccess"
          :auto-upload="false"
          drag
        >
          <el-icon><Upload /></el-icon><div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
          <template #tip><div class="el-upload__tip text-center">
            <span>仅允许导入 xls、xlsx 格式文件。</span>
            <template v-if="upload.mode === 'update'">
              <div class="upload-tip-block">请先通过导出按钮下载当前数据，修改 Excel 内容后再上传，系统会根据记录ID批量更新现有记录。</div>
              <el-link v-if="canExport" type="primary" :underline="false" style="font-size: 12px; vertical-align: baseline" @click="handleExport">下载导出数据</el-link>
            </template>
            <template v-else>
              <el-link type="primary" :underline="false" style="font-size: 12px; vertical-align: baseline" @click="downloadImportTemplate">下载模板</el-link>
            </template>
          </div></template>
        </el-upload>
        <template #footer><div class="dialog-footer">
          <el-button type="primary" @click="submitImportFileForm">确 定</el-button>
          <el-button @click="upload.open = false">取 消</el-button>
        </div></template>
      </el-dialog>
    </template>
  </div>
</template>

<script>
import auth from '@/plugins/auth'
import { getToken } from '@/utils/auth'
import { getDicts } from '@/api/system/dict/data'
import { listUser } from '@/api/system/user'
import { getTemplate, getTemplateByKey } from '@/api/work/template'
import { addTemplateRecord, delTemplateRecord, getTemplateRecord, listTemplateRecord, updateTemplateRecord } from '@/api/work/templateRecord'

const DEFAULT_PAGE_SIZE = 10
const SINGLE_OPTION_TYPES = ['select', 'dictSelect', 'userSelect']
const RADIO_TYPES = ['radio', 'dictRadio']
const MULTI_SELECT_TYPES = ['checkbox', 'dictCheckbox', 'userMultiSelect']
const USER_FIELD_TYPES = ['userSelect', 'userMultiSelect']
const DICT_FIELD_TYPES = ['dictSelect', 'dictRadio', 'dictCheckbox']

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

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true'
  }
  return !!value
}

function toOptions(options) {
  if (!Array.isArray(options)) {
    return []
  }
  return options.map(item => ({
    label: item.label,
    value: String(item.value),
    parentValue: item.parentValue || ''
  }))
}

export default {
  name: 'TemplateRecordEngine',
  props: {
    templateKey: {
      type: String,
      default: ''
    },
    pageTitle: {
      type: String,
      default: '模板填报'
    },
    showSummary: {
      type: Boolean,
      default: true
    },
    permissionKeys: {
      type: Object,
      default() {
        return {
          add: ['work:template:center'],
          edit: ['work:template:center'],
          remove: ['work:template:center'],
          import: ['work:template:center'],
          export: ['work:template:center']
        }
      }
    }
  },
  data() {
    return {
      loading: false,
      showSearch: true,
      open: false,
      dialogTitle: '',
      template: null,
      fieldList: [],
      userOptions: [],
      userOptionsLoaded: false,
      dictOptionCache: {},
      recordList: [],
      filteredRecords: [],
      pageRecords: [],
      ids: [],
      multiple: true,
      total: 0,
      searchForm: {},
      form: {
        recordId: undefined,
        templateId: undefined,
        remark: '',
        dataMap: {}
      },
      upload: {
        open: false,
        title: '',
        mode: 'import',
        isUploading: false,
        headers: { Authorization: 'Bearer ' + getToken() },
        url: ''
      },
      uploadHeaders: { Authorization: 'Bearer ' + getToken() },
      uploadFieldAction: process.env.VUE_APP_BASE_API + '/common/upload',
      rules: {},
      queryParams: {
        pageNum: 1,
        pageSize: DEFAULT_PAGE_SIZE
      }
    }
  },
  computed: {
    resolvedPageTitle() {
      return this.pageTitle || (this.template && this.template.templateName) || '模板填报'
    },
    currentTemplateId() {
      if (this.templateKey) {
        return undefined
      }
      const templateId = this.$route.query.templateId
      return templateId ? Number(templateId) : undefined
    },
    searchFields() {
      return this.fieldList.filter(field => field.showInSearch)
    },
    tableFields() {
      return this.fieldList.filter(field => field.showInTable)
    },
    formFields() {
      return this.fieldList.filter(field => field.showInForm)
    },
    canAdd() {
      return this.hasPermission(this.permissionKeys.add)
    },
    canEdit() {
      return this.hasPermission(this.permissionKeys.edit)
    },
    canRemove() {
      return this.hasPermission(this.permissionKeys.remove)
    },
    canImport() {
      return this.hasPermission(this.permissionKeys.import)
    },
    canExport() {
      return this.hasPermission(this.permissionKeys.export)
    }
  },
  watch: {
    '$route.query.templateId'() {
      if (!this.templateKey) {
        this.initialize()
      }
    }
  },
  created() {
    this.initialize()
  },
  methods: {
    initialize() {
      if (!this.templateKey && !this.currentTemplateId) {
        this.template = null
        this.fieldList = []
        return
      }
      this.loading = true
      const request = this.templateKey ? getTemplateByKey(this.templateKey) : getTemplate(this.currentTemplateId)
      request.then(response => {
        this.template = response.data
        const fieldList = this.parseFieldList(this.template && this.template.schemaJson)
        this.prepareFieldSources(fieldList).finally(() => {
          this.fieldList = fieldList
          this.searchForm = this.buildSearchForm()
          this.queryParams.pageNum = 1
          this.getRecordList()
        })
      }).catch(() => {
        this.loading = false
        this.template = null
        this.fieldList = []
      })
    },
    parseFieldList(schemaJson) {
      const schemaList = safeJsonParse(schemaJson, [])
      if (!Array.isArray(schemaList)) {
        return []
      }
      return schemaList.map((item, index) => ({
        fieldName: item.fieldName,
        fieldLabel: item.fieldLabel,
        fieldType: item.fieldType || 'input',
        placeholder: item.placeholder || '',
        required: toBoolean(item.required),
        showInSearch: toBoolean(item.showInSearch),
        showInTable: toBoolean(item.showInTable, true),
        showInForm: toBoolean(item.showInForm, true),
        width: item.width || '',
        sortOrder: Number(item.sortOrder || index + 1),
        defaultValue: item.defaultValue,
        options: toOptions(item.options),
        dictType: item.dictType || '',
        linkParentField: item.linkParentField || '',
        accept: item.accept || '',
        uploadLimit: Number(item.uploadLimit || 1)
      })).sort((left, right) => left.sortOrder - right.sortOrder)
    },
    prepareFieldSources(fieldList) {
      const tasks = []
      const dictTypes = [...new Set(fieldList.filter(field => this.isDictField(field) && field.dictType).map(field => field.dictType))]
      dictTypes.forEach(dictType => {
        if (this.dictOptionCache[dictType]) {
          return
        }
        tasks.push(
          getDicts(dictType).then(response => {
            const options = Array.isArray(response.data) ? response.data.map(item => ({
              label: item.dictLabel,
              value: String(item.dictValue),
              parentValue: item.remark || ''
            })) : []
            this.dictOptionCache[dictType] = options
          })
        )
      })
      if (fieldList.some(field => this.isUserField(field)) && !this.userOptionsLoaded) {
        tasks.push(
          listUser({ pageNum: 1, pageSize: 1000, status: '0' }).then(response => {
            this.userOptions = Array.isArray(response.rows) ? response.rows.map(item => ({
              label: item.nickName || item.userName,
              value: String(item.userId)
            })) : []
            this.userOptionsLoaded = true
          })
        )
      }
      return tasks.length ? Promise.all(tasks) : Promise.resolve()
    },
    buildSearchForm() {
      const form = {}
      this.searchFields.forEach(field => {
        form[field.fieldName] = this.isMultiSelectField(field) ? [] : ''
      })
      return form
    },
    getRecordList() {
      if (!this.template) {
        this.loading = false
        return
      }
      this.loading = true
      listTemplateRecord(this.template.templateId).then(response => {
        const rows = Array.isArray(response.data) ? response.data : []
        this.recordList = rows.map(item => ({
          ...item,
          _rowData: safeJsonParse(item.dataJson, {})
        }))
        this.applyFilters()
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.recordId)
      this.multiple = !this.ids.length
    },
    handlePageChange() {
      this.refreshPageRecords()
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.applyFilters()
    },
    resetQuery() {
      this.searchForm = this.buildSearchForm()
      this.queryParams.pageNum = 1
      this.applyFilters()
    },
    applyFilters() {
      let rows = [...this.recordList]
      this.searchFields.forEach(field => {
        const keyword = this.searchForm[field.fieldName]
        if (keyword === undefined || keyword === null || keyword === '') {
          return
        }
        rows = rows.filter(row => this.matchFieldValue(field, this.getRowFieldValue(row, field.fieldName), keyword))
      })
      this.filteredRecords = rows
      this.total = rows.length
      this.refreshPageRecords()
    },
    refreshPageRecords() {
      const start = (this.queryParams.pageNum - 1) * this.queryParams.pageSize
      const end = start + this.queryParams.pageSize
      this.pageRecords = this.filteredRecords.slice(start, end)
    },
    matchFieldValue(field, actualValue, keyword) {
      if (this.isMultiSelectField(field)) {
        const actualValues = this.toStringList(actualValue)
        const searchValues = this.toStringList(keyword)
        return searchValues.every(item => actualValues.includes(item))
      }
      if (this.isSingleOptionField(field) || this.isRadioField(field) || field.fieldType === 'number' || field.fieldType === 'date' || field.fieldType === 'datetime') {
        return String(actualValue || '') === String(keyword)
      }
      return this.formatFieldValue(field, actualValue).toLowerCase().includes(String(keyword).toLowerCase())
    },
    getRowFieldValue(row, fieldName) {
      if (!row || !row._rowData) {
        return undefined
      }
      return row._rowData[fieldName]
    },
    formatFieldValue(field, value) {
      if (value === undefined || value === null || value === '') {
        return '-'
      }
      if (this.isUploadField(field)) {
        const fileNames = this.getUploadFiles(value).map(item => item.name)
        return fileNames.length ? fileNames.join('、') : '-'
      }
      if (this.isMultiSelectField(field)) {
        const labels = this.toStringList(value).map(item => this.resolveOptionLabel(field, item))
        return labels.length ? labels.join('、') : '-'
      }
      if (this.isSingleOptionField(field) || this.isRadioField(field)) {
        return this.resolveOptionLabel(field, String(value))
      }
      return String(value)
    },
    isSingleOptionField(field) {
      return SINGLE_OPTION_TYPES.includes(field.fieldType)
    },
    isRadioField(field) {
      return RADIO_TYPES.includes(field.fieldType)
    },
    isMultiSelectField(field) {
      return MULTI_SELECT_TYPES.includes(field.fieldType)
    },
    isDictField(field) {
      return DICT_FIELD_TYPES.includes(field.fieldType)
    },
    isUserField(field) {
      return USER_FIELD_TYPES.includes(field.fieldType)
    },
    isUploadField(field) {
      return field.fieldType === 'upload'
    },
    resolveFieldOptions(field) {
      if (this.isDictField(field)) {
        return this.dictOptionCache[field.dictType] || []
      }
      if (this.isUserField(field)) {
        return this.userOptions
      }
      return field.options || []
    },
    getAvailableOptions(field, model) {
      const options = this.resolveFieldOptions(field)
      if (!field.linkParentField) {
        return options
      }
      const parentValues = this.toStringList(model ? model[field.linkParentField] : undefined)
      if (!parentValues.length) {
        return options.filter(item => !item.parentValue)
      }
      const filteredOptions = options.filter(item => !item.parentValue || parentValues.includes(String(item.parentValue)))
      return filteredOptions.length ? filteredOptions : options.filter(item => !item.parentValue)
    },
    handleLinkedFieldChange(field, model) {
      this.fieldList.filter(item => item.linkParentField === field.fieldName).forEach(childField => {
        const currentValue = model[childField.fieldName]
        if (!this.isValidFieldValue(childField, currentValue, model)) {
          model[childField.fieldName] = this.getEmptyFieldValue(childField)
        }
        this.handleLinkedFieldChange(childField, model)
      })
    },
    isValidFieldValue(field, value, model) {
      if (value === undefined || value === null || value === '') {
        return true
      }
      if (this.isUploadField(field)) {
        return true
      }
      const options = this.getAvailableOptions(field, model)
      if (!options.length) {
        return true
      }
      if (this.isMultiSelectField(field)) {
        const optionValues = options.map(item => String(item.value))
        return this.toStringList(value).every(item => optionValues.includes(item))
      }
      return options.some(item => String(item.value) === String(value))
    },
    getEmptyFieldValue(field) {
      if (this.isMultiSelectField(field) || this.isUploadField(field)) {
        return []
      }
      if (field.fieldType === 'number') {
        return null
      }
      return ''
    },
    resolveOptionLabel(field, value) {
      const option = this.resolveFieldOptions(field).find(item => String(item.value) === String(value))
      return option ? option.label : value
    },
    hasPermission(permissions) {
      if (!permissions || !permissions.length) {
        return true
      }
      return auth.hasPermiOr(permissions)
    },
    handleAdd() {
      this.dialogTitle = '新增' + this.resolvedPageTitle
      this.form = this.buildFormModel()
      this.rules = this.buildRules()
      this.open = true
      this.clearFormValidate()
    },
    handleUpdate(row) {
      getTemplateRecord(row.recordId).then(response => {
        this.dialogTitle = '修改' + this.resolvedPageTitle
        this.form = this.buildFormModel(response.data)
        this.rules = this.buildRules()
        this.open = true
        this.clearFormValidate()
      })
    },
    buildFormModel(record) {
      const rowData = record && record.dataJson ? safeJsonParse(record.dataJson, {}) : (record && record._rowData) || {}
      const dataMap = {}
      this.formFields.forEach(field => {
        dataMap[field.fieldName] = this.getInitialFieldValue(field, rowData[field.fieldName])
      })
      this.fieldList.forEach(field => {
        this.handleLinkedFieldChange(field, dataMap)
      })
      return {
        recordId: record ? record.recordId : undefined,
        templateId: this.template ? this.template.templateId : undefined,
        remark: record ? (record.remark || '') : '',
        dataMap: dataMap
      }
    },
    getInitialFieldValue(field, value) {
      if (this.isUploadField(field)) {
        const uploadValue = value !== undefined && value !== null && value !== '' ? value : field.defaultValue
        return this.getUploadFiles(uploadValue)
      }
      if (this.isMultiSelectField(field)) {
        const multiValue = value !== undefined && value !== null && value !== '' ? value : field.defaultValue
        return this.toStringList(multiValue)
      }
      if (value !== undefined && value !== null && value !== '') {
        return field.fieldType === 'number' ? Number(value) : value
      }
      if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
        return field.fieldType === 'number' ? Number(field.defaultValue) : field.defaultValue
      }
      if (field.fieldType === 'number') {
        return null
      }
      return ''
    },
    buildRules() {
      const rules = {}
      this.formFields.forEach(field => {
        if (field.required) {
          rules[this.getFormProp(field)] = [
            {
              required: true,
              message: this.isSingleOptionField(field) || this.isRadioField(field) || this.isMultiSelectField(field) || field.fieldType === 'date' || field.fieldType === 'datetime' || this.isUploadField(field)
                ? '请选择' + field.fieldLabel
                : '请输入' + field.fieldLabel,
              trigger: this.isSingleOptionField(field) || this.isRadioField(field) || this.isMultiSelectField(field) || field.fieldType === 'date' || field.fieldType === 'datetime' || this.isUploadField(field) ? 'change' : 'blur'
            }
          ]
        }
      })
      return rules
    },
    getFormProp(field) {
      return 'dataMap.' + field.fieldName
    },
    clearFormValidate() {
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.clearValidate()
        }
      })
    },
    cancel() {
      this.open = false
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) {
          return
        }
        const payload = {
          recordId: this.form.recordId,
          templateId: this.template.templateId,
          remark: this.form.remark,
          dataJson: JSON.stringify(this.form.dataMap)
        }
        const request = this.form.recordId ? updateTemplateRecord(payload) : addTemplateRecord(payload)
        request.then(() => {
          this.$modal.msgSuccess(this.form.recordId ? '修改成功' : '新增成功')
          this.open = false
          this.getRecordList()
        })
      })
    },
    handleDelete(row) {
      const recordIds = row ? row.recordId : this.ids
      if (!recordIds || (Array.isArray(recordIds) && !recordIds.length)) {
        this.$modal.msgWarning('请至少选择一条记录')
        return
      }
      this.$modal.confirm('是否确认删除编号为"' + recordIds + '"的数据项？').then(() => {
        return delTemplateRecord(recordIds)
      }).then(() => {
        this.$modal.msgSuccess('删除成功')
        this.getRecordList()
      }).catch(() => {})
    },
    handleImport() {
      if (!this.template || !this.template.templateId) {
        this.$modal.msgWarning('当前模板不可用，无法导入')
        return
      }
      this.openUploadDialog('import')
    },
    handleBatchUpdate() {
      if (!this.template || !this.template.templateId) {
        this.$modal.msgWarning('当前模板不可用，无法批量更新')
        return
      }
      this.openUploadDialog('update')
    },
    openUploadDialog(mode) {
      this.upload.mode = mode
      this.upload.title = this.resolvedPageTitle + (mode === 'update' ? '批量更新' : '批量导入')
      this.upload.url = process.env.VUE_APP_BASE_API + (mode === 'update'
        ? '/work/templateRecord/importUpdate?templateId='
        : '/work/templateRecord/importData?templateId=') + this.template.templateId
      this.upload.open = true
      this.$nextTick(() => {
        if (this.$refs.upload) {
          this.$refs.upload.clearFiles()
        }
      })
    },
    downloadImportTemplate() {
      if (!this.template || !this.template.templateId) {
        this.$modal.msgWarning('当前模板不可用，无法下载模板')
        return
      }
      this.download('/work/templateRecord/importTemplate', {
        templateId: this.template.templateId
      }, `${this.template.templateKey || 'template-record'}_template_${new Date().getTime()}.xlsx`)
    },
    handleExport() {
      if (!this.template || !this.template.templateId) {
        this.$modal.msgWarning('当前模板不可用，无法导出')
        return
      }
      this.download('/work/templateRecord/export', {
        templateId: this.template.templateId,
        searchJson: this.buildSearchJson()
      }, `${this.template.templateKey || 'template-record'}_${new Date().getTime()}.xlsx`)
    },
    buildSearchJson() {
      const searchData = {}
      Object.keys(this.searchForm || {}).forEach(key => {
        const value = this.searchForm[key]
        if (Array.isArray(value) ? value.length : (value !== undefined && value !== null && value !== '')) {
          searchData[key] = value
        }
      })
      return JSON.stringify(searchData)
    },
    handleImportUploadProgress() {
      this.upload.isUploading = true
    },
    handleImportFileSuccess(response) {
      const resultTitle = this.upload.mode === 'update' ? '批量更新结果' : '导入结果'
      this.upload.open = false
      this.upload.isUploading = false
      if (this.$refs.upload) {
        this.$refs.upload.clearFiles()
      }
      this.$alert(
        "<div style='overflow:auto;overflow-x:hidden;max-height:70vh;padding:10px 20px 0;'>" + response.msg + '</div>',
        resultTitle,
        { dangerouslyUseHTMLString: true }
      )
      this.getRecordList()
    },
    submitImportFileForm() {
      if (this.$refs.upload) {
        this.$refs.upload.submit()
      }
    },
    toStringList(value) {
      if (Array.isArray(value)) {
        return value.filter(item => item !== undefined && item !== null && item !== '').map(item => String(item))
      }
      if (typeof value === 'string') {
        return value.split(/[,，;；、\n\r]+/).map(item => item.trim()).filter(Boolean)
      }
      if (value === undefined || value === null || value === '') {
        return []
      }
      return [String(value)]
    },
    getUploadFiles(value) {
      if (!value) {
        return []
      }
      if (Array.isArray(value)) {
        return value.map(item => this.normalizeUploadFile(item)).filter(Boolean)
      }
      if (typeof value === 'string') {
        return value.split(/[,，;；\n\r]+/).map(item => this.normalizeUploadFile(item)).filter(Boolean)
      }
      return [this.normalizeUploadFile(value)].filter(Boolean)
    },
    normalizeUploadFile(file) {
      if (!file) {
        return null
      }
      if (typeof file === 'string') {
        return {
          name: this.extractFileName(file),
          url: file,
          uid: file
        }
      }
      const response = file.response || {}
      const url = file.url || response.url || ''
      const name = file.originalFilename || response.originalFilename || file.name || response.newFileName || this.extractFileName(url)
      return {
        name,
        url,
        uid: file.uid || file.fileName || response.fileName || url || name,
        fileName: file.fileName || response.fileName || '',
        originalFilename: file.originalFilename || response.originalFilename || name
      }
    },
    extractFileName(url) {
      if (!url) {
        return ''
      }
      const cleanUrl = String(url).split('?')[0]
      const segments = cleanUrl.split('/')
      return segments[segments.length - 1] || cleanUrl
    },
    getUploadLimit(field) {
      return Number(field.uploadLimit || 1)
    },
    buildUploadTip(field) {
      const tips = [`最多上传 ${this.getUploadLimit(field)} 个附件`]
      if (field.accept) {
        tips.push(`允许格式：${field.accept}`)
      }
      return tips.join('，')
    },
    handleFieldUploadSuccess(field, response, file) {
      if (!response || response.code !== 200) {
        this.$modal.msgError((response && response.msg) || `字段【${field.fieldLabel}】上传失败`)
        return
      }
      const uploadFile = this.normalizeUploadFile({
        uid: file.uid,
        url: response.url,
        fileName: response.fileName,
        originalFilename: response.originalFilename,
        name: response.originalFilename || response.newFileName
      })
      const currentList = this.getUploadFiles(this.form.dataMap[field.fieldName]).filter(item => item.uid !== file.uid && item.url !== uploadFile.url)
      const nextList = this.getUploadLimit(field) > 1 ? [...currentList, uploadFile] : [uploadFile]
      this.form.dataMap[field.fieldName] = nextList
    },
    handleFieldUploadRemove(field, fileList) {
      this.form.dataMap[field.fieldName] = fileList.map(item => this.normalizeUploadFile(item).filter(Boolean))
    },
    handleFieldUploadError() {
      this.$modal.msgError('附件上传失败，请稍后重试')
    },
    handleFieldUploadExceed(field) {
      this.$modal.msgWarning(`字段【${field.fieldLabel}】最多上传 ${this.getUploadLimit(field)} 个附件`)
    }
  }
}
</script>

<style scoped>
.mb12 {
  margin-bottom: 12px;
}

.search-form {
  margin-top: 14px;
}

.template-summary {
  margin-bottom: 14px;
}

.template-summary__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.template-summary__title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.template-summary__meta {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.template-summary__desc {
  color: #606266;
  line-height: 1.7;
}

.cell-text {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.6;
}

.cell-files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
