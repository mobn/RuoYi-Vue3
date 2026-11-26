<template>
  <template-record-engine
    template-key="work-issue"
    page-title="问题登记表"
    :permission-keys="permissionKeys"
  />
</template>

<script>
import TemplateRecordEngine from '../template/components/TemplateRecordEngine'

export default {
  name: 'WorkIssue',
  components: {
    TemplateRecordEngine
  },
  data() {
    return {
      permissionKeys: {
        add: ['work:issue:add'],
        edit: ['work:issue:edit'],
        remove: ['work:issue:remove'],
        import: ['work:issue:add'],
        export: ['work:issue:export']
      }
    }
  }
}
</script>
