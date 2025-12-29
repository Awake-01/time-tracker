// 年终报告提示条控制逻辑
(function() {
  // 获取当前时间
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12月
  const day = now.getDate();

  // 判断是否在12.29-1.3期间
  const isAnnualReportPeriod = (month === 12 && day >= 29) || (month === 1 && day <= 3);

  // 控制提示条显示/隐藏
  const tipBar = document.getElementById('annual-report-tip');
  if (tipBar) {
    tipBar.style.display = isAnnualReportPeriod ? 'block' : 'none';
  }
})();

// 时间记录器核心功能
class TimeTracker {
  constructor() {
    this.records = JSON.parse(localStorage.getItem('timeRecords')) || [];
    this.currentEditIndex = -1;
    this.init();
  }

  init() {
    this.bindEvents();
    this.showSection('record');
    this.updateLastRecord();
    this.updateStatistics();
    this.renderRecordsList();
    this.displayLastBackupTime();
    this.checkMonthlyBackupReminder();
  }

  // 绑定事件
  bindEvents() {
    // 导航切换
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const section = e.target.dataset.tab;
        this.showSection(section);
      });
    });

    // 记录按钮
    document.getElementById('record-btn').addEventListener('click', () => {
      this.recordTime();
    });

    // 导出数据
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportData();
    });

    // 导入数据
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    // 文件选择
    document.getElementById('import-file').addEventListener('change', (e) => {
      this.importData(e.target.files[0]);
    });

    // 清空数据
    document.getElementById('clear-btn').addEventListener('click', () => {
      this.clearData();
    });

    // 备份弹窗按钮
    document.getElementById('backup-now-btn')?.addEventListener('click', () => {
      this.backupNow();
    });

    document.getElementById('backup-later-btn')?.addEventListener('click', () => {
      this.remindLater();
    });
  }

  // 显示指定区域
  showSection(section) {
    // 更新导航激活状态
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${section}"]`).classList.add('active');

    // 更新内容区域显示
    document.querySelectorAll('.content-section').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');

    // 如果切换到统计页面，更新图表
    if (section === 'statistic') {
      this.updateStatistics();
    }
  }

  // 记录时间
  recordTime() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const remark = document.getElementById('remark-input').value.trim();

    const record = {
      time: timeStr,
      timestamp: now.getTime(),
      remark: remark
    };

    // 如果是编辑模式，更新现有记录
    if (this.currentEditIndex !== -1) {
      this.records[this.currentEditIndex] = record;
      this.currentEditIndex = -1;
      document.getElementById('record-btn').textContent = '记录此刻';
      document.getElementById('record-btn').classList.remove('edit-mode');
    } else {
      this.records.push(record);
    }

    // 保存数据
    this.saveData();
    
    // 清空输入框
    document.getElementById('remark-input').value = '';
    
    // 更新界面
    this.updateLastRecord();
    this.updateStatistics();
    this.renderRecordsList();
    
    // 显示成功提示
    this.showNotification('记录成功！', 'success');
  }

  // 更新上次记录显示
  updateLastRecord() {
    const lastRecordTime = document.getElementById('last-record-time');
    if (this.records.length > 0) {
      const lastRecord = this.records[this.records.length - 1];
      lastRecordTime.textContent = lastRecord.time + (lastRecord.remark ? ` (${lastRecord.remark})` : '');
    } else {
      lastRecordTime.textContent = '暂无记录';
    }
  }

  // 更新统计信息
  updateStatistics() {
    const totalRecords = this.records.length;
    const monthRecords = this.getMonthRecords();
    const weekRecords = this.getWeekRecords();

    document.getElementById('total-records').textContent = totalRecords;
    document.getElementById('month-records').textContent = monthRecords;
    document.getElementById('week-records').textContent = weekRecords;

    this.renderStatisticsChart();
  }

  // 获取本月记录数
  getMonthRecords() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return this.records.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    }).length;
  }

  // 获取本周记录数
  getWeekRecords() {
    const now = new Date();
    const currentWeek = this.getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    return this.records.filter(record => {
      const recordDate = new Date(record.timestamp);
      return this.getWeekNumber(recordDate) === currentWeek && recordDate.getFullYear() === currentYear;
    }).length;
  }

  // 获取周数
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  // 渲染统计图表
  renderStatisticsChart() {
    const chartDom = document.getElementById('statistic-chart');
    if (!chartDom) return;

    const myChart = echarts.init(chartDom);
    
    // 生成最近30天的数据
    const last30Days = [];
    const data = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      last30Days.push(dateStr);
      
      const dayRecords = this.records.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate.toDateString() === date.toDateString();
      }).length;
      
      data.push(dayRecords);
    }

    const option = {
      title: {
        text: '最近30天记录统计',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: last30Days,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        minInterval: 1
      },
      series: [
        {
          name: '记录数',
          type: 'bar',
          data: data,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' }
            ])
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#5a6fd8' },
                { offset: 1, color: '#6a4190' }
              ])
            }
          }
        }
      ]
    };

    myChart.setOption(option);
    
    setTimeout(() => {
      window.dispatchEvent(new Event('resize')); // 手动触发resize
    }, 100);
    
    // 响应式调整
    window.addEventListener('resize', () => {
      myChart.resize();
    });
  }

  // 渲染记录列表
  renderRecordsList() {
    const recordsList = document.getElementById('records-list');
    if (!recordsList) return;

    if (this.records.length === 0) {
      recordsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">暂无记录</div>';
      return;
    }

    // 按时间倒序排列
    const sortedRecords = [...this.records].sort((a, b) => b.timestamp - a.timestamp);

    recordsList.innerHTML = sortedRecords.map((record, index) => {
      const originalIndex = this.records.findIndex(r => r.timestamp === record.timestamp);
      return `
        <div class="record-item">
          <div class="record-info">
            <div class="record-time">${record.time}</div>
            <div class="record-remark">${record.remark || '无备注'}</div>
          </div>
          <div class="record-actions">
            <button class="edit-btn" onclick="timeTracker.editRecord(${originalIndex})">编辑</button>
            <button class="delete-btn" onclick="timeTracker.deleteRecord(${originalIndex})">删除</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 编辑记录
  editRecord(index) {
    const record = this.records[index];
    document.getElementById('remark-input').value = record.remark || '';
    document.getElementById('record-btn').textContent = '更新记录';
    document.getElementById('record-btn').classList.add('edit-mode');
    this.currentEditIndex = index;
    
    // 切换到记录页面
    this.showSection('record');
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 删除记录
  deleteRecord(index) {
    if (confirm('确定要删除这条记录吗？')) {
      this.records.splice(index, 1);
      this.saveData();
      this.updateLastRecord();
      this.updateStatistics();
      this.renderRecordsList();
      this.showNotification('记录已删除', 'success');
    }
  }

  // 导出数据
  exportData() {
    if (this.records.length === 0) {
      this.showNotification('暂无数据可导出', 'error');
      return;
    }

    const dataStr = JSON.stringify(this.records, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-records-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    // 记录备份时间
    this.updateLastBackupTime();
    
    this.showNotification('数据导出成功', 'success');
  }

  // 更新上次备份时间
  updateLastBackupTime() {
    const now = new Date();
    const backupTime = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    localStorage.setItem('lastBackupTime', backupTime);
    this.displayLastBackupTime();
  }

  // 显示上次备份时间
  displayLastBackupTime() {
    const lastBackupTime = localStorage.getItem('lastBackupTime');
    const lastBackupElement = document.getElementById('last-backup-time');
    if (lastBackupElement) {
      lastBackupElement.textContent = lastBackupTime ? `上次备份：${lastBackupTime}` : '上次备份：--';
    }
  }

  // 检查是否需要显示月度备份提醒
  checkMonthlyBackupReminder() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    
    // 只在1号检查
    if (currentDay !== 1) return;
    
    const lastReminderKey = 'lastBackupReminder';
    const lastReminder = localStorage.getItem(lastReminderKey);
    const currentMonthKey = `${currentYear}-${currentMonth}`;
    
    // 如果本月已经提醒过，不再显示
    if (lastReminder === currentMonthKey) return;
    
    // 显示备份提醒弹窗
    this.showBackupModal();
    
    // 记录本月已提醒
    localStorage.setItem(lastReminderKey, currentMonthKey);
  }

  // 显示备份提醒弹窗
  showBackupModal() {
    const modal = document.getElementById('backup-modal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  // 隐藏备份提醒弹窗
  hideBackupModal() {
    const modal = document.getElementById('backup-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // 立即备份
  backupNow() {
    this.hideBackupModal();
    this.exportData();
  }

  // 稍后提醒（3天后）
  remindLater() {
    const now = new Date();
    now.setDate(now.getDate() + 3);
    const reminderDate = now.toISOString().split('T')[0];
    localStorage.setItem('backupReminderLater', reminderDate);
    this.hideBackupModal();
  }

  // 导入数据
  importData(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (!Array.isArray(importedData)) {
          throw new Error('数据格式错误');
        }

        // 验证数据格式
        const isValid = importedData.every(item => 
          item.time && item.timestamp && typeof item.timestamp === 'number'
        );

        if (!isValid) {
          throw new Error('数据格式不正确');
        }

        // 合并数据
        this.records = [...this.records, ...importedData];
        
        // 去重
        const uniqueRecords = [];
        const timestamps = new Set();
        this.records.forEach(record => {
          if (!timestamps.has(record.timestamp)) {
            timestamps.add(record.timestamp);
            uniqueRecords.push(record);
          }
        });
        this.records = uniqueRecords;

        this.saveData();
        this.updateLastRecord();
        this.updateStatistics();
        this.renderRecordsList();
        
        this.showNotification(`成功导入 ${importedData.length} 条记录`, 'success');
        
      } catch (error) {
        this.showNotification('导入失败：' + error.message, 'error');
      }
    };
    
    reader.readAsText(file);
  }

  // 清空数据
  clearData() {
    if (confirm('确定要清空所有记录吗？此操作不可恢复！')) {
      this.records = [];
      this.saveData();
      this.updateLastRecord();
      this.updateStatistics();
      this.renderRecordsList();
      this.showNotification('数据已清空', 'success');
    }
  }

  // 保存数据到本地存储
  saveData() {
    localStorage.setItem('timeRecords', JSON.stringify(this.records));
  }

  // 显示通知
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加样式
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '6px',
      color: 'white',
      fontWeight: '500',
      zIndex: '1000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease'
    });

    // 根据类型设置背景色
    const colors = {
      success: '#27ae60',
      error: '#e74c3c',
      info: '#3498db'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // 添加到页面
    document.body.appendChild(notification);

    // 显示通知
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // 3秒后隐藏
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// 初始化应用
let timeTracker;
document.addEventListener('DOMContentLoaded', () => {
  timeTracker = new TimeTracker();
});
