<template>
  <template-record-engine
    page-title="模板填报"
    :permission-keys="permissionKeys"
  />
</template>

<script>
import TemplateRecordEngine from './components/TemplateRecordEngine'

export default {
  name: 'WorkTemplateEntry',
  components: {
    TemplateRecordEngine
  },
  data() {
    return {
      permissionKeys: {
        add: ['work:template:center'],
        edit: ['work:template:center'],
        remove: ['work:template:center'],
        import: ['work:template:center'],
        export: ['work:template:center']
      }
    }
  }
}
</script>
