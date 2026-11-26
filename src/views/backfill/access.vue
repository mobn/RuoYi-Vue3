<template>
  <div class="app-container bf">
    <h2>访问与权限</h2>
    <el-card shadow="never">
      <h3>双因素认证</h3>
      <p>
        {{ factor.active ? '账号已绑定验证器。' : '账号尚未绑定验证器。' }}
        {{ factor.mandatory ? '平台要求双因素认证。' : '' }}
      </p>
      <el-button type="primary" @click="bind">{{ factor.active ? '验证身份' : '绑定验证器' }}</el-button>
    </el-card>
    <el-card v-if="admin" shadow="never">
      <h3>角色可用菜单</h3>
      <el-select v-model="role" placeholder="选择角色" @change="choose">
        <el-option v-for="r in grants.roles" :key="r.role_id" :label="r.role_name" :value="r.role_id" />
      </el-select>
      <el-checkbox-group v-model="menus">
        <el-checkbox v-for="m in grants.menus" :key="m.menu_id" :value="m.menu_id">
          {{ m.menu_name }}
        </el-checkbox>
      </el-checkbox-group>
      <el-button :disabled="!role" @click="save">保存角色权限</el-button>
    </el-card>
    <el-card v-if="admin" shadow="never">
      <h3>用户角色分配</h3>
      <div class="bf-bar">
        <el-input v-model="account" placeholder="用户账号" />
        <el-select v-model="memberRole">
          <el-option v-for="(name, key) in memberRoles" :key="key" :label="name" :value="key" />
        </el-select>
        <el-button @click="member(true)">分配角色</el-button>
        <el-button @click="member(false)">撤销角色</el-button>
      </div>
    </el-card>
  </div>
</template>
<script>
import { get, post, enroll, verifyFactor } from '@/api/backfill'
export default {
  name: 'BackfillAccess',
  data: () => ({
    factor: {},
    grants: {},
    menus: [],
    role: null,
    account: '',
    memberRole: 'backfill_entry',
    memberRoles: {
      backfill_entry: '补录员',
      backfill_reviewer: '补录审核员',
      backfill_manager: '补录管理员'
    }
  }),
  computed: {
    admin() {
      return Number(this.$store.state.user.id) === 1
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      this.factor = await get('access/status')
      if (this.admin) this.grants = await get('access/grants')
    },
    async member(assign) {
      await post('access/member', { account: this.account, role: this.memberRole, assign })
      this.$message.success('角色分配已更新')
    },
    async bind() {
      if (!this.factor.active) await enroll()
      await verifyFactor()
      await this.load()
    },
    choose() {
      this.menus = this.grants.grants.filter((r) => r.role_id === this.role).map((r) => r.menu_id)
    },
    async save() {
      await post('access/grants', { role: this.role, menus: this.menus })
      await this.load()
      this.$message.success('已保存，重新登录后获取最新菜单')
    }
  }
}
</script>
<style scoped>
.el-card {
  margin: 14px 0;
}
.el-checkbox-group {
  margin: 16px 0;
}
</style>
