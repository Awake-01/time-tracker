// 年度报告功能
(function() {
  // 全局变量
  let currentYear = new Date().getFullYear();
  let allRecords = [];

  // ========== 数据管理函数 ==========
  
  // 获取所有记录数据
  function getAllRecordData() {
    try {
      const records = JSON.parse(localStorage.getItem('timeRecords')) || [];
      // 确保记录格式正确
      return records.filter(record => 
        record.time && record.timestamp && typeof record.timestamp === 'number'
      );
    } catch (error) {
      console.error('读取记录数据失败:', error);
      return [];
    }
  }

  // 获取指定年份的记录
  function getRecordsByYear(year) {
    return allRecords.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate.getFullYear() === year;
    });
  }

  // 生成年份选项
  function generateYearOptions() {
    const yearSelect = document.getElementById('year-select');
    if (!yearSelect) return;

    // 提取所有不重复的年份
    const yearSet = new Set();
    allRecords.forEach(record => {
      const recordDate = new Date(record.timestamp);
      yearSet.add(recordDate.getFullYear());
    });

    const yearList = Array.from(yearSet).sort((a, b) => b - a); // 倒序排列

    if (yearList.length === 0) {
      yearSelect.innerHTML = '<option value="">暂无数据</option>';
      yearSelect.disabled = true;
      return;
    }

    // 生成选项
    yearSelect.innerHTML = yearList.map(year => 
      `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
    ).join('');

    // 如果当前年份没有数据，选择第一个有数据的年份
    if (!yearList.includes(currentYear)) {
      currentYear = yearList[0];
      yearSelect.value = currentYear;
    }

    // 监听年份变化
    yearSelect.addEventListener('change', function() {
      currentYear = Number(this.value);
      updateReportTitle();
      renderAllData();
    });
  }

  // 更新报告标题
  function updateReportTitle() {
    const title = document.getElementById('report-title');
    if (title) {
      title.textContent = `${currentYear}年度时间记录报告`;
    }
  }

  // ========== 数据统计函数 ==========

  // 月度数据统计
  function calculateMonthlyData(records) {
    const monthlyCount = Array(12).fill(0);
    let total = 0;

    records.forEach(record => {
      const recordDate = new Date(record.timestamp);
      if (recordDate.getFullYear() === currentYear) {
        const month = recordDate.getMonth(); // 0-11
        monthlyCount[month]++;
        total++;
      }
    });

    return { monthlyCount, total };
  }

  // 最多记录时段统计
  function calculateMaxRecords(records) {
    const monthMap = {};
    const weekMap = {};
    const dayMap = {};
    const weekName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    records.forEach(record => {
      const recordDate = new Date(record.timestamp);
      if (recordDate.getFullYear() !== currentYear) return;

      // 月份统计
      const month = recordDate.getMonth() + 1;
      monthMap[month] = (monthMap[month] || 0) + 1;

      // 周统计
      const week = recordDate.getDay();
      weekMap[week] = (weekMap[week] || 0) + 1;

      // 日统计
      const day = recordDate.toLocaleDateString('zh-CN');
      dayMap[day] = (dayMap[day] || 0) + 1;
    });

    // 找出最大值
    const maxMonth = Object.entries(monthMap).sort((a, b) => b[1] - a[1])[0] || ['--', 0];
    const maxWeek = Object.entries(weekMap).sort((a, b) => b[1] - a[1])[0] || ['--', 0];
    const maxDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0] || ['--', 0];

    return {
      maxMonth: { name: `${maxMonth[0]}月`, count: maxMonth[1] },
      maxWeek: { name: weekName[maxWeek[0]], count: maxWeek[1] },
      maxDay: { name: maxDay[0], count: maxDay[1] }
    };
  }

  // 最早/最晚记录统计
  function calculateExtremeTimes(records) {
    const yearRecords = records.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate.getFullYear() === currentYear;
    });

    if (yearRecords.length === 0) {
      return { earliest: {}, latest: {} };
    }

    // 格式化时间
    const formatTime = (record) => {
      const recordDate = new Date(record.timestamp);
      const hour = recordDate.getHours();
      const minute = recordDate.getMinutes();
      return {
        record: record,
        timestamp: recordDate.getTime(),
        timeStr: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        dateStr: recordDate.toLocaleDateString('zh-CN'),
        type: hour < 7 ? '夜晚' : '白天'
      };
    };

    const formattedRecords = yearRecords.map(formatTime);

    // 找出最早和最晚
    const earliest = formattedRecords.sort((a, b) => a.timestamp - b.timestamp)[0];
    const latest = formattedRecords.sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
      earliest: {
        time: earliest.timeStr,
        date: earliest.dateStr,
        type: earliest.type
      },
      latest: {
        time: latest.timeStr,
        date: latest.dateStr,
        type: latest.type
      }
    };
  }

  // ========== 页面渲染函数 ==========

  // 初始化分页切换
  function initTabs() {
    const tabs = document.querySelectorAll('.report-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // 更新tab状态
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 更新内容显示
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.report-content').forEach(content => {
          content.classList.remove('active');
        });
        const targetContent = document.getElementById(tabId);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // 渲染月度图表
  function renderMonthlyChart(monthlyCount) {
    const chartDom = document.getElementById('monthly-chart');
    if (!chartDom) return;

    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: `${currentYear}年月度记录数统计`,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['记录数', '趋势'],
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        axisLabel: {
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        name: '记录数'
      },
      series: [
        {
          name: '记录数',
          type: 'bar',
          data: monthlyCount,
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
        },
        {
          name: '趋势',
          type: 'line',
          data: monthlyCount,
          smooth: true,
          itemStyle: {
            color: '#764ba2'
          },
          lineStyle: {
            width: 3
          },
          symbol: 'circle',
          symbolSize: 8
        }
      ]
    };

    myChart.setOption(option);

    // 响应式调整
    window.addEventListener('resize', () => {
      myChart.resize();
    });
  }

  // 渲染月度数据列表
  function renderMonthlyDataList(monthlyCount) {
    const listContainer = document.getElementById('monthly-data-list');
    if (!listContainer) return;

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    const html = monthlyCount.map((count, index) => 
      `<div class="data-item"><span>${monthNames[index]}：</span><span>${count} 次</span></div>`
    ).join('');

    listContainer.innerHTML = html;
  }

  // 渲染最多记录时段
  function renderMaxRecords(maxRecords) {
    document.getElementById('max-month').textContent = maxRecords.maxMonth.name;
    document.getElementById('max-month-count').textContent = maxRecords.maxMonth.count;
    document.getElementById('max-week').textContent = maxRecords.maxWeek.name;
    document.getElementById('max-week-count').textContent = maxRecords.maxWeek.count;
    document.getElementById('max-day').textContent = maxRecords.maxDay.name;
    document.getElementById('max-day-count').textContent = maxRecords.maxDay.count;
  }

  // 渲染极端时间记录
  function renderExtremeTimes(extremeTimes) {
    const earliest = extremeTimes.earliest;
    const latest = extremeTimes.latest;

    document.getElementById('earliest-time').textContent = earliest.time || '--';
    document.getElementById('earliest-date').textContent = earliest.date || '--';
    document.getElementById('earliest-type').textContent = earliest.type || '--';
    document.getElementById('latest-time').textContent = latest.time || '--';
    document.getElementById('latest-date').textContent = latest.date || '--';
    document.getElementById('latest-type').textContent = latest.type || '--';
  }

  // 渲染所有数据
  function renderAllData() {
    const yearRecords = getRecordsByYear(currentYear);

    if (yearRecords.length === 0) {
      // 清空所有数据显示
      document.getElementById('total-count').textContent = '0';
      document.getElementById('monthly-data-list').innerHTML = '<div class="data-item">暂无数据</div>';
      
      // 清空图表
      const chartDom = document.getElementById('monthly-chart');
      if (chartDom) {
        const myChart = echarts.init(chartDom);
        myChart.clear();
      }

      // 清空其他统计
      document.getElementById('max-month').textContent = '--';
      document.getElementById('max-month-count').textContent = '0';
      document.getElementById('max-week').textContent = '--';
      document.getElementById('max-week-count').textContent = '0';
      document.getElementById('max-day').textContent = '--';
      document.getElementById('max-day-count').textContent = '0';
      
      document.getElementById('earliest-time').textContent = '--';
      document.getElementById('earliest-date').textContent = '--';
      document.getElementById('earliest-type').textContent = '--';
      document.getElementById('latest-time').textContent = '--';
      document.getElementById('latest-date').textContent = '--';
      document.getElementById('latest-type').textContent = '--';

      return;
    }

    // 月度数据
    const { monthlyCount, total } = calculateMonthlyData(yearRecords);
    document.getElementById('total-count').textContent = total;
    renderMonthlyDataList(monthlyCount);
    renderMonthlyChart(monthlyCount);

    // 最多记录时段
    const maxRecords = calculateMaxRecords(yearRecords);
    renderMaxRecords(maxRecords);

    // 极端时间记录
    const extremeTimes = calculateExtremeTimes(yearRecords);
    renderExtremeTimes(extremeTimes);
  }

  // 初始化应用
  function init() {
    // 获取所有记录数据
    allRecords = getAllRecordData();

    // 初始化年份选择器
    generateYearOptions();

    // 更新报告标题
    updateReportTitle();

    // 初始化分页
    initTabs();

    // 渲染数据
    renderAllData();
  }

  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', init);
})();
