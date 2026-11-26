<template>
  <div class="app-container">
    <el-form v-show="showSearch" ref="queryForm" :model="queryParams" size="small" :inline="true" label-width="100px">
      <el-form-item label="模板名称" prop="templateName">
        <el-input
          v-model="queryParams.templateName"
          placeholder="请输入模板名称"
          clearable
          style="width: 220px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="模板标识" prop="templateKey">
        <el-input
          v-model="queryParams.templateKey"
          placeholder="请输入模板标识"
          clearable
          style="width: 220px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" clearable style="width: 160px" placeholder="请选择状态">
          <el-option label="启用" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['work:template:add']"
          type="primary"
          plain
          icon="Plus"
          size="small"
          @click="handleAdd"
        >新增模板</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['work:template:add']"
          type="warning"
          plain
          icon="UploadFilled"
          size="small"
          @click="handleAddByExcel"
        >Excel生成模板</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['work:template:edit']"
          type="success"
          plain
          icon="Edit"
          size="small"
          :disabled="single"
          @click="handleUpdate()"
        >修改模板</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['work:template:remove']"
          type="danger"
          plain
          icon="Delete"
          size="small"
          :disabled="multiple"
          @click="handleDelete()"
        >删除模板</el-button>
      </el-col>
      <right-toolbar v-model:show-search="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="templateList" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="模板ID" prop="templateId" align="center" width="90" />
      <el-table-column label="模板名称" prop="templateName" align="center" min-width="180" />
      <el-table-column label="模板标识" prop="templateKey" align="center" min-width="160" />
      <el-table-column label="所属系统" prop="systemName" align="center" min-width="140" />
      <el-table-column label="字段数" align="center" width="90">
        <template #default="scope">
          <span>{{ scope.row.fieldCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" prop="status" align="center" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === '0' ? 'success' : 'info'" size="small">
            {{ scope.row.status === '0' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" prop="updateTime" align="center" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.updateTime || scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="模板说明" prop="templateDesc" align="center" min-width="220" :show-overflow-tooltip="true" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="240">
        <template #default="scope">
          <el-button
            v-hasPermi="['work:template:edit']"
            size="small"
            text
            icon="Edit"
            @click="handleUpdate(scope.row)"
          >配置字段</el-button>
          <el-button
            v-hasPermi="['work:template:center']"
            size="small"
            text
            icon="Document"
            @click="handleWrite(scope.row)"
          >填写</el-button>
          <el-button
            v-hasPermi="['work:template:remove']"
            size="small"
            text
            icon="Delete"
            @click="handleDelete(scope.row)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <el-dialog :title="title" v-model="open" width="1200px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="模板名称" prop="templateName">
              <el-input v-model="form.templateName" placeholder="例如：问题登记表" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模板标识" prop="templateKey">
              <el-input v-model="form.templateKey" placeholder="例如：work-issue，建议使用英文和中划线" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属系统" prop="systemName">
              <el-input v-model="form.systemName" placeholder="例如：ODS迁移" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio label="0">启用</el-radio>
                <el-radio label="1">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="模板说明" prop="templateDesc">
              <el-input v-model="form.templateDesc" type="textarea" :rows="3" placeholder="描述这个模板用于哪个系统、哪些同事填写" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="field-toolbar">
          <div class="field-toolbar__title">字段配置</div>
          <div class="field-toolbar__actions">
            <el-button type="info" plain size="small" icon="Document" @click="downloadSchemaTemplate">下载导入模板</el-button>
            <el-button type="warning" plain size="small" icon="UploadFilled" @click="openSchemaUpload">Excel导入字段</el-button>
            <el-button type="primary" plain size="small" icon="Plus" @click="handleAddField">新增字段</el-button>
          </div>
        </div>

        <el-table :data="form.fieldList" border size="small" class="field-table">
          <el-table-column label="排序" width="88" align="center">
            <template #default="scope">
              <el-input-number v-model="scope.row.sortOrder" :min="1" controls-position="right" size="small" class="full-width" />
            </template>
          </el-table-column>
          <el-table-column label="字段名称" min-width="150">
            <template #default="scope">
              <el-input v-model="scope.row.fieldLabel" size="small" placeholder="例如：文件名" />
            </template>
          </el-table-column>
          <el-table-column label="字段标识" min-width="170">
            <template #default="scope">
              <el-input v-model="scope.row.fieldName" size="small" placeholder="例如：fileName" />
            </template>
          </el-table-column>
          <el-table-column label="字段类型" width="120">
            <template #default="scope">
              <el-select v-model="scope.row.fieldType" size="small" class="full-width" @change="handleFieldTypeChange(scope.row)">
                <el-option v-for="item in fieldTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="占位提示" min-width="160">
            <template #default="scope">
              <el-input v-model="scope.row.placeholder" size="small" placeholder="例如：请输入文件名" />
            </template>
          </el-table-column>
          <el-table-column label="默认值" min-width="120">
            <template #default="scope">
              <el-input v-model="scope.row.defaultValue" size="small" placeholder="可选" />
            </template>
          </el-table-column>
          <el-table-column label="表格宽度" width="100" align="center">
            <template #default="scope">
              <el-input-number v-model="scope.row.width" :min="120" controls-position="right" size="small" class="full-width" />
            </template>
          </el-table-column>
          <el-table-column label="必填" width="70" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.required" />
            </template>
          </el-table-column>
          <el-table-column label="搜索" width="70" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.showInSearch" />
            </template>
          </el-table-column>
          <el-table-column label="列表" width="70" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.showInTable" />
            </template>
          </el-table-column>
          <el-table-column label="表单" width="70" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.showInForm" />
            </template>
          </el-table-column>
          <el-table-column label="扩展配置" min-width="300">
            <template #default="scope">
              <div v-if="isManualOptionField(scope.row)" class="field-config-group">
                <el-input
                  v-model="scope.row.optionText"
                  size="small"
                  type="textarea"
                  :rows="2"
                  placeholder="每行一项，格式：显示值:实际值；如需手工联动可写：父值|显示值:实际值"
                />
              </div>
              <div v-else-if="isDictField(scope.row)" class="field-config-group">
                <el-input v-model="scope.row.dictType" size="small" placeholder="字典类型，例如：sys_user_sex" />
                <el-select v-model="scope.row.linkParentField" clearable size="small" class="full-width linkage-select" placeholder="联动父字段，可选">
                  <el-option v-for="item in getLinkageFieldOptions(scope.row.fieldName)" :key="scope.row.fieldName + '_' + item.fieldName" :label="item.fieldLabel + '（' + item.fieldName + '）'" :value="item.fieldName" />
                </el-select>
                <div class="field-tip">字典联动时，子字典数据的备注填写父字段的值。</div>
              </div>
              <div v-else-if="isUploadField(scope.row)" class="field-config-group">
                <el-input v-model="scope.row.accept" size="small" placeholder="附件格式，例如：.doc,.xlsx,image/*" />
                <el-input-number v-model="scope.row.uploadLimit" :min="1" controls-position="right" size="small" class="full-width" />
              </div>
              <div v-else-if="isUserField(scope.row)" class="field-tip">
                自动从系统用户中选择人员，适合处理人、审核人、抄送人等场景。
              </div>
              <div v-else class="field-tip">当前字段类型无需额外配置。</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="scope">
              <el-button text size="small" icon="Top" :disabled="scope.$index === 0" @click="moveField(scope.$index, -1)">上移</el-button>
              <el-button text size="small" icon="Bottom" :disabled="scope.$index === form.fieldList.length - 1" @click="moveField(scope.$index, 1)">下移</el-button>
              <el-button text size="small" icon="Delete" @click="handleRemoveField(scope.$index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer><div class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div></template>
    </el-dialog>

    <el-dialog :title="schemaUpload.title" v-model="schemaUpload.open" width="420px" append-to-body>
      <el-upload
        ref="schemaUpload"
        :limit="1"
        accept=".xlsx, .xls"
        :headers="schemaUpload.headers"
        :action="schemaUpload.url"
        :disabled="schemaUpload.isUploading"
        :on-progress="handleSchemaUploadProgress"
        :on-success="handleSchemaUploadSuccess"
        :on-error="handleSchemaUploadError"
        :auto-upload="false"
        drag
      >
        <el-icon><Upload /></el-icon><div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip><div class="el-upload__tip text-center">
          <span>仅允许导入 xls、xlsx 格式文件。</span>
          <el-link type="primary" :underline="false" style="font-size: 12px; vertical-align: baseline" @click="downloadSchemaTemplate">下载导入模板</el-link>
        </div></template>
      </el-upload>
      <template #footer><div class="dialog-footer">
        <el-button type="primary" @click="submitSchemaFileForm">确 定</el-button>
        <el-button @click="schemaUpload.open = false">取 消</el-button>
      </div></template>
    </el-dialog>
  </div>
</template>

<script>
import { getToken } from '@/utils/auth'
import { addTemplate, delTemplate, getTemplate, listTemplate, updateTemplate } from '@/api/work/template'

const FIELD_TYPE_OPTIONS = [
  { label: '单行输入', value: 'input' },
  { label: '多行文本', value: 'textarea' },
  { label: '数字', value: 'number' },
  { label: '下拉选择', value: 'select' },
  { label: '单选', value: 'radio' },
  { label: '多选', value: 'checkbox' },
  { label: '日期', value: 'date' },
  { label: '日期时间', value: 'datetime' },
  { label: '附件上传', value: 'upload' },
  { label: '字典下拉', value: 'dictSelect' },
  { label: '字典单选', value: 'dictRadio' },
  { label: '字典多选', value: 'dictCheckbox' },
  { label: '人员选择', value: 'userSelect' },
  { label: '人员多选', value: 'userMultiSelect' }
]

const MANUAL_OPTION_TYPES = ['select', 'radio', 'checkbox']
const DICT_FIELD_TYPES = ['dictSelect', 'dictRadio', 'dictCheckbox']
const USER_FIELD_TYPES = ['userSelect', 'userMultiSelect']

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

export default {
  name: 'WorkTemplateConfig',
  data() {
    return {
      loading: false,
      ids: [],
      single: true,
      multiple: true,
      showSearch: true,
      total: 0,
      templateList: [],
      title: '',
      open: false,
      fieldTypeOptions: FIELD_TYPE_OPTIONS,
      schemaUpload: {
        open: false,
        title: 'Excel导入字段',
        isUploading: false,
        headers: { Authorization: 'Bearer ' + getToken() },
        url: process.env.VUE_APP_BASE_API + '/work/template/importBuild'
      },
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        templateName: undefined,
        templateKey: undefined,
        status: undefined
      },
      form: {},
      rules: {
        templateName: [
          { required: true, message: '模板名称不能为空', trigger: 'blur' }
        ],
        templateKey: [
          { required: true, message: '模板标识不能为空', trigger: 'blur' }
        ]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listTemplate(this.queryParams).then(response => {
        this.templateList = response.rows.map(item => ({
          ...item,
          fieldCount: safeJsonParse(item.schemaJson, []).length
        }))
        this.total = response.total
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.templateId)
      this.single = selection.length !== 1
      this.multiple = !selection.length
    },
    createField(sortOrder) {
      return {
        fieldLabel: '',
        fieldName: '',
        fieldType: 'input',
        placeholder: '',
        defaultValue: '',
        width: 160,
        required: false,
        showInSearch: false,
        showInTable: true,
        showInForm: true,
        optionText: '',
        dictType: '',
        linkParentField: '',
        accept: '',
        uploadLimit: 1,
        sortOrder: sortOrder
      }
    },
    reset() {
      this.form = {
        templateId: undefined,
        templateName: '',
        templateKey: '',
        systemName: '',
        templateDesc: '',
        status: '0',
        remark: '',
        fieldList: [this.createField(1)]
      }
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.clearValidate()
        }
      })
    },
    cancel() {
      this.open = false
      this.reset()
    },
    handleAdd() {
      this.reset()
      this.open = true
      this.title = '新增模板'
    },
    handleAddByExcel() {
      this.reset()
      this.open = true
      this.title = 'Excel生成模板'
      this.$nextTick(() => {
        this.openSchemaUpload()
      })
    },
    handleUpdate(row) {
      const templateId = row ? row.templateId : this.ids[0]
      getTemplate(templateId).then(response => {
        const template = response.data
        const schemaList = safeJsonParse(template.schemaJson, [])
        this.form = {
          templateId: template.templateId,
          templateName: template.templateName,
          templateKey: template.templateKey,
          systemName: template.systemName,
          templateDesc: template.templateDesc,
          status: template.status,
          remark: template.remark,
          fieldList: schemaList.length ? schemaList.map((item, index) => this.toFieldRow(item, index + 1)) : [this.createField(1)]
        }
        this.open = true
        this.title = '修改模板'
        this.$nextTick(() => {
          if (this.$refs.form) {
            this.$refs.form.clearValidate()
          }
        })
      })
    },
    toFieldRow(field, defaultSort) {
      return {
        fieldLabel: field.fieldLabel || '',
        fieldName: field.fieldName || '',
        fieldType: field.fieldType || 'input',
        placeholder: field.placeholder || '',
        defaultValue: field.defaultValue === undefined || field.defaultValue === null ? '' : String(field.defaultValue),
        width: field.width || 160,
        required: toBoolean(field.required),
        showInSearch: toBoolean(field.showInSearch),
        showInTable: toBoolean(field.showInTable, true),
        showInForm: toBoolean(field.showInForm, true),
        optionText: this.buildOptionText(field.options),
        dictType: field.dictType || '',
        linkParentField: field.linkParentField || '',
        accept: field.accept || '',
        uploadLimit: Number(field.uploadLimit || 1),
        sortOrder: Number(field.sortOrder || defaultSort)
      }
    },
    buildOptionText(options) {
      if (!Array.isArray(options) || !options.length) {
        return ''
      }
      return options.map(item => {
        const optionText = `${item.label}:${item.value}`
        return item.parentValue ? `${item.parentValue}|${optionText}` : optionText
      }).join('\n')
    },
    isManualOptionField(field) {
      return MANUAL_OPTION_TYPES.includes(field.fieldType)
    },
    isDictField(field) {
      return DICT_FIELD_TYPES.includes(field.fieldType)
    },
    isUploadField(field) {
      return field.fieldType === 'upload'
    },
    isUserField(field) {
      return USER_FIELD_TYPES.includes(field.fieldType)
    },
    getLinkageFieldOptions(currentFieldName) {
      return (this.form.fieldList || []).filter(item => item.fieldName && item.fieldName !== currentFieldName)
    },
    handleFieldTypeChange(field) {
      if (!this.isManualOptionField(field)) {
        field.optionText = ''
      }
      if (!this.isDictField(field)) {
        field.dictType = ''
        field.linkParentField = ''
      }
      if (!this.isUploadField(field)) {
        field.accept = ''
        field.uploadLimit = 1
      }
    },
    handleAddField() {
      this.form.fieldList.push(this.createField(this.form.fieldList.length + 1))
    },
    handleRemoveField(index) {
      if (this.form.fieldList.length === 1) {
        this.$modal.msgWarning('至少保留一个字段，或者直接取消模板编辑')
        return
      }
      this.form.fieldList.splice(index, 1)
    },
    moveField(index, step) {
      const targetIndex = index + step
      const current = this.form.fieldList[index]
      this.form.fieldList[index] = this.form.fieldList[targetIndex]
      this.form.fieldList[targetIndex] = current
      this.form.fieldList = this.form.fieldList.map((item, rowIndex) => ({
        ...item,
        sortOrder: rowIndex + 1
      }))
    },
    parseOptionText(optionText) {
      if (!optionText) {
        return []
      }
      return optionText.split(/\r?\n/).map(item => item.trim()).filter(Boolean).map(item => {
        let parentValue = ''
        let optionValue = item
        if (item.includes('|')) {
          const parts = item.split('|')
          parentValue = parts.shift().trim()
          optionValue = parts.join('|').trim()
        }
        const separatorIndex = optionValue.indexOf(':') >= 0 ? optionValue.indexOf(':') : optionValue.indexOf('：')
        if (separatorIndex < 0) {
          return { label: optionValue, value: optionValue, parentValue }
        }
        return {
          label: optionValue.slice(0, separatorIndex).trim(),
          value: optionValue.slice(separatorIndex + 1).trim(),
          parentValue
        }
      }).filter(item => item.label && item.value)
    },
    validateFields() {
      if (!this.form.fieldList.length) {
        return '请至少配置一个字段'
      }
      const fieldNameSet = new Set()
      for (const field of this.form.fieldList) {
        if (!field.fieldLabel) {
          return '字段名称不能为空'
        }
        if (!field.fieldName) {
          return `字段【${field.fieldLabel}】的字段标识不能为空`
        }
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field.fieldName)) {
          return `字段【${field.fieldLabel}】的字段标识只能使用字母、数字和下划线，且必须以字母开头`
        }
        if (fieldNameSet.has(field.fieldName)) {
          return `字段标识【${field.fieldName}】重复，请修改后重试`
        }
        fieldNameSet.add(field.fieldName)
      }
      for (const field of this.form.fieldList) {
        if (this.isManualOptionField(field) && !this.parseOptionText(field.optionText).length) {
          return `字段【${field.fieldLabel}】需要配置选项`
        }
        if (this.isDictField(field) && !field.dictType) {
          return `字段【${field.fieldLabel}】需要配置字典类型`
        }
        if (field.linkParentField) {
          if (field.linkParentField === field.fieldName) {
            return `字段【${field.fieldLabel}】不能联动自身`
          }
          if (!fieldNameSet.has(field.linkParentField)) {
            return `字段【${field.fieldLabel}】配置的联动父字段不存在`
          }
        }
        if (this.isUploadField(field) && (!field.uploadLimit || Number(field.uploadLimit) < 1)) {
          return `字段【${field.fieldLabel}】的附件数量至少为 1`
        }
        if (!field.showInSearch && !field.showInTable && !field.showInForm) {
          return `字段【${field.fieldLabel}】至少要在搜索、列表、表单中展示一处`
        }
      }
      return ''
    },
    buildSubmitPayload() {
      return {
        templateId: this.form.templateId,
        templateName: this.form.templateName,
        templateKey: this.form.templateKey,
        systemName: this.form.systemName,
        templateDesc: this.form.templateDesc,
        status: this.form.status,
        remark: this.form.remark,
        schemaJson: JSON.stringify(this.form.fieldList.map((field, index) => ({
          fieldLabel: field.fieldLabel,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          placeholder: field.placeholder,
          defaultValue: field.defaultValue,
          width: field.width,
          required: !!field.required,
          showInSearch: !!field.showInSearch,
          showInTable: !!field.showInTable,
          showInForm: !!field.showInForm,
          options: this.parseOptionText(field.optionText),
          dictType: field.dictType,
          linkParentField: field.linkParentField,
          accept: field.accept,
          uploadLimit: Number(field.uploadLimit || 1),
          sortOrder: Number(field.sortOrder || index + 1)
        })))
      }
    },
    openSchemaUpload() {
      this.schemaUpload.title = this.form.templateId ? 'Excel导入覆盖字段' : 'Excel导入生成模板'
      this.schemaUpload.open = true
      this.$nextTick(() => {
        if (this.$refs.schemaUpload) {
          this.$refs.schemaUpload.clearFiles()
        }
      })
    },
    downloadSchemaTemplate() {
      this.download('/work/template/importTemplate', {}, `work_template_build_${new Date().getTime()}.xlsx`)
    },
    submitSchemaFileForm() {
      if (!this.$refs.schemaUpload || !this.$refs.schemaUpload.uploadFiles.length) {
        this.$modal.msgWarning('请先选择Excel文件')
        return
      }
      this.$refs.schemaUpload.submit()
    },
    handleSchemaUploadProgress() {
      this.schemaUpload.isUploading = true
    },
    handleSchemaUploadError() {
      this.schemaUpload.isUploading = false
      this.$modal.msgError('模板Excel导入失败，请检查文件后重试')
    },
    handleSchemaUploadSuccess(response) {
      this.schemaUpload.isUploading = false
      if (this.$refs.schemaUpload) {
        this.$refs.schemaUpload.clearFiles()
      }
      if (!response || response.code !== 200) {
        this.$modal.msgError((response && response.msg) || '模板Excel导入失败')
        return
      }
      const data = response.data || {}
      this.form.templateName = data.templateName || this.form.templateName
      this.form.templateKey = data.templateKey || this.form.templateKey
      this.form.systemName = data.systemName || this.form.systemName
      this.form.templateDesc = data.templateDesc || this.form.templateDesc
      this.form.status = data.status || this.form.status
      this.form.remark = data.remark || this.form.remark
      const importedFields = Array.isArray(data.fieldList) && data.fieldList.length
        ? data.fieldList.map((item, index) => this.toFieldRow(item, index + 1))
        : [this.createField(1)]
      this.form.fieldList = importedFields
      this.schemaUpload.open = false
      this.$modal.msgSuccess('Excel模板字段已载入，可以继续微调后保存')
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) {
          return
        }
        const fieldMessage = this.validateFields()
        if (fieldMessage) {
          this.$modal.msgError(fieldMessage)
          return
        }
        const payload = this.buildSubmitPayload()
        const request = payload.templateId ? updateTemplate(payload) : addTemplate(payload)
        request.then(() => {
          this.$modal.msgSuccess(payload.templateId ? '修改成功' : '新增成功')
          this.open = false
          this.getList()
        })
      })
    },
    handleDelete(row) {
      const templateIds = row ? row.templateId : this.ids
      this.$modal.confirm('是否确认删除模板编号为"' + templateIds + '"的数据项？').then(() => {
        return delTemplate(templateIds)
      }).then(() => {
        this.$modal.msgSuccess('删除成功')
        this.getList()
      }).catch(() => {})
    },
    handleWrite(row) {
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
.mb8 {
  margin-bottom: 8px;
}

.field-toolbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-toolbar__actions {
  display: flex;
  gap: 8px;
}

.field-toolbar__title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.field-table {
  margin-top: 4px;
}

.full-width {
  width: 100%;
}

.field-config-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.linkage-select {
  width: 100%;
}

.field-tip {
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}
</style>
