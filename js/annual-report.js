(function() {
  // ========== 第一步：核心配置（新增年份相关） ==========
  let currentYear = new Date().getFullYear(); // 默认选中当前年

  // 【替换这里】：改为你真实的记录读取逻辑
  function getAllRecordData() {
    return JSON.parse(localStorage.getItem('timeRecords'))
  }

  // 1. 获取指定年份的记录数据（核心筛选函数）
  function getRecordDataByYear(year) {
    const allRecords = getAllRecordData();
    return allRecords.filter(item => {
      const recordYear = new Date(item.time).getFullYear();
      return recordYear === year;
    });
  }

  // 2. 生成所有有记录的年份选项
  function generateYearOptions() {
    const allRecords = getAllRecordData();
    if (allRecords.length === 0) return [];
    
    // 提取所有不重复的年份
    const yearSet = new Set();
    allRecords.forEach(item => {
      yearSet.add(new Date(item.time).getFullYear());
    });
    const yearList = Array.from(yearSet).sort((a, b) => b - a); // 倒序排列
    
    // 渲染到下拉框
    const yearSelect = document.getElementById('year-select');
    yearSelect.innerHTML = yearList.map(year => 
      `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
    ).join('');

    // 监听年份切换
    yearSelect.addEventListener('change', function() {
      currentYear = Number(this.value);
      updateReportTitle(); // 更新标题
      renderAllData(); // 重新渲染数据
    });

    return yearList;
  }

  // 3. 更新报告标题
  function updateReportTitle() {
    document.getElementById('report-title').textContent = `${currentYear}年度时间记录报告`;
  }

  // ========== 第二步：数据统计核心函数（适配年份） ==========
  // 1. 月度数据统计
  function calcMonthlyData(records) {
    const monthlyCount = Array(12).fill(0);
    let total = 0;
    records.forEach(item => {
      const date = new Date(item.time);
      const month = date.getMonth(); // 0=1月，11=12月
      if (date.getFullYear() === currentYear) { // 双重校验
        monthlyCount[month]++;
        total++;
      }
    });
    return { monthlyCount, total };
  }

  // 2. 最多记录的月/周/日
  function calcMaxRecord(records) {
    const monthMap = {};
    const weekMap = {};
    const dayMap = {};
    const weekName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    records.forEach(item => {
      const date = new Date(item.time);
      if (date.getFullYear() !== currentYear) return; // 过滤非选中年份

      const month = date.getMonth() + 1;
      const week = date.getDay();
      const day = date.toLocaleDateString();

      monthMap[month] = (monthMap[month] || 0) + 1;
      weekMap[week] = (weekMap[week] || 0) + 1;
      dayMap[day] = (dayMap[day] || 0) + 1;
    });

    const maxMonth = Object.entries(monthMap).sort((a, b) => b[1] - a[1])[0] || ['--', 0];
    const maxWeek = Object.entries(weekMap).sort((a, b) => b[1] - a[1])[0] || ['--', 0];
    const maxDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0] || ['--', 0];

    return {
      maxMonth: { name: `${maxMonth[0]}月`, count: maxMonth[1] },
      maxWeek: { name: weekName[maxWeek[0]], count: maxWeek[1] },
      maxDay: { name: maxDay[0], count: maxDay[1] }
    };
  }

  // 3. 最早/最晚记录（7点分界）
  function calcExtremeTime(records) {
    const filteredRecords = records.filter(item => {
      return new Date(item.time).getFullYear() === currentYear;
    });
    if (filteredRecords.length === 0) return { earliest: {}, latest: {} };

    const formatTime = (timeStr) => {
      const date = new Date(timeStr);
      const hour = date.getHours();
      const minute = date.getMinutes();
      return {
        timestamp: date.getTime(),
        timeStr: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        dateStr: date.toLocaleDateString(),
        type: hour < 7 ? '夜晚' : '白天'
      };
    };

    const formattedRecords = filteredRecords.map(item => formatTime(item.time));
    const earliest = formattedRecords.sort((a, b) => a.timestamp - b.timestamp)[0];
    const latest = formattedRecords.sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
      earliest: { time: earliest.timeStr, date: earliest.dateStr, type: earliest.type },
      latest: { time: latest.timeStr, date: latest.dateStr, type: latest.type }
    };
  }

  // ========== 第三步：页面渲染（适配年份） ==========
  // 1. 分页切换（保留不变）
  function initTabs() {
    const tabs = document.querySelectorAll('.report-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.report-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
      });
    });
  }

  // 2. 渲染月度图表（保留不变，仅数据源适配年份）
  function renderMonthlyChart(monthlyCount) {
    const chartDom = document.getElementById('monthly-chart');
    const myChart = echarts.init(chartDom);
    const option = {
      title: { text: `${currentYear}年月度记录数统计` }, // 动态年份
      tooltip: { trigger: 'axis' },
      legend: { data: ['记录数', '趋势'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'] },
      yAxis: { type: 'value', min: 0 },
      series: [
        { name: '记录数', type: 'bar', data: monthlyCount, itemStyle: { color: '#667eea' } },
        { name: '趋势', type: 'line', data: monthlyCount, smooth: true, itemStyle: { color: '#764ba2' } }
      ]
    };
    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
  }

  // 3. 渲染所有数据（核心：按选中年份筛选）
  function renderAllData() {
    const records = getRecordDataByYear(currentYear); // 按年份筛选数据
    if (records.length === 0) {
      alert(`暂无${currentYear}年记录数据！`);
      // 清空图表和数据
      document.getElementById('total-count').textContent = 0;
      document.getElementById('monthly-data-list').innerHTML = '';
      const chartDom = document.getElementById('monthly-chart');
      const myChart = echarts.init(chartDom);
      myChart.clear();
      return;
    }

    // 月度数据
    const { monthlyCount, total } = calcMonthlyData(records);
    document.getElementById('total-count').textContent = total;
    document.getElementById('monthly-data-list').innerHTML = monthlyCount.map((count, i) => `${i+1}月：${count} 次`).join('<br>');
    renderMonthlyChart(monthlyCount);

    // 最多记录时段
    const { maxMonth, maxWeek, maxDay } = calcMaxRecord(records);
    document.getElementById('max-month').textContent = maxMonth.name;
    document.getElementById('max-month-count').textContent = maxMonth.count;
    document.getElementById('max-week').textContent = maxWeek.name;
    document.getElementById('max-week-count').textContent = maxWeek.count;
    document.getElementById('max-day').textContent = maxDay.name;
    document.getElementById('max-day-count').textContent = maxDay.count;

    // 最早/最晚记录
    const { earliest, latest } = calcExtremeTime(records);
    document.getElementById('earliest-time').textContent = earliest.time || '--';
    document.getElementById('earliest-date').textContent = earliest.date || '--';
    document.getElementById('earliest-type').textContent = earliest.type || '--';
    document.getElementById('latest-time').textContent = latest.time || '--';
    document.getElementById('latest-date').textContent = latest.date || '--';
    document.getElementById('latest-type').textContent = latest.type || '--';
  }

  // ========== 初始化（新增年份逻辑） ==========
  window.onload = function() {
    initTabs(); // 初始化分页
    generateYearOptions(); // 生成年份选项
    updateReportTitle(); // 更新标题
    renderAllData(); // 渲染数据
  };
})();
