import request from '@/utils/request'

// 查询周报列表
export function listReport(query) {
  return request({
    url: '/weekly/report/list',
    method: 'get',
    params: query
  })
}

// 查询周报详细
export function getReport(reportId) {
  return request({
    url: '/weekly/report/' + reportId,
    method: 'get'
  })
}

// 新增周报
export function addReport(data) {
  return request({
    url: '/weekly/report',
    method: 'post',
    data: data
  })
}

// 修改周报
export function updateReport(data) {
  return request({
    url: '/weekly/report',
    method: 'put',
    data: data
  })
}

// 删除周报
export function delReport(reportId) {
  return request({
    url: '/weekly/report/' + reportId,
    method: 'delete'
  })
}
