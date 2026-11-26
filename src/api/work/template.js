import request from '@/utils/request'

export function listTemplate(query) {
  return request({
    url: '/work/template/list',
    method: 'get',
    params: query
  })
}

export function listActiveTemplate() {
  return request({
    url: '/work/template/active',
    method: 'get'
  })
}

export function getTemplate(templateId) {
  return request({
    url: '/work/template/' + templateId,
    method: 'get'
  })
}

export function getTemplateByKey(templateKey) {
  return request({
    url: '/work/template/key/' + templateKey,
    method: 'get'
  })
}

export function addTemplate(data) {
  return request({
    url: '/work/template',
    method: 'post',
    data: data
  })
}

export function updateTemplate(data) {
  return request({
    url: '/work/template',
    method: 'put',
    data: data
  })
}

export function delTemplate(templateId) {
  return request({
    url: '/work/template/' + templateId,
    method: 'delete'
  })
}
