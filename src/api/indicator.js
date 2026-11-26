import request from '@/utils/request'

export function getCatalog() {
  return request({ url: '/indicator/catalog', method: 'get' })
}

export function saveChange(kind, change) {
  return request({ url: '/indicator/' + kind + '/save', method: 'post', data: change })
}

export function previewWorkbook(kind, file) {
  const data = new FormData()
  data.append('file', file)
  return request({ url: '/indicator/' + kind + '/preview', method: 'post', data,
    headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false }, timeout: 60000 })
}
