<template>
  <el-tabs class="app-container" value="records">
    <el-tab-pane label="补录数据审核" name="records">
      <record-desk mode="review" />
    </el-tab-pane>
    <el-tab-pane label="模板启用审批" name="templates">
      <template-requests assigned />
    </el-tab-pane>
  </el-tabs>
</template>
<script>
import RecordDesk from './RecordDesk'
import TemplateRequests from './TemplateRequests'
export default { name: 'BackfillReview', components: { RecordDesk, TemplateRequests }}
</script>
