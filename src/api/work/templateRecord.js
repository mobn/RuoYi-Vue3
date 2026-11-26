import request from '@/utils/request'

export function listTemplateRecord(templateId) {
  return request({
    url: '/work/templateRecord/template/' + templateId,
    method: 'get'
  })
}

export function getTemplateRecord(recordId) {
  return request({
    url: '/work/templateRecord/' + recordId,
    method: 'get'
  })
}

export function addTemplateRecord(data) {
  return request({
    url: '/work/templateRecord',
    method: 'post',
    data: data
  })
}

export function updateTemplateRecord(data) {
  return request({
    url: '/work/templateRecord',
    method: 'put',
    data: data
  })
}

export function delTemplateRecord(recordId) {
  return request({
    url: '/work/templateRecord/' + recordId,
    method: 'delete'
  })
}
