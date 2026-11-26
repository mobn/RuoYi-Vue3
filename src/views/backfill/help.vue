<template>
  <article class="app-container guide">
    <h2>数据补录操作指南</h2>
    <el-collapse v-model="sections">
      <el-collapse-item v-for="s in guides" :key="s.name" :title="s.name" :name="s.name">
        <ol>
          <li v-for="line in s.steps" :key="line">{{ line }}</li>
        </ol>
      </el-collapse-item>
    </el-collapse>
  </article>
</template>
<script>
export default {
  name: 'BackfillHelp',
  data: () => ({
    sections: ['补录员'],
    guides: [
      {
        name: '补录员',
        steps: [
          '在补录工作台按主题、期间找到自己的任务，或新建一次临时补录。',
          '打开任务，按字段提示填写。保存草稿可保留未填完的数据；保存并提交会校验全部必填项和取值范围。',
          '审核前可以撤回。被退回后查看意见，修改并再次提交。删除的草稿可在已删除状态下恢复。',
          '在模板中心下载已授权模板的 Excel，填写后按报送期间导入。工作台也支持 UTF-8 JSON 数组，每项包含 topic_id、period 和 draft。可导出筛选结果作为格式样例。手机与电脑使用同一入口。'
        ]
      },
      {
        name: '审核员',
        steps: [
          '打开补录审核，按待审核筛选自己的任务。',
          '核对申请人、报送期间、修正原因及发生变化字段的正式值。',
          '选择通过、退回或拒绝。并行环节需要全部通过才流转至下一级；退回和拒绝需要填写意见。'
        ]
      },
      {
        name: '数据负责人',
        steps: [
          '在归档与修正中选取正式记录，填写原因并发起修正。',
          '草稿与正式值分别保存。经审核的具体改值会成为新版本，原有归档标记保留。',
          '在消息中心接收变更提醒，在同步管理中核对交付版本、处理失败任务及校验回执。'
        ]
      },
      {
        name: '管理员',
        steps: [
          '在模板配置中设置字段、填报角色和额外人员，选择数据是否需要审核。指定审批人在补录审核的模板启用审批中通过后，模板中心即使用新版本。填报人员还需要补录工作台权限。',
          '在补录工作台创建任务时可指定责任人和报送期限。',
          '启用同步前配置允许的目标地址并验证接收端。按最近的失败原因处理后重试；接收方按交付编号去重。',
          '在备份与恢复设置自动备份计划，恢复前校验版本、表范围和行数。整库操作由系统管理员执行。',
          '统计与质量提供任务耗时、审核环节、补录量及校验问题的筛选和明细。'
        ]
      }
    ]
  })
}
</script>
<style scoped>
.guide {
  max-width: 980px;
}
.guide li {
  margin: 8px 0;
  line-height: 1.8;
}
</style>
