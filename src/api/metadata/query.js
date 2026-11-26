import request from '@/utils/request'

export function listFdmDictChange(query) {
  return request({
    url: '/metadata/query/fdm/change/list',
    method: 'get',
    params: query
  })
}

export function listFdmDdl(query) {
  return request({
    url: '/metadata/query/fdm/ddl/list',
    method: 'get',
    params: query
  })
}

export function listFdmTabList(query) {
  return request({
    url: '/metadata/query/fdm/tab/list',
    method: 'get',
    params: query
  })
}

export function listFdmOptionList(query) {
  return request({
    url: '/metadata/query/fdm/option/list',
    method: 'get',
    params: query
  })
}

export function listMetadataSummary(query) {
  return request({
    url: '/metadata/query/summary/list',
    method: 'get',
    params: query
  })
}

export function listDwTheme(query) {
  return request({
    url: '/metadata/query/dw/theme/list',
    method: 'get',
    params: query
  })
}

export function listDwTable(query) {
  return request({
    url: '/metadata/query/dw/table/list',
    method: 'get',
    params: query
  })
}

export function listDwModelDict(query) {
  return request({
    url: '/metadata/query/dw/dict/list',
    method: 'get',
    params: query
  })
}
