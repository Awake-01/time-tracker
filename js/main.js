// 新增：年终报告提示条控制逻辑
(function() {
  // 1. 获取当前时间
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12月
  const day = now.getDate();

  // 2. 判断是否在12.29-1.3期间
  const isAnnualReportPeriod = (month === 12 && day >= 29) || (month === 1 && day <= 3);

  // 3. 控制提示条显示/隐藏
  const tipBar = document.getElementById('annual-report-tip');
  if (tipBar) { // 防止找不到元素报错
    tipBar.style.display = isAnnualReportPeriod ? 'block' : 'none';
  }
})();
