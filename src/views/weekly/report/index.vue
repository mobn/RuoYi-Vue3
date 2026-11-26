<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="90px">
      <el-form-item label="填写人" prop="createBy">
        <el-input
          v-model="queryParams.createBy"
          placeholder="请输入填写人"
          clearable
          style="width: 200px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="周报日期">
        <el-date-picker
          v-model="dateRange"
          style="width: 240px"
          value-format="yyyy-MM-dd"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        ></el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" size="small" @click="handleAdd" v-hasPermi="['weekly:report:add']">填写周报</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" size="small" :disabled="single" @click="handleUpdate" v-hasPermi="['weekly:report:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" size="small" :disabled="multiple" @click="handleDelete" v-hasPermi="['weekly:report:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['weekly:report:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 周报列表 -->
    <el-table v-loading="loading" :data="reportList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="周报编号" align="center" prop="reportId" width="100" />
      <el-table-column label="填写人" align="center" prop="nickName" width="120" />
      <el-table-column label="周报日期" align="center" prop="reportDate" width="120">
        <template #default="scope">
          <span>{{ parseTime(scope.row.reportDate, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="周期" align="center" width="200">
        <template #default="scope">
          <span v-if="scope.row.weekStart && scope.row.weekEnd">
            {{ parseTime(scope.row.weekStart, '{y}-{m}-{d}') }} ~ {{ parseTime(scope.row.weekEnd, '{y}-{m}-{d}') }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="本周工作总结" align="left" prop="weekSummary" min-width="220" :show-overflow-tooltip="true" />
      <el-table-column label="下周工作计划" align="left" prop="nextWeekPlan" min-width="220" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="180">
        <template #default="scope">
          <el-button size="small" text icon="View" @click="handleView(scope.row)" v-hasPermi="['weekly:report:query']">查看</el-button>
          <el-button size="small" text icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['weekly:report:edit']">修改</el-button>
          <el-button size="small" text icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['weekly:report:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加或修改周报对话框 -->
    <el-dialog :title="title" v-model="open" width="1100px" append-to-body :close-on-click-modal="false">
      <el-form ref="form" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="周报日期" prop="reportDate">
              <el-date-picker v-model="form.reportDate" type="date" value-format="yyyy-MM-dd" placeholder="选择填写日期" style="width: 100%"></el-date-picker>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          <span style="font-size: 15px; font-weight: bold;">工作总结与计划</span>
        </el-divider>
        <el-form-item label="本周工作总结" prop="weekSummary">
          <el-input v-model="form.weekSummary" type="textarea" :rows="3" placeholder="请总结本周整体工作情况" />
        </el-form-item>
        <el-form-item label="下周工作计划" prop="nextWeekPlan">
          <el-input v-model="form.nextWeekPlan" type="textarea" :rows="3" placeholder="请填写下周工作计划" />
        </el-form-item>
        <el-form-item label="需要的支持" prop="needSupport">
          <el-input v-model="form.needSupport" type="textarea" :rows="2" placeholder="需要领导或同事协助的事项（选填）" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" placeholder="其他补充说明（选填）" />
        </el-form-item>
      </el-form>
      <template #footer><div class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div></template>
    </el-dialog>

    <!-- 周报详情对话框：字段与填写页面保持一致 -->
    <el-dialog
      title="查看周报"
      v-model="viewOpen"
      width="900px"
      top="5vh"
      custom-class="weekly-report-view-dialog"
      append-to-body
    >
      <div class="weekly-report-view">
        <div class="report-view-header">
          <div class="report-view-title">
            <div class="report-view-title__icon">
              <el-icon><Document /></el-icon>
            </div>
            <div>
              <div class="report-view-title__text">周报详情</div>
              <div class="report-view-title__sub">完整保留换行、缩进和代码格式</div>
            </div>
          </div>
          <el-tag size="small" effect="plain">编号 #{{ viewForm.reportId }}</el-tag>
        </div>

        <div class="report-view-meta">
          <div class="report-view-meta__item">
            <el-icon><User /></el-icon>
            <span class="report-view-meta__label">填写人</span>
            <strong>{{ viewForm.nickName || viewForm.createBy || '-' }}</strong>
          </div>
          <div class="report-view-meta__item">
            <el-icon><Calendar /></el-icon>
            <span class="report-view-meta__label">周报日期</span>
            <strong>{{ parseTime(viewForm.reportDate, '{y}-{m}-{d}') || '-' }}</strong>
          </div>
          <div class="report-view-meta__item">
            <el-icon><Clock /></el-icon>
            <span class="report-view-meta__label">创建时间</span>
            <strong>{{ parseTime(viewForm.createTime) || '-' }}</strong>
          </div>
        </div>

        <section class="report-content-card report-content-card--summary">
          <div class="report-content-card__header">
            <div class="report-content-card__title">
              <span class="report-content-card__index">01</span>
              <span>本周工作总结</span>
            </div>
            <el-button
              v-if="hasReportContent(viewForm.weekSummary)"
              text
              icon="DocumentCopy"
              @click="copyReportContent(viewForm.weekSummary)"
            >复制</el-button>
          </div>
          <pre
            class="report-content-card__body"
            :class="{ 'is-empty': !hasReportContent(viewForm.weekSummary) }"
          >{{ displayReportContent(viewForm.weekSummary) }}</pre>
        </section>

        <section class="report-content-card report-content-card--plan">
          <div class="report-content-card__header">
            <div class="report-content-card__title">
              <span class="report-content-card__index">02</span>
              <span>下周工作计划</span>
            </div>
            <el-button
              v-if="hasReportContent(viewForm.nextWeekPlan)"
              text
              icon="DocumentCopy"
              @click="copyReportContent(viewForm.nextWeekPlan)"
            >复制</el-button>
          </div>
          <pre
            class="report-content-card__body"
            :class="{ 'is-empty': !hasReportContent(viewForm.nextWeekPlan) }"
          >{{ displayReportContent(viewForm.nextWeekPlan) }}</pre>
        </section>

        <div class="report-content-grid">
          <section class="report-content-card report-content-card--support">
            <div class="report-content-card__header">
              <div class="report-content-card__title">
                <span class="report-content-card__index">03</span>
                <span>需要的支持</span>
              </div>
              <el-button
                v-if="hasReportContent(viewForm.needSupport)"
                text
                icon="DocumentCopy"
                @click="copyReportContent(viewForm.needSupport)"
              >复制</el-button>
            </div>
            <pre
              class="report-content-card__body report-content-card__body--compact"
              :class="{ 'is-empty': !hasReportContent(viewForm.needSupport) }"
            >{{ displayReportContent(viewForm.needSupport) }}</pre>
          </section>

          <section class="report-content-card report-content-card--remark">
            <div class="report-content-card__header">
              <div class="report-content-card__title">
                <span class="report-content-card__index">04</span>
                <span>备注</span>
              </div>
              <el-button
                v-if="hasReportContent(viewForm.remark)"
                text
                icon="DocumentCopy"
                @click="copyReportContent(viewForm.remark)"
              >复制</el-button>
            </div>
            <pre
              class="report-content-card__body report-content-card__body--compact"
              :class="{ 'is-empty': !hasReportContent(viewForm.remark) }"
            >{{ displayReportContent(viewForm.remark) }}</pre>
          </section>
        </div>
      </div>

      <template #footer><div class="dialog-footer">
        <el-button type="primary" @click="viewOpen = false">关 闭</el-button>
      </div></template>
    </el-dialog>
  </div>
</template>

<script>
import { listReport, getReport, delReport, addReport, updateReport } from "@/api/weekly/report";

export default {
  name: "WeeklyReport",
  data() {
    return {
      loading: true,
      ids: [],
      single: true,
      multiple: true,
      showSearch: true,
      total: 0,
      reportList: [],
      title: "",
      open: false,
      viewOpen: false,
      viewForm: {},
      dateRange: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        createBy: undefined
      },
      form: {},
      rules: {
        reportDate: [
          { required: true, message: "周报日期不能为空", trigger: "change" }
        ]
      }
    };
  },
  created() {
    this.getList();
  },
  methods: {
    /** 查询周报列表 */
    getList() {
      this.loading = true;
      const queryParams = { ...this.queryParams };
      if (this.dateRange && this.dateRange.length === 2) {
        queryParams["params[beginReportDate]"] = this.dateRange[0];
        queryParams["params[endReportDate]"] = this.dateRange[1];
      }
      listReport(queryParams).then(response => {
        this.reportList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    cancel() {
      this.open = false;
      this.reset();
    },
    reset() {
      // 获取本周一和本周日
      const now = new Date();
      const dayOfWeek = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      this.form = {
        reportId: undefined,
        reportDate: formatDate(now),
        weekStart: formatDate(monday),
        weekEnd: formatDate(sunday),
        weekSummary: undefined,
        nextWeekPlan: undefined,
        needSupport: undefined,
        remark: undefined,
        details: []
      };
      this.resetForm("form");
    },
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    resetQuery() {
      this.dateRange = [];
      this.resetForm("queryForm");
      this.handleQuery();
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.reportId);
      this.single = selection.length !== 1;
      this.multiple = !selection.length;
    },
    /** 新增 */
    handleAdd() {
      this.reset();
      this.open = true;
      this.title = "填写周报";
    },
    /** 查看 */
    handleView(row) {
      getReport(row.reportId).then(response => {
        this.viewForm = response.data;
        this.viewOpen = true;
      });
    },
    /** 判断周报字段是否有可展示内容 */
    hasReportContent(content) {
      return content !== undefined && content !== null && String(content).trim() !== '';
    },
    /** 空内容统一展示占位文案 */
    displayReportContent(content) {
      return this.hasReportContent(content) ? content : '暂无内容';
    },
    /** 复制周报内容，便于复用其中的命令和代码 */
    copyReportContent(content) {
      if (!this.hasReportContent(content)) {
        this.$modal.msgWarning('暂无可复制内容');
        return;
      }
      const text = String(content);
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          this.$modal.msgSuccess('复制成功');
        }).catch(() => this.copyReportContentFallback(text));
        return;
      }
      this.copyReportContentFallback(text);
    },
    /** 兼容 HTTP 环境和旧版浏览器的复制方式 */
    copyReportContentFallback(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.$modal.msgSuccess('复制成功');
      } catch (error) {
        this.$modal.msgError('复制失败，请手动选择内容');
      } finally {
        document.body.removeChild(textarea);
      }
    },
    /** 修改 */
    handleUpdate(row) {
      this.reset();
      const reportId = row.reportId || this.ids;
      getReport(reportId).then(response => {
        this.form = response.data;
        if (!this.form.details) {
          this.form.details = [];
        }
        this.open = true;
        this.title = "修改周报";
      });
    },
    /** 提交 */
    submitForm() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.reportId !== undefined) {
            updateReport(this.form).then(response => {
              this.$modal.msgSuccess("修改成功");
              this.open = false;
              this.getList();
            });
          } else {
            addReport(this.form).then(response => {
              this.$modal.msgSuccess("提交成功");
              this.open = false;
              // 新增记录按创建时间排在列表最前面，提交后回到未筛选的第一页，
              // 避免仍停留在旧分页或筛选条件下造成“新增成功但页面不显示”。
              this.queryParams.pageNum = 1;
              this.queryParams.createBy = undefined;
              this.dateRange = [];
              this.getList();
            });
          }
        }
      });
    },
    /** 删除 */
    handleDelete(row) {
      const reportIds = row.reportId || this.ids;
      this.$modal.confirm('是否确认删除周报编号为"' + reportIds + '"的数据项？').then(function() {
        return delReport(reportIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("删除成功");
      }).catch(() => {});
    },
    /** 导出 */
    handleExport() {
      this.download('/weekly/report/export', {
        ...this.queryParams
      }, `周报数据_${new Date().getTime()}.xlsx`);
    }
  }
};
</script>

<style scoped>
::v-deep .weekly-report-view-dialog {
  max-width: calc(100vw - 32px);
  border-radius: 12px;
  overflow: hidden;
}

::v-deep .weekly-report-view-dialog .el-dialog__header {
  padding: 18px 24px;
  border-bottom: 1px solid #ebeef5;
}

::v-deep .weekly-report-view-dialog .el-dialog__body {
  max-height: calc(90vh - 132px);
  padding: 20px 24px 8px;
  overflow-y: auto;
  background: #f5f7fa;
}

::v-deep .weekly-report-view-dialog .el-dialog__footer {
  padding: 14px 24px;
  border-top: 1px solid #ebeef5;
  background: #ffffff;
}

.weekly-report-view {
  color: #303133;
}

.report-view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border: 1px solid #d9ecff;
  border-radius: 10px;
  background: linear-gradient(135deg, #ecf5ff 0%, #ffffff 100%);
}

.report-view-title {
  display: flex;
  align-items: center;
  min-width: 0;
}

.report-view-title__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  height: 42px;
  margin-right: 12px;
  border-radius: 10px;
  color: #ffffff;
  font-size: 21px;
  background: #409eff;
  box-shadow: 0 6px 14px rgba(64, 158, 255, 0.24);
}

.report-view-title__text {
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
}

.report-view-title__sub {
  margin-top: 2px;
  color: #909399;
  font-size: 12px;
}

.report-view-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;
}

.report-view-meta__item {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
}

.report-view-meta__item > i {
  flex: 0 0 auto;
  margin-right: 8px;
  color: #409eff;
  font-size: 16px;
}

.report-view-meta__label {
  flex: 0 0 auto;
  margin-right: 8px;
  color: #909399;
}

.report-view-meta__item strong {
  min-width: 0;
  overflow: hidden;
  color: #303133;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-content-card {
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.04);
}

.report-content-card--summary {
  border-top: 3px solid #409eff;
}

.report-content-card--plan {
  border-top: 3px solid #67c23a;
}

.report-content-card--support {
  border-top: 3px solid #e6a23c;
}

.report-content-card--remark {
  border-top: 3px solid #909399;
}

.report-content-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #ebeef5;
}

.report-content-card__title {
  display: flex;
  align-items: center;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.report-content-card__index {
  margin-right: 10px;
  color: #a8abb2;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  font-weight: normal;
}

.report-content-card__body {
  min-height: 96px;
  max-height: 360px;
  margin: 0;
  padding: 16px 18px;
  overflow: auto;
  color: #303133;
  font-family: Consolas, Monaco, "Courier New", "Microsoft YaHei", monospace;
  font-size: 14px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  tab-size: 4;
  white-space: pre-wrap;
}

.report-content-card__body--compact {
  min-height: 72px;
  max-height: 220px;
}

.report-content-card__body.is-empty {
  color: #c0c4cc;
  font-family: "Microsoft YaHei", sans-serif;
  font-style: italic;
}

.report-content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 768px) {
  .report-view-header {
    align-items: flex-start;
  }

  .report-view-meta,
  .report-content-grid {
    grid-template-columns: 1fr;
  }

  .report-view-title__sub {
    display: none;
  }
}
</style>
