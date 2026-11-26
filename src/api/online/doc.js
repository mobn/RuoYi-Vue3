import request from '@/utils/request'

export function listOnlineDoc(query) {
  return request({
    url: '/online/doc/list',
    method: 'get',
    params: query
  })
}

export function getOnlineDoc(docId) {
  return request({
    url: '/online/doc/' + docId,
    method: 'get'
  })
}

export function addOnlineDoc(data) {
  return request({
    url: '/online/doc',
    method: 'post',
    data: data
  })
}

export function updateOnlineDoc(data) {
  return request({
    url: '/online/doc',
    method: 'put',
    data: data
  })
}

export function delOnlineDoc(docId) {
  return request({
    url: '/online/doc/' + docId,
    method: 'delete'
  })
}
