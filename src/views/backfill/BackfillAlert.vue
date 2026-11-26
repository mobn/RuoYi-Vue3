<script>
import { get } from '@/api/backfill'
export default {
  name: 'BackfillAlert',
  data: () => ({ last: null, timer: null, stopped: false }),
  mounted() {
    this.poll()
  },
  beforeUnmount() {
    this.stopped = true
    clearTimeout(this.timer)
  },
  methods: {
    async poll() {
      try {
        if (document.visibilityState === 'visible') {
          const state = await get('access/status')
          if ((!state.active && !state.mandatory) || state.verified) {
            const rows = await get('messages')
            if (this.stopped) return
            const fresh = rows.filter((r) => !Number(r.seen) && this.last !== null && r.id > this.last)
            if (fresh.length) {
              this.$notify({
                title: '补录消息',
                message: fresh[0].body + (fresh.length > 1 ? '（共 ' + fresh.length + ' 条新消息）' : ''),
                duration: 5000,
                onClick: () => {
                  if (this.$route.path !== '/backfill/messages') this.$router.push('/backfill/messages')
                }
              })
            }
            if (rows.length) this.last = rows[0].id
            else this.last = 0
          }
        }
      } finally {
        if (!this.stopped) this.timer = setTimeout(this.poll, 10000)
      }
    }
  },
  render: () => null
}
</script>
