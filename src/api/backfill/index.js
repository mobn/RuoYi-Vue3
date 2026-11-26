import request from '@/utils/request'
import { saveAs } from 'file-saver'

import { ElMessageBox as MessageBox } from 'element-plus'

function call(path, method, data) {
  const importing = path === 'import' || path.endsWith('/import')
  return request({
    url: '/backfill/' + path,
    method,
    data,
    timeout: importing || path.startsWith('backups') ? 600000 : 30000,
    headers: data instanceof FormData
      ? { repeatSubmit: false, 'Content-Type': 'multipart/form-data' }
      : { repeatSubmit: false }
  })
}

export async function enroll() {
  const password = await MessageBox.prompt('请输入当前账号的登录密码', '绑定验证器', {
    inputType: 'password'
  })
  const result = await call('access/enroll', 'post', { password: password.value })
  await MessageBox.alert(result.data, '在验证器中手动添加此密钥（基于时间）')
}

let checking
async function checkFactor() {
  const { data } = await call('access/status', 'get')
  if (data.verified || (!data.active && !data.mandatory)) return
  if (!data.active) await enroll()
  await verifyFactor()
}
export async function verifyFactor() {
  const code = await MessageBox.prompt('输入验证器中的六位数字', '双因素认证', {
    inputPattern: /^\d{6}$/,
    inputErrorMessage: '请输入六位数字'
  })
  await call('access/verify', 'post', { code: code.value })
}
async function authorized(path, method, data) {
  if (path !== 'access/status') {
    if (!checking) {
      checking = checkFactor().finally(() => {
        checking = null
      })
    }
    await checking
  }
  return call(path, method, data)
}
export const get = (path) => authorized(path, 'get').then((r) => r.data)
export const post = (path, data) => authorized(path, 'post', data)
export const seen = (id) => authorized('messages/' + id, 'put')
export const label = (code) =>
  ({
    DRAFT: '待填报',
    RETURNED: '退回修改',
    REJECTED: '已拒绝',
    DELETED: '已删除',
    PENDING: '待审核',
    EFFECTIVE: '已生效',
    SAVE: '保存草稿',
    CREATE: '创建',
    PUBLISH: '发布版本',
    SUBMIT: '提交审核',
    APPROVE: '审核通过',
    REJECT: '拒绝',
    RETURN: '退回',
    ARCHIVE: '归档',
    CORRECT: '申请修正',
    RESTORE: '恢复历史值',
    UNDELETE: '恢复记录',
    DELETE: '删除草稿',
    WITHDRAW: '撤回',
    CANCELLED: '已取消',
    WAITING: '等待前序审核',
    READY: '待同步',
    RUNNING: '传输中',
    FAILED: '失败',
    DELIVERED: '已送达',
    CONFIRMED: '已确认应用',
    IGNORED: '已忽略',
    IMPORT: '模板导入',
    TEMPLATE_SUBMIT: '模板提交审批',
    TEMPLATE_APPROVE: '模板审批启用',
    TEMPLATE_REJECT: '模板审批拒绝',
    TOPIC: '模板配置'
  }[code] || code)
export function downloadJson(name, rows) {
  saveAs(
    new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' }),
    name + '.json'
  )
}
export const copy = (value) => JSON.parse(JSON.stringify(value))
export function errorFor(f, v, values = {}) {
  if (v == null || String(v).trim() === '') return f.required ? '请填写' + f.label : ''
  if (
    f.type === 'number' &&
    (!Number.isFinite(Number(v)) || (f.min != null && +v < f.min) || (f.max != null && +v > f.max))
  ) { return '请输入范围内的数值' }
  if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return '请选择日期'
  if (f.gteField && values[f.gteField] != null && +v < +values[f.gteField]) return '应大于等于 ' + f.gteField
  if (f.type === 'select' && !(f.options || []).includes(v)) return '请选择有效选项'
  return ''
}
