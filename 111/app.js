/**
 * 消费基因扫描 - 核心逻辑
 * 处理：卡密验证、页面切换、答题逻辑、算分、Chart.js图表
 */

// 全局状态
const state = {
  keys: [],
  questions: [],
  homeConfig: null,
  infoFields: null,
  dimensions: [],
  scoring: {},
  levelLabels: {},
  personalityTypes: {},
  dimensionAnalysis: {},
  analysisTexts: [],

  // 用户状态
  isActivated: false,
  answers: {},
  userInfo: {},

  // 当前状态
  currentQuestionIndex: 0,
  results: null
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initApp();
});

// 加载JSON数据
async function loadData() {
  try {
    // 只加载 questions.json（不加载 keys.json，密钥在服务器端验证）
    const questionsRes = await fetch('questions.json');
    if (!questionsRes.ok) throw new Error('questions.json not found');
    const questionsData = await questionsRes.json();

    state.questions = questionsData.questions;
    state.homeConfig = questionsData.homeConfig;
    state.infoFields = questionsData.infoFields;
    state.dimensions = questionsData.dimensions;
    state.scoring = questionsData.scoring;
    state.levelLabels = questionsData.levelLabels;
    state.personalityTypes = questionsData.personalityTypes;
    state.dimensionAnalysis = questionsData.dimensionAnalysis;
    state.analysisTexts = questionsData.analysisTexts;

    console.log('数据加载成功', {
      questions: state.questions.length,
      dimensions: state.dimensions.length
    });
  } catch (error) {
    console.error('数据加载失败:', error);
    // 兼容处理：如果fetch失败，使用内嵌数据
    loadFallbackData();
  }
}

// 回退数据（当fetch失败时）
function loadFallbackData() {
  console.log('使用内置数据');

  // 默认卡密
  state.keys = new Set(['8888', 'TEST2024']);

  // 默认配置（简化版）
  state.homeConfig = {
    tags: [
      { icon: '🔒', text: '隐私保护' },
      { icon: '⚡', text: '快速分析' },
      { icon: '🎯', text: '专业精准' }
    ],
    title: '消费基因扫描',
    subtitle: '基于行为心理学与消费决策科学设计',
    description: '我们致力于为您提供科学、安全、有价值的消费行为认知工具。',
    agreements: [
      { id: 'target', icon: '📋', title: '评估目标', text: '我理解本测评用于识别我的消费行为模式。' },
      { id: 'privacy', icon: '🔐', title: '隐私与数据安全', text: '我理解本次作答将以匿名方式处理。' },
      { id: 'voluntary', icon: '🙋', title: '自愿参与', text: '我理解参与本测评完全出于自愿。' },
      { id: 'non_diagnostic', icon: '🏥', title: '非诊断性质', text: '我理解本评估属于心理学导向的行为测评工具。' }
    ],
    buttonText: '开始扫描'
  };

  // 默认基本信息配置
  state.infoFields = {
    title: '请提供一些基本信息',
    subtitle: '这将帮助我们提供更准确的结果分析',
    sections: [
      { id: 'age', label: '您的年龄段', type: 'single', options: ['18岁以下', '18-24岁', '25-29岁', '30-34岁', '35岁以上'] },
      { id: 'gender', label: '您的性别', type: 'single', options: ['男性', '女性', '不愿意透露'] }
    ]
  };

  // 维度配置
  state.dimensions = [
    { id: 'comfort', name: '补偿型消费', color: '#E91E63' },
    { id: 'identity', name: '身份型消费', color: '#9C27B0' },
    { id: 'control', name: '控制型消费', color: '#2196F3' },
    { id: 'numbing', name: '麻醉型消费', color: '#FF9800' }
  ];

  // 计分配置
  state.scoring = {
    options: [
      { value: 4, label: 'A', text: '非常符合' },
      { value: 3, label: 'B', text: '比较符合' },
      { value: 2, label: 'C', text: '一般/不确定' },
      { value: 1, label: 'D', text: '不太符合' },
      { value: 0, label: 'E', text: '完全不符合' }
    ],
    maxScore: 32,
    thresholdStrong: 40,
    thresholdGap: 12
  };

  // 题目数据 - 生成示例题目
  state.questions = [];
  const dimensionIds = ['comfort', 'identity', 'control', 'numbing'];
  for (let i = 0; i < 32; i++) {
    state.questions.push({
      id: i + 1,
      dimension: dimensionIds[Math.floor(i / 8)],
      text: `Q${i+1}: 这是一个示例题目，请根据您的实际情况选择。`
    });
  }

  // 等级标签
  state.levelLabels = {
    VERY_LOW: { label: '很弱', desc: '这一模式在你身上基本处于"备用状态"' },
    LOW: { label: '偏低', desc: '只在特定情境下会被激活' },
    HIGH: { label: '偏高', desc: '已经是你常用的消费模式之一' },
    VERY_HIGH: { label: '很高', desc: '属于你的典型标志模式' }
  };

  // 人格类型
  state.personalityTypes = {
    NONE: { title: '你的消费人格：整体较为分散', summary: '你没有单一主导模式', quote: '灵活切换不同策略' },
    SINGLE: {
      comfort: { title: '补偿型情绪消费者', summary: '你习惯用消费安慰自己', quote: '把补偿写进账单' },
      identity: { title: '身份型消费人格', summary: '你在意这代表我是谁', quote: '为理想中的自己买单' },
      control: { title: '控制型消费执行者', summary: '你通过消费找回掌控感', quote: '用理性撑住失控的世界' },
      numbing: { title: '麻醉型消费逃离者', summary: '你用消费逃避现实', quote: '太久没有被允许停下来' }
    },
    DOUBLE: {}
  };

  state.analysisTexts = ['数据扫描中...', '建立行为模型...', '生成深度报告...', '分析消费基因...'];

  // 维度分析（简化版）
  state.dimensionAnalysis = {
    comfort: {
      VERY_LOW: { tag: '情绪自修型', summary: '更习惯自己消化', detail: '你很少用消费来补偿情绪。' },
      LOW: { tag: '适度补偿型', summary: '偶尔会犒劳自己', detail: '你在特别累时会允许自己放松一下。' },
      HIGH: { tag: '情绪回血型', summary: '用消费给辛苦盖章', detail: '你已经习惯用消费来安慰自己。' },
      VERY_HIGH: { tag: '高压补偿型', summary: '用消费吞掉委屈', detail: '你经常通过消费来补偿自己的辛苦。' }
    },
    identity: {
      VERY_LOW: { tag: '内在导向型', summary: '买自己需要的', detail: '你不太在意外眼光。' },
      LOW: { tag: '适度形象型', summary: '会顾及体面', detail: '你在重要场合会注意形象。' },
      HIGH: { tag: '人设编导型', summary: '为身份买单', detail: '你经常为人设消费。' },
      VERY_HIGH: { tag: '高度身份型', summary: '用消费搭建舞台', detail: '你非常注重消费带来的身份认同。' }
    },
    control: {
      VERY_LOW: { tag: '行动导向型', summary: '直接去做', detail: '你不靠购物获得掌控感。' },
      LOW: { tag: '工具型控制者', summary: '偶尔研究', detail: '你有时会花时间做购物功课。' },
      HIGH: { tag: '策略型控制者', summary: '用决策抵消不确定', detail: '你经常通过研究来获得掌控感。' },
      VERY_HIGH: { tag: '高负载控制者', summary: '用选择挡在混乱前', detail: '你极度依赖购物决策来获得安全感。' }
    },
    numbing: {
      VERY_LOW: { tag: '情绪清醒型', summary: '不会躲进购物车', detail: '你很少用消费逃避现实。' },
      LOW: { tag: '适度逃离型', summary: '偶尔用消费当止痛片', detail: '你只在特别累时才会逃避。' },
      HIGH: { tag: '熟练离线型', summary: '用购物逃避现实', detail: '你经常用购物来逃离压力。' },
      VERY_HIGH: { tag: '高压麻醉型', summary: '用购物硬撑', detail: '你经常用消费来逃避现实。' }
    }
  };

  state.isActivated = localStorage.getItem('activated') === 'true';
}

// 初始化应用
function initApp() {
  // 总是显示激活页（不需要自动跳转）
  showPage('activation-page');

  // 绑定激活事件
  bindActivationEvents();

  // 绑定首页事件
  bindHomeEvents();

  // 绑定信息页事件
  bindInfoEvents();

  // 绑定答题页事件
  bindQuizEvents();

  // 绑定结果页事件
  bindResultEvents();
}

// ==================== 页面切换 ====================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
    page.classList.add('hidden');
  });

  const targetPage = document.getElementById(pageId);
  targetPage.classList.remove('hidden');
  targetPage.classList.add('active');
}

// ==================== 激活页 ====================
function bindActivationEvents() {
  const input = document.getElementById('activation-code');
  const btn = document.getElementById('activation-btn');
  const error = document.getElementById('activation-error');

  // 回车激活
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      activate();
    }
  });

  // 点击激活
  btn.addEventListener('click', activate);

  // 重新激活
  document.getElementById('reset-activation').addEventListener('click', (e) => {
    e.preventDefault();
    // 清除所有状态
    localStorage.clear();
    // 强制刷新
    window.location.href = window.location.pathname + '?t=' + Date.now();
  });

  async function activate() {
    const code = input.value.trim();
    if (!code) return;

    btn.disabled = true;
    btn.textContent = '验证中...';

    try {
      // 通过服务器端验证
      const formData = new URLSearchParams();
      formData.append('code', code);

      const response = await fetch('/verify', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.valid) {
        // 验证成功
        state.isActivated = true;

        btn.textContent = '✓ 激活成功';
        btn.style.background = '#4CAF50';

        setTimeout(() => {
          showPage('home-page');
          renderHomePage();
          error.classList.add('hidden');
          btn.textContent = '立即激活';
          btn.style.background = '';
          btn.disabled = false;
          input.value = '';
        }, 800);
      } else {
        // 验证失败
        error.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = '立即激活';
        input.focus();
      }
    } catch (e) {
      // 网络错误，回退到本地验证
      console.error('验证请求失败', e);
      error.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '立即激活';
    }
  }
}

// ==================== 首页 ====================
function renderHomePage() {
  const config = state.homeConfig;

  // 渲染标签
  const tagsContainer = document.getElementById('home-tags');
  tagsContainer.innerHTML = config.tags.map(tag => `
    <span class="home-tag">
      <span class="home-tag-icon">${tag.icon}</span>
      <span>${tag.text}</span>
    </span>
  `).join('');

  // 渲染标题
  document.getElementById('home-title').textContent = config.title;
  document.getElementById('home-subtitle').textContent = config.subtitle;
  document.getElementById('home-description').textContent = config.description;

  // 渲染协议列表
  const agreementsContainer = document.getElementById('home-agreements');
  agreementsContainer.innerHTML = config.agreements.map((item, index) => `
    <div class="home-agreement" data-id="${item.id}">
      <span class="home-agreement-icon">${item.icon}</span>
      <div class="home-agreement-content">
        <div class="home-agreement-title">${item.title}</div>
        <div class="home-agreement-text">${item.text}</div>
      </div>
      <div class="home-agreement-checkbox"></div>
    </div>
  `).join('');

  // 绑定协议点击事件
  document.querySelectorAll('.home-agreement').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('checked');
      checkHomeReady();
    });
  });
}

function bindHomeEvents() {
  document.getElementById('home-start-btn').addEventListener('click', () => {
    if (!document.getElementById('home-start-btn').disabled) {
      showPage('info-page');
      renderInfoPage();
    }
  });
}

function checkHomeReady() {
  const checkedCount = document.querySelectorAll('.home-agreement.checked').length;
  const totalCount = document.querySelectorAll('.home-agreement').length;
  const btn = document.getElementById('home-start-btn');

  if (checkedCount === totalCount) {
    btn.disabled = false;
    btn.classList.remove('btn-disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('btn-disabled');
  }
}

// ==================== 基本信息页 ====================
function renderInfoPage() {
  const config = state.infoFields;

  document.getElementById('info-title').textContent = config.title;
  document.getElementById('info-subtitle').textContent = config.subtitle;

  const sectionsContainer = document.getElementById('info-sections');
  sectionsContainer.innerHTML = config.sections.map(section => `
    <div class="info-section" data-id="${section.id}">
      <div class="info-section-label">${section.label}</div>
      <div class="info-options ${section.type === 'cards' ? 'info-cards' : ''}" data-section-id="${section.id}">
        ${renderInfoOptions(section)}
      </div>
    </div>
  `).join('');

  // 绑定选项点击事件
  document.querySelectorAll('.info-option, .info-card').forEach(el => {
    el.addEventListener('click', () => {
      const sectionId = el.closest('.info-options').dataset.sectionId;
      selectInfoOption(sectionId, el);
    });
  });
}

function renderInfoOptions(section) {
  if (section.type === 'cards') {
    return section.options.map(opt => `
      <div class="info-card" data-value="${opt.id}">
        <div class="info-card-title">${opt.title}</div>
        <div class="info-card-keywords">${opt.keywords || ''}</div>
        <div class="info-card-desc">${opt.desc || opt.quote || ''}</div>
      </div>
    `).join('');
  } else {
    return section.options.map(opt => `
      <div class="info-option" data-value="${opt}">${opt}</div>
    `).join('');
  }
}

function selectInfoOption(sectionId, selectedEl) {
  // 清除同组其他选中状态
  const container = document.querySelector(`.info-options[data-section-id="${sectionId}"]`);
  container.querySelectorAll('.info-option, .info-card').forEach(el => {
    el.classList.remove('selected');
  });

  // 选中当前
  selectedEl.classList.add('selected');

  // 记录用户选择
  state.userInfo[sectionId] = selectedEl.dataset.value;

  // 检查是否全部填写完成
  checkInfoReady();
}

function checkInfoReady() {
  const sections = state.infoFields.sections;
  const filledCount = Object.keys(state.userInfo).length;
  const btn = document.getElementById('info-start-btn');

  if (filledCount === sections.length) {
    btn.disabled = false;
    btn.classList.remove('btn-disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('btn-disabled');
  }
}

function bindInfoEvents() {
  document.getElementById('info-start-btn').addEventListener('click', () => {
    if (!document.getElementById('info-start-btn').disabled) {
      startQuiz();
    }
  });
}

// ==================== 答题页 ====================
function startQuiz() {
  state.currentQuestionIndex = 0;
  state.answers = {};

  showPage('quiz-page');
  renderQuestion();
}

function renderQuestion() {
  const question = state.questions[state.currentQuestionIndex];
  const dimension = state.dimensions.find(d => d.id === question.dimension);
  const options = state.scoring.options;

  // 更新进度条
  const progress = ((state.currentQuestionIndex) / state.questions.length) * 100;
  document.getElementById('quiz-progress-bar').style.width = `${progress}%`;

  // 渲染题目
  document.getElementById('quiz-question-number').textContent = `第 ${state.currentQuestionIndex + 1} 题`;
  document.getElementById('quiz-question-dimension').textContent = dimension.name;
  document.getElementById('quiz-question-dimension').style.color = dimension.color;
  document.getElementById('quiz-question-text').textContent = question.text;

  // 渲染选项
  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = options.map(opt => `
    <div class="quiz-option" data-value="${opt.value}">
      <span class="quiz-option-label">${opt.label}</span>
      <span class="quiz-option-text">${opt.text}</span>
    </div>
  `).join('');

  // 绑定选项点击
  document.querySelectorAll('.quiz-option').forEach(el => {
    el.addEventListener('click', () => selectOption(el));
  });

  // 显示/隐藏返回按钮
  const prevBtn = document.getElementById('quiz-prev-btn');
  if (state.currentQuestionIndex > 0) {
    prevBtn.classList.remove('hidden');
  } else {
    prevBtn.classList.add('hidden');
  }

  // 动画
  const card = document.getElementById('quiz-question-card');
  card.style.animation = 'none';
  card.offsetHeight; // 触发重绘
  card.style.animation = 'slideInLeft 0.4s ease';
}

function selectOption(el) {
  const value = parseInt(el.dataset.value);
  const questionId = state.questions[state.currentQuestionIndex].id;

  // 标记选中
  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  el.classList.add('selected');

  // 记录答案
  state.answers[questionId] = value;

  // 延迟后进入下一题
  setTimeout(() => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      goToNextQuestion();
    } else {
      finishQuiz();
    }
  }, 300);
}

function goToNextQuestion() {
  const card = document.getElementById('quiz-question-card');
  card.classList.add('slide-out-left');

  setTimeout(() => {
    state.currentQuestionIndex++;
    card.classList.remove('slide-out-left');
    renderQuestion();
  }, 300);
}

function goToPrevQuestion() {
  const card = document.getElementById('quiz-question-card');
  card.style.animation = 'slideInRight 0.3s ease';

  state.currentQuestionIndex--;
  renderQuestion();
}

function bindQuizEvents() {
  document.getElementById('quiz-prev-btn').addEventListener('click', goToPrevQuestion);
}

// ==================== 计算结果 ====================
function finishQuiz() {
  // 计算各维度分数
  const dimensionScores = {};

  state.dimensions.forEach(dim => {
    const dimQuestions = state.questions.filter(q => q.dimension === dim.id);
    const rawScore = dimQuestions.reduce((sum, q) => {
      return sum + (state.answers[q.id] || 0);
    }, 0);

    const stdScore = Math.round((rawScore / state.scoring.maxScore) * 100);
    dimensionScores[dim.id] = {
      raw: rawScore,
      score: stdScore,
      level: getLevel(stdScore)
    };
  });

  // 判定主/次人格
  const personality = determinePersonality(dimensionScores);

  state.results = {
    dimensionScores,
    personality,
    timestamp: new Date().toISOString(),
    id: generateResultId()
  };

  // 显示转场页
  showPage('loading-page');
  runLoadingAnimation();
}

function getLevel(score) {
  if (score <= 25) return 'VERY_LOW';
  if (score <= 50) return 'LOW';
  if (score <= 75) return 'HIGH';
  return 'VERY_HIGH';
}

function determinePersonality(scores) {
  const threshold = state.scoring.thresholdStrong;
  const gap = state.scoring.thresholdGap;

  // 按分数排序
  const sorted = Object.entries(scores)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.score - a.score);

  const d1 = sorted[0];
  const d2 = sorted[1];

  // 无明显主人格
  if (d1.score < threshold) {
    return {
      mode: 'NONE',
      ...state.personalityTypes.NONE
    };
  }

  // 单主人格
  if (d2.score < threshold || d1.score - d2.score >= gap) {
    return {
      mode: 'SINGLE',
      dimension: d1.id,
      ...state.personalityTypes.SINGLE[d1.id]
    };
  }

  // 双主人格
  const comboKey = `${d1.id}_${d2.id}`;
  const doubleTypes = state.personalityTypes.DOUBLE;

  // 尝试匹配组合
  if (doubleTypes[comboKey]) {
    return {
      mode: 'DOUBLE',
      dimensions: [d1.id, d2.id],
      ...doubleTypes[comboKey]
    };
  }

  // 如果没有预定义组合，尝试反向
  const reverseKey = `${d2.id}_${d1.id}`;
  if (doubleTypes[reverseKey]) {
    return {
      mode: 'DOUBLE',
      dimensions: [d1.id, d2.id],
      ...doubleTypes[reverseKey]
    };
  }

  // 默认返回第一个
  return {
    mode: 'SINGLE',
    dimension: d1.id,
    ...state.personalityTypes.SINGLE[d1.id]
  };
}

function generateResultId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DNA-${timestamp}${random}`;
}

// ==================== 转场动画 ====================
function runLoadingAnimation() {
  const percentEl = document.getElementById('loading-percent');
  const textEl = document.getElementById('loading-text');

  let percent = 0;
  let textIndex = 0;

  const interval = setInterval(() => {
    percent += 2;
    percentEl.textContent = `${percent}%`;

    // 每25%换一次文案
    if (percent % 25 === 0 && textIndex < state.analysisTexts.length) {
      textEl.textContent = state.analysisTexts[textIndex];
      textIndex++;
    }

    if (percent >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        showPage('result-page');
        renderResultPage();
      }, 500);
    }
  }, 100);
}

// ==================== 结果页 ====================
function renderResultPage() {
  const results = state.results;

  // 档案页眉
  document.getElementById('result-id').textContent = `报告编号：#${results.id}`;
  document.getElementById('result-time').textContent = new Date(results.timestamp).toLocaleString('zh-CN');

  // 渲染维度分数
  renderDimensionScores();

  // 渲染身份勋章
  renderIdentityCard();

  // 渲染深度解析
  renderAnalysisCards();

  // 绘制图表
  setTimeout(() => {
    renderRadarChart();
    renderDNASpiral();
  }, 300);
}

function renderDimensionScores() {
  const container = document.getElementById('result-dimensions');
  const scores = state.results.dimensionScores;

  container.innerHTML = state.dimensions.map(dim => {
    const scoreData = scores[dim.id];
    const levelInfo = state.levelLabels[scoreData.level];

    return `
      <div class="result-dimension">
        <div class="result-dimension-name">${dim.name}</div>
        <div class="result-dimension-score" style="color: ${dim.color}">${scoreData.score}</div>
        <div class="result-dimension-label" style="background: ${dim.color}20; color: ${dim.color}">${levelInfo.label}</div>
      </div>
    `;
  }).join('');
}

function renderIdentityCard() {
  const personality = state.results.personality;

  document.getElementById('identity-title').textContent = personality.title;
  document.getElementById('identity-summary').textContent = personality.summary;
  document.getElementById('identity-quote').textContent = personality.quote;
}

function renderAnalysisCards() {
  const container = document.getElementById('analysis-cards');
  const scores = state.results.dimensionScores;

  container.innerHTML = state.dimensions.map(dim => {
    const scoreData = scores[dim.id];
    const analysis = state.dimensionAnalysis[dim.id][scoreData.level];

    return `
      <div class="analysis-card" onclick="toggleAnalysisCard(this)">
        <div class="analysis-card-header">
          <span class="analysis-card-dimension" style="color: ${dim.color}">${dim.name}</span>
          <span class="analysis-card-tag">${analysis.tag}</span>
        </div>
        <div class="analysis-card-summary">${analysis.summary}</div>
        <div class="analysis-card-content">
          <p class="analysis-card-detail">${analysis.detail}</p>
        </div>
        <div class="analysis-card-toggle">点击展开详情</div>
      </div>
    `;
  }).join('');
}

// 切换分析卡片展开/收起
window.toggleAnalysisCard = function(el) {
  el.classList.toggle('expanded');
  const toggle = el.querySelector('.analysis-card-toggle');
  toggle.textContent = el.classList.contains('expanded') ? '点击收起' : '点击展开详情';
};

// ==================== 图表 ====================
function renderRadarChart() {
  const ctx = document.getElementById('radar-canvas').getContext('2d');
  const scores = state.results.dimensionScores;
  const labels = state.dimensions.map(d => d.name);
  const data = state.dimensions.map(d => scores[d.id].score);
  const colors = state.dimensions.map(d => d.color);

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: '消费模式强度',
        data: data,
        backgroundColor: 'rgba(233, 30, 99, 0.2)',
        borderColor: '#E91E63',
        borderWidth: 2,
        pointBackgroundColor: colors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5
      }]
    },
    options: {
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            font: { size: 10 }
          },
          pointLabels: {
            font: { size: 12, weight: '500' }
          }
        }
      },
      plugins: {
        legend: { display: false }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
}

// DNA双螺旋图
function renderDNASpiral() {
  const canvas = document.getElementById('dna-canvas');
  const ctx = canvas.getContext('2d');
  const scores = state.results.dimensionScores;

  // 设置画布大小
  canvas.width = canvas.offsetWidth || 200;
  canvas.height = canvas.offsetHeight || 250;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const amplitude = 40; // 螺旋振幅
  const frequency = 0.15; // 螺旋频率

  // 绘制背景
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  // 绘制四维度的基因片段
  const dimensions = state.dimensions;

  dimensions.forEach((dim, dimIndex) => {
    const score = scores[dim.id].score;
    const alpha = score / 100;
    const yStart = 30 + dimIndex * 55;
    const segmentHeight = 45;

    // 绘制发光的双螺旋片段
    for (let y = yStart; y < yStart + segmentHeight; y += 3) {
      const xOffset = Math.sin((y - yStart) * frequency * Math.PI / 180 * 2) * amplitude;

      // 左链
      ctx.beginPath();
      ctx.arc(centerX - xOffset - 10, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dim.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();

      // 右链
      ctx.beginPath();
      ctx.arc(centerX + xOffset + 10, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dim.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();

      // 连接线（碱基对）
      if (Math.sin((y - yStart) * frequency * Math.PI / 180 * 2) > 0) {
        ctx.beginPath();
        ctx.moveTo(centerX - xOffset - 6, y);
        ctx.lineTo(centerX + xOffset + 6, y);
        ctx.strokeStyle = dim.color + '40';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 维度标签
    ctx.fillStyle = dim.color;
    ctx.font = 'bold 11px Noto Sans SC';
    ctx.textAlign = 'left';
    ctx.fillText(dim.name, 10, yStart + segmentHeight / 2 + 4);
  });
}

function bindResultEvents() {
  document.getElementById('result-restart-btn').addEventListener('click', () => {
    // 重置状态
    state.answers = {};
    state.userInfo = {};
    state.currentQuestionIndex = 0;
    state.results = null;

    // 清除激活状态
    localStorage.removeItem('activated');
    state.isActivated = false;

    // 重新激活
    showPage('activation-page');
  });
}
