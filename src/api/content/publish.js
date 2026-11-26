import request from '@/utils/request'

// 查询内容发布列表
export function listContent(query) {
  return request({
    url: '/system/content/list',
    method: 'get',
    params: query
  })
}

// 查询内容发布详细
export function getContent(contentId) {
  return request({
    url: '/system/content/' + contentId,
    method: 'get'
  })
}

// 新增内容发布
export function addContent(data) {
  return request({
    url: '/system/content',
    method: 'post',
    data: data
  })
}

// 修改内容发布
export function updateContent(data) {
  return request({
    url: '/system/content',
    method: 'put',
    data: data
  })
}

// 删除内容发布
export function delContent(contentId) {
  return request({
    url: '/system/content/' + contentId,
    method: 'delete'
  })
}

// 获取已发布内容列表（首页展示）
export function listPublishedContent() {
  return request({
    url: '/system/content/published',
    method: 'get'
  })
}
