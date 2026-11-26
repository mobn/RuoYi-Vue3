import request from '@/utils/request'

export function queryMoia6(kind, data) {
  return request({
    url: '/monitor/moia6/' + kind,
    method: 'post',
    timeout: 75000,
    headers: { repeatSubmit: false },
    data
  })
}
