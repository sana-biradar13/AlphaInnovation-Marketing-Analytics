/**
 * Marketing Campaign Analytics Dashboard - Core Application Engine
 * High-performance, reactive analytics supporting dynamic filtering,
 * mathematical KPI computation, responsive Chart.js rendering, and CSV exports.
 */

// Application State
const state = {
  raw: [],
  filtered: [],
  filters: {
    campaign: 'all',
    age: 'all',
    gender: 'all',
    interest: 'all',
    minSpend: 0,
    aov: 100
  },
  table: {
    search: '',
    sort: 'Spent_desc',
    page: 1,
    pageSize: 15
  },
  activeTab: 'funnelTab',
  theme: 'dark',
  charts: {}
};

// Formatting Utilities
const formatCurrency = (val, decimals = 0) => {
  if (val === undefined || isNaN(val)) return '$0';
  return '$' + Number(val).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatNumber = (val) => {
  if (val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-US');
};

const formatCompact = (val) => {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
  return Number(val).toLocaleString('en-US');
};

const formatPercent = (val, decimals = 2) => {
  if (val === undefined || isNaN(val)) return '0.00%';
  return Number(val).toFixed(decimals) + '%';
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  initData();
  setupEventListeners();
  setupTheme();
});

// Initialize Dataset
function initData() {
  if (typeof RAW_CAMPAIGN_DATA !== 'undefined' && Array.isArray(RAW_CAMPAIGN_DATA)) {
    state.raw = RAW_CAMPAIGN_DATA.map(d => ({
      ...d,
      ad_id: Number(d.ad_id),
      xyz_campaign_id: String(d.xyz_campaign_id),
      fb_campaign_id: Number(d.fb_campaign_id),
      interest: Number(d.interest),
      Impressions: Number(d.Impressions) || 0,
      Clicks: Number(d.Clicks) || 0,
      Spent: Number(d.Spent) || 0,
      Total_Conversion: Number(d.Total_Conversion) || 0,
      Approved_Conversion: Number(d.Approved_Conversion) || 0
    }));
    populateInterestFilter();
    applyFilters();
  } else {
    console.error('Dataset RAW_CAMPAIGN_DATA not found. Attempting fetch...');
    fetch('data.json')
      .then(res => res.json())
      .then(data => {
        state.raw = data;
        populateInterestFilter();
        applyFilters();
      })
      .catch(err => console.error('Failed to load dataset:', err));
  }
}

// Populate Interest Filter Dropdown
function populateInterestFilter() {
  const select = document.getElementById('interestSelect');
  if (!select) return;

  const interests = [...new Set(state.raw.map(d => d.interest))].sort((a, b) => a - b);
  select.innerHTML = '<option value="all">All Interests (40 Categories)</option>';

  interests.forEach(intId => {
    const count = state.raw.filter(d => d.interest === intId).length;
    const opt = document.createElement('option');
    opt.value = intId;
    opt.textContent = `Interest Code ${intId} (${count} ads)`;
    select.appendChild(opt);
  });
}

// Event Listeners Setup
function setupEventListeners() {
  // Campaign Filter
  document.getElementById('campaignSelect')?.addEventListener('change', (e) => {
    state.filters.campaign = e.target.value;
    state.table.page = 1;
    applyFilters();
  });

  // Age Filter
  document.getElementById('ageSelect')?.addEventListener('change', (e) => {
    state.filters.age = e.target.value;
    state.table.page = 1;
    applyFilters();
  });

  // Gender Filter
  document.getElementById('genderSelect')?.addEventListener('change', (e) => {
    state.filters.gender = e.target.value;
    state.table.page = 1;
    applyFilters();
  });

  // Interest Filter
  document.getElementById('interestSelect')?.addEventListener('change', (e) => {
    state.filters.interest = e.target.value;
    state.table.page = 1;
    applyFilters();
  });

  // Spend Range Filter
  const spendSlider = document.getElementById('spendRangeInput');
  const spendDisplay = document.getElementById('spendFilterDisplay');
  spendSlider?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    state.filters.minSpend = val;
    if (spendDisplay) spendDisplay.textContent = `≥ $${val}`;
    state.table.page = 1;
    applyFilters();
  });

  // Customer Value / AOV Slider
  const aovSlider = document.getElementById('aovSlider');
  const aovDisplay = document.getElementById('aovDisplay');
  aovSlider?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    state.filters.aov = val;
    if (aovDisplay) aovDisplay.textContent = `$${val}`;
    applyFilters();
  });

  // Reset Filters Button
  document.getElementById('resetFiltersBtn')?.addEventListener('click', resetAllFilters);

  // Tabs Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      state.activeTab = tabId;
      document.getElementById(tabId)?.classList.remove('hidden');

      // Trigger resize for Chart.js so canvas fits correctly
      window.dispatchEvent(new Event('resize'));
    });
  });

  // Table Search Input
  document.getElementById('tableSearchInput')?.addEventListener('input', (e) => {
    state.table.search = e.target.value.trim().toLowerCase();
    state.table.page = 1;
    renderTable();
  });

  // Table Sort Select
  document.getElementById('tableSortSelect')?.addEventListener('change', (e) => {
    state.table.sort = e.target.value;
    renderTable();
  });

  // Table Page Size Select
  document.getElementById('tablePageSizeSelect')?.addEventListener('change', (e) => {
    state.table.pageSize = Number(e.target.value);
    state.table.page = 1;
    renderTable();
  });

  // Export CSV Button
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportFilteredDataToCSV);

  // Dataset Info Modal
  const modal = document.getElementById('datasetModal');
  document.getElementById('datasetInfoBtn')?.addEventListener('click', () => modal?.classList.remove('hidden'));
  document.getElementById('closeModalBtn')?.addEventListener('click', () => modal?.classList.add('hidden'));
  document.getElementById('modalOkBtn')?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Theme Toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
}

// Reset All Filters
function resetAllFilters() {
  state.filters.campaign = 'all';
  state.filters.age = 'all';
  state.filters.gender = 'all';
  state.filters.interest = 'all';
  state.filters.minSpend = 0;
  state.filters.aov = 100;
  state.table.search = '';
  state.table.sort = 'Spent_desc';
  state.table.page = 1;

  // Reset inputs
  const campEl = document.getElementById('campaignSelect');
  if (campEl) campEl.value = 'all';

  const ageEl = document.getElementById('ageSelect');
  if (ageEl) ageEl.value = 'all';

  const genEl = document.getElementById('genderSelect');
  if (genEl) genEl.value = 'all';

  const intEl = document.getElementById('interestSelect');
  if (intEl) intEl.value = 'all';

  const spendInput = document.getElementById('spendRangeInput');
  if (spendInput) spendInput.value = 0;
  const spendDisplay = document.getElementById('spendFilterDisplay');
  if (spendDisplay) spendDisplay.textContent = '≥ $0';

  const aovInput = document.getElementById('aovSlider');
  if (aovInput) aovInput.value = 100;
  const aovDisplay = document.getElementById('aovDisplay');
  if (aovDisplay) aovDisplay.textContent = '$100';

  const searchInput = document.getElementById('tableSearchInput');
  if (searchInput) searchInput.value = '';

  const sortSelect = document.getElementById('tableSortSelect');
  if (sortSelect) sortSelect.value = 'Spent_desc';

  applyFilters();
}

// Filter Engine
function applyFilters() {
  const { campaign, age, gender, interest, minSpend } = state.filters;

  state.filtered = state.raw.filter(item => {
    if (campaign !== 'all' && item.xyz_campaign_id !== campaign) return false;
    if (age !== 'all' && item.age !== age) return false;
    if (gender !== 'all' && item.gender !== gender) return false;
    if (interest !== 'all' && item.interest !== Number(interest)) return false;
    if (item.Spent < minSpend) return false;
    return true;
  });

  updateFilterSummaryUI();
  updateKPIs();
  updateExecutiveInsights();
  renderAllCharts();
  renderBenchmarkTable();
  renderDemographicsTable();
  renderInterestsTable();
  renderTable();
}

// Update Active Filter UI Text & Badges
function updateFilterSummaryUI() {
  const total = state.raw.length;
  const count = state.filtered.length;
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

  const badge = document.getElementById('activeFilterBadge');
  if (badge) {
    if (count === total) {
      badge.textContent = `All ${total} Ads`;
      badge.className = 'text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium';
    } else {
      badge.textContent = `${count} of ${total} Ads (${pct}%)`;
      badge.className = 'text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium';
    }
  }

  const summary = document.getElementById('filterSummaryText');
  if (summary) {
    summary.innerHTML = `Showing <strong class="text-white">${formatNumber(count)}</strong> of ${formatNumber(total)} ads (${pct}% of dataset)`;
  }

  const tableTabCount = document.getElementById('tableTabCount');
  if (tableTabCount) tableTabCount.textContent = formatNumber(count);
}

// Calculate & Update Dynamic KPIs
function updateKPIs() {
  const data = state.filtered;
  const aov = state.filters.aov;

  const totalImpressions = data.reduce((acc, d) => acc + d.Impressions, 0);
  const totalClicks = data.reduce((acc, d) => acc + d.Clicks, 0);
  const totalSpent = data.reduce((acc, d) => acc + d.Spent, 0);
  const totalLeads = data.reduce((acc, d) => acc + d.Total_Conversion, 0);
  const totalSales = data.reduce((acc, d) => acc + d.Approved_Conversion, 0);

  const grossRevenue = totalSales * aov;
  const netProfit = grossRevenue - totalSpent;
  const roi = totalSpent > 0 ? ((grossRevenue - totalSpent) / totalSpent) * 100 : 0;
  const roas = totalSpent > 0 ? grossRevenue / totalSpent : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
  const leadCr = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
  const salesCr = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;
  const leadCloseRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
  const cpl = totalLeads > 0 ? totalSpent / totalLeads : 0;
  const cpa = totalSales > 0 ? totalSpent / totalSales : 0;

  // Header quick stats
  const reachEl = document.getElementById('totalImpressionsReach');
  if (reachEl) reachEl.textContent = formatCompact(totalImpressions);
  const spendSumEl = document.getElementById('totalSpendSummary');
  if (spendSumEl) spendSumEl.textContent = formatCurrency(totalSpent);

  // KPI 1: Spend & Costs
  document.getElementById('kpiSpend').textContent = formatCurrency(totalSpent);
  document.getElementById('kpiCpc').textContent = formatCurrency(cpc, 2);
  document.getElementById('kpiCpm').textContent = formatCurrency(cpm, 2);

  // KPI 2: Gross Revenue & Profit
  document.getElementById('kpiRevenue').textContent = formatCurrency(grossRevenue);
  const profitEl = document.getElementById('kpiProfit');
  if (profitEl) {
    profitEl.textContent = (netProfit >= 0 ? '+' : '') + formatCurrency(netProfit);
    profitEl.className = netProfit >= 0 ? 'text-emerald-300 font-mono' : 'text-rose-400 font-mono';
  }

  // KPI 3: ROI & ROAS
  const roiEl = document.getElementById('kpiRoi');
  if (roiEl) {
    roiEl.textContent = (roi >= 0 ? '+' : '') + formatPercent(roi, 1);
    roiEl.className = 'kpi-value text-2xl ' + (roi >= 0 ? 'text-purple-400' : 'text-rose-400');
  }
  document.getElementById('kpiRoas').textContent = roas.toFixed(2) + 'x';

  // KPI 4: Impressions & Clicks
  document.getElementById('kpiClicks').textContent = formatNumber(totalClicks);
  document.getElementById('kpiCtr').textContent = formatPercent(ctr, 3);
  document.getElementById('kpiImpressionsShort').textContent = formatCompact(totalImpressions);

  // KPI 5: Inquiries (Leads)
  document.getElementById('kpiLeads').textContent = formatNumber(totalLeads);
  document.getElementById('kpiLeadCr').textContent = formatPercent(leadCr, 2);
  document.getElementById('kpiCpl').textContent = formatCurrency(cpl, 2);

  // KPI 6: Approved Sales & CPA
  document.getElementById('kpiApprovedSales').textContent = formatNumber(totalSales);
  document.getElementById('kpiSalesCr').textContent = formatPercent(salesCr, 2);
  document.getElementById('kpiCpa').textContent = formatCurrency(cpa, 2);

  // Funnel Stage Card Elements
  document.getElementById('funnelImpressions').textContent = formatNumber(totalImpressions);
  document.getElementById('funnelCtrValue').textContent = formatPercent(ctr, 3);
  document.getElementById('funnelClicks').textContent = formatNumber(totalClicks);
  document.getElementById('funnelInquiryCrValue').textContent = formatPercent(leadCr, 2);
  document.getElementById('funnelInquiries').textContent = formatNumber(totalLeads);
  document.getElementById('funnelLeadCloseRate').textContent = formatPercent(leadCloseRate, 2);
  document.getElementById('funnelSales').textContent = formatNumber(totalSales);
  document.getElementById('funnelCpaValue').textContent = formatCurrency(cpa, 2);

  const overallFunnelCr = totalImpressions > 0 ? (totalSales / totalImpressions) * 100 : 0;
  document.getElementById('funnelOverallCr').textContent = formatPercent(overallFunnelCr, 4);
}

// Dynamic Executive Insights Generator
function updateExecutiveInsights() {
  const data = state.filtered;
  if (!data.length) {
    document.getElementById('insightDemographic').textContent = 'No records matching current filters.';
    document.getElementById('insightGender').textContent = 'Adjust filters to view insights.';
    document.getElementById('insightCampaign').textContent = 'Adjust filters to view insights.';
    document.getElementById('insightOptimization').textContent = 'Adjust filters to view insights.';
    return;
  }

  // 1. Age Cohort Analysis
  const ages = ['30-34', '35-39', '40-44', '45-49'];
  const ageStats = ages.map(age => {
    const subset = data.filter(d => d.age === age);
    const spent = subset.reduce((acc, d) => acc + d.Spent, 0);
    const sales = subset.reduce((acc, d) => acc + d.Approved_Conversion, 0);
    const cpa = sales > 0 ? spent / sales : 999999;
    return { age, spent, sales, cpa };
  }).filter(a => a.sales > 0);

  if (ageStats.length) {
    ageStats.sort((a, b) => a.cpa - b.cpa);
    const bestAge = ageStats[0];
    document.getElementById('insightDemographic').textContent = 
      `Age ${bestAge.age} leads demographic efficiency with CPA of ${formatCurrency(bestAge.cpa, 2)} (${bestAge.sales} sales).`;
  }

  // 2. Gender Efficiency Paradox
  const mData = data.filter(d => d.gender === 'M');
  const fData = data.filter(d => d.gender === 'F');

  const mClicks = mData.reduce((acc, d) => acc + d.Clicks, 0);
  const fClicks = fData.reduce((acc, d) => acc + d.Clicks, 0);
  const mSpent = mData.reduce((acc, d) => acc + d.Spent, 0);
  const fSpent = fData.reduce((acc, d) => acc + d.Spent, 0);
  const mSales = mData.reduce((acc, d) => acc + d.Approved_Conversion, 0);
  const fSales = fData.reduce((acc, d) => acc + d.Approved_Conversion, 0);

  const mCpa = mSales > 0 ? mSpent / mSales : 0;
  const fCpa = fSales > 0 ? fSpent / fSales : 0;

  if (mSales > 0 && fSales > 0) {
    const ratio = (fCpa / mCpa).toFixed(2);
    document.getElementById('insightGender').textContent = 
      `Females generate ${formatCompact(fClicks)} clicks (CPA ${formatCurrency(fCpa, 2)}), while Males convert to sales at ${ratio}x lower CPA (${formatCurrency(mCpa, 2)}).`;
  } else {
    document.getElementById('insightGender').textContent = 
      `Filtered view reflects single gender segment or low sample size.`;
  }

  // 3. Campaign Scaling
  const campaigns = ['916', '936', '1178'];
  const campStats = campaigns.map(id => {
    const subset = data.filter(d => d.xyz_campaign_id === id);
    const spent = subset.reduce((acc, d) => acc + d.Spent, 0);
    const sales = subset.reduce((acc, d) => acc + d.Approved_Conversion, 0);
    const roas = spent > 0 ? (sales * state.filters.aov) / spent : 0;
    return { id, spent, sales, roas };
  }).filter(c => c.spent > 0);

  if (campStats.length) {
    campStats.sort((a, b) => b.roas - a.roas);
    const topRoas = campStats[0];
    document.getElementById('insightCampaign').textContent = 
      `Campaign ${topRoas.id} delivers highest ROAS (${topRoas.roas.toFixed(1)}x). Larger campaigns face ad fatigue and higher CPAs.`;
  }

  // 4. Strategic Optimization Opportunity
  const highSpendLowRoas = data.filter(d => d.Spent > 100 && (d.Approved_Conversion * state.filters.aov) < d.Spent);
  if (highSpendLowRoas.length > 0) {
    document.getElementById('insightOptimization').textContent = 
      `Identified ${highSpendLowRoas.length} high-spend ad placements with negative ROI. Reallocating budget to top 15% interest cohorts will lift overall ROAS.`;
  } else {
    document.getElementById('insightOptimization').textContent = 
      `Budget allocation is currently operating within positive unit-economics thresholds across selected parameters.`;
  }
}

// Render All Charts Safely
function renderAllCharts() {
  renderFunnelVolumeChart();
  renderFunnelRatesChart();
  renderCampaignRevenueChart();
  renderCampaignRoasChart();
  renderAgeDemographicsChart();
  renderGenderCharts();
  renderTopInterestsChart();
  renderAdScatterChart();
}

// Safe Chart Instance Destructor
function destroyChart(name) {
  if (state.charts[name]) {
    state.charts[name].destroy();
    state.charts[name] = null;
  }
}

// Chart.js Theme Colors Configuration
function getChartTheme() {
  const isDark = state.theme === 'dark';
  return {
    textColor: isDark ? '#94a3b8' : '#475569',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  };
}

// CHART 1: Funnel Volume Chart (Logarithmic)
function renderFunnelVolumeChart() {
  destroyChart('funnelVolume');
  const ctx = document.getElementById('funnelVolumeChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const impressions = data.reduce((acc, d) => acc + d.Impressions, 0);
  const clicks = data.reduce((acc, d) => acc + d.Clicks, 0);
  const leads = data.reduce((acc, d) => acc + d.Total_Conversion, 0);
  const sales = data.reduce((acc, d) => acc + d.Approved_Conversion, 0);

  const theme = getChartTheme();

  state.charts['funnelVolume'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1. Impressions', '2. Ad Clicks', '3. Inquiries (Leads)', '4. Approved Sales'],
      datasets: [{
        label: 'Funnel Step Volume',
        data: [impressions, clicks, leads, sales],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          '#3b82f6',
          '#6366f1',
          '#f59e0b',
          '#10b981'
        ],
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'logarithmic',
          grid: { color: theme.gridColor },
          ticks: {
            color: theme.textColor,
            callback: (v) => formatCompact(v)
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Volume: ${formatNumber(ctx.raw)} units`
          }
        }
      }
    }
  });
}

// CHART 2: Funnel Conversion Rates
function renderFunnelRatesChart() {
  destroyChart('funnelRates');
  const ctx = document.getElementById('funnelRatesChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const impressions = data.reduce((acc, d) => acc + d.Impressions, 0);
  const clicks = data.reduce((acc, d) => acc + d.Clicks, 0);
  const leads = data.reduce((acc, d) => acc + d.Total_Conversion, 0);
  const sales = data.reduce((acc, d) => acc + d.Approved_Conversion, 0);

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const leadCr = clicks > 0 ? (leads / clicks) * 100 : 0;
  const salesCr = clicks > 0 ? (sales / clicks) * 100 : 0;
  const closeRate = leads > 0 ? (sales / leads) * 100 : 0;

  const theme = getChartTheme();

  state.charts['funnelRates'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['CTR (Clicks/Impr %)', 'Lead CR (Inq/Click %)', 'Sales CR (Sales/Click %)', 'Lead Close Rate (Sales/Inq %)'],
      datasets: [{
        label: 'Conversion Percentage (%)',
        data: [ctr, leadCr, salesCr, closeRate],
        backgroundColor: [
          'rgba(99, 102, 241, 0.75)',
          'rgba(245, 158, 11, 0.75)',
          'rgba(244, 63, 94, 0.75)',
          'rgba(16, 185, 129, 0.75)'
        ],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: theme.gridColor },
          ticks: {
            color: theme.textColor,
            callback: (v) => v + '%'
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor, font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Conversion Rate: ${ctx.raw.toFixed(3)}%`
          }
        }
      }
    }
  });
}

// CHART 3: Campaign Spend vs Gross Revenue
function renderCampaignRevenueChart() {
  destroyChart('campaignRevenue');
  const ctx = document.getElementById('campaignRevenueChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const campaigns = ['916', '936', '1178'];
  const labels = ['Campaign 916 (Test)', 'Campaign 936 (Growth)', 'Campaign 1178 (Scale)'];

  const spendData = campaigns.map(id => {
    return data.filter(d => d.xyz_campaign_id === id).reduce((acc, d) => acc + d.Spent, 0);
  });

  const revData = campaigns.map(id => {
    const sales = data.filter(d => d.xyz_campaign_id === id).reduce((acc, d) => acc + d.Approved_Conversion, 0);
    return sales * state.filters.aov;
  });

  const theme = getChartTheme();

  state.charts['campaignRevenue'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Ad Spend ($ Cost)',
          data: spendData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderRadius: 5
        },
        {
          label: 'Gross Revenue ($ Sales)',
          data: revData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: theme.gridColor },
          ticks: {
            color: theme.textColor,
            callback: (v) => formatCompact(v)
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: theme.textColor, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      }
    }
  });
}

// CHART 4: Campaign ROAS vs CPA
function renderCampaignRoasChart() {
  destroyChart('campaignRoas');
  const ctx = document.getElementById('campaignRoasChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const campaigns = ['916', '936', '1178'];
  const labels = ['Campaign 916', 'Campaign 936', 'Campaign 1178'];

  const roasData = campaigns.map(id => {
    const subset = data.filter(d => d.xyz_campaign_id === id);
    const spent = subset.reduce((acc, d) => acc + d.Spent, 0);
    const sales = subset.reduce((acc, d) => acc + d.Approved_Conversion, 0);
    return spent > 0 ? (sales * state.filters.aov) / spent : 0;
  });

  const cpaData = campaigns.map(id => {
    const subset = data.filter(d => d.xyz_campaign_id === id);
    const spent = subset.reduce((acc, d) => acc + d.Spent, 0);
    const sales = subset.reduce((acc, d) => acc + d.Approved_Conversion, 0);
    return sales > 0 ? spent / sales : 0;
  });

  const theme = getChartTheme();

  state.charts['campaignRoas'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          type: 'bar',
          label: 'ROAS (Multiple)',
          data: roasData,
          backgroundColor: 'rgba(139, 92, 246, 0.75)',
          yAxisID: 'yRoas',
          borderRadius: 5
        },
        {
          type: 'line',
          label: 'CPA ($ Acquisition Cost)',
          data: cpaData,
          borderColor: '#f43f5e',
          backgroundColor: '#f43f5e',
          borderWidth: 3,
          pointRadius: 5,
          yAxisID: 'yCpa'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        yRoas: {
          position: 'left',
          grid: { color: theme.gridColor },
          ticks: {
            color: theme.textColor,
            callback: (v) => v.toFixed(1) + 'x'
          },
          title: { display: true, text: 'ROAS', color: theme.textColor, font: { size: 10 } }
        },
        yCpa: {
          position: 'right',
          grid: { display: false },
          ticks: {
            color: '#f43f5e',
            callback: (v) => '$' + v.toFixed(0)
          },
          title: { display: true, text: 'CPA ($)', color: '#f43f5e', font: { size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: theme.textColor, font: { size: 11 } }
        }
      }
    }
  });
}

// CHART 5: Age Demographics Performance
function renderAgeDemographicsChart() {
  destroyChart('ageDemographics');
  const ctx = document.getElementById('ageDemographicsChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const ages = ['30-34', '35-39', '40-44', '45-49'];

  const spendData = ages.map(age => data.filter(d => d.age === age).reduce((acc, d) => acc + d.Spent, 0));
  const salesData = ages.map(age => data.filter(d => d.age === age).reduce((acc, d) => acc + d.Approved_Conversion, 0));
  const cpaData = ages.map((age, i) => salesData[i] > 0 ? spendData[i] / salesData[i] : 0);

  const theme = getChartTheme();

  state.charts['ageDemographics'] = new Chart(ctx, {
    data: {
      labels: ages.map(a => `Age ${a}`),
      datasets: [
        {
          type: 'bar',
          label: 'Ad Spend ($)',
          data: spendData,
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          yAxisID: 'yMoney',
          borderRadius: 5
        },
        {
          type: 'bar',
          label: 'Approved Sales',
          data: salesData,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          yAxisID: 'yCount',
          borderRadius: 5
        },
        {
          type: 'line',
          label: 'CPA ($ Cost/Acquisition)',
          data: cpaData,
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          borderWidth: 2.5,
          pointRadius: 4,
          yAxisID: 'yMoney'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        yMoney: {
          position: 'left',
          grid: { color: theme.gridColor },
          ticks: {
            color: theme.textColor,
            callback: (v) => formatCompact(v)
          }
        },
        yCount: {
          position: 'right',
          grid: { display: false },
          ticks: {
            color: '#10b981',
            callback: (v) => v
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: theme.textColor, font: { size: 10 } }
        }
      }
    }
  });
}

// CHART 6: Gender Performance Splits (Donuts)
function renderGenderCharts() {
  destroyChart('genderClicks');
  destroyChart('genderSales');

  const data = state.filtered;
  const mClicks = data.filter(d => d.gender === 'M').reduce((acc, d) => acc + d.Clicks, 0);
  const fClicks = data.filter(d => d.gender === 'F').reduce((acc, d) => acc + d.Clicks, 0);

  const mSales = data.filter(d => d.gender === 'M').reduce((acc, d) => acc + d.Approved_Conversion, 0);
  const fSales = data.filter(d => d.gender === 'F').reduce((acc, d) => acc + d.Approved_Conversion, 0);

  const theme = getChartTheme();

  // Gender Clicks Donut
  const ctxClicks = document.getElementById('genderClicksChart')?.getContext('2d');
  if (ctxClicks) {
    state.charts['genderClicks'] = new Chart(ctxClicks, {
      type: 'doughnut',
      data: {
        labels: ['Male Clicks', 'Female Clicks'],
        datasets: [{
          data: [mClicks, fClicks],
          backgroundColor: ['#3b82f6', '#ec4899'],
          borderColor: theme.gridColor,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: theme.textColor, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatNumber(ctx.raw)} clicks (${((ctx.raw / (mClicks + fClicks || 1)) * 100).toFixed(1)}%)`
            }
          }
        }
      }
    });
  }

  // Gender Sales Donut
  const ctxSales = document.getElementById('genderSalesChart')?.getContext('2d');
  if (ctxSales) {
    state.charts['genderSales'] = new Chart(ctxSales, {
      type: 'doughnut',
      data: {
        labels: ['Male Sales', 'Female Sales'],
        datasets: [{
          data: [mSales, fSales],
          backgroundColor: ['#10b981', '#f43f5e'],
          borderColor: theme.gridColor,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: theme.textColor, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatNumber(ctx.raw)} sales (${((ctx.raw / (mSales + fSales || 1)) * 100).toFixed(1)}%)`
            }
          }
        }
      }
    });
  }
}

// CHART 7: Top Audience Interests
function renderTopInterestsChart() {
  destroyChart('topInterests');
  const ctx = document.getElementById('topInterestsChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const interestMap = {};

  data.forEach(d => {
    if (!interestMap[d.interest]) {
      interestMap[d.interest] = { interest: d.interest, spent: 0, sales: 0, clicks: 0 };
    }
    interestMap[d.interest].spent += d.Spent;
    interestMap[d.interest].sales += d.Approved_Conversion;
    interestMap[d.interest].clicks += d.Clicks;
  });

  const sorted = Object.values(interestMap).sort((a, b) => b.sales - a.sales).slice(0, 12);
  const labels = sorted.map(item => `Interest #${item.interest}`);
  const salesData = sorted.map(item => item.sales);
  const cpaData = sorted.map(item => item.sales > 0 ? item.spent / item.sales : 0);

  const theme = getChartTheme();

  state.charts['topInterests'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Approved Sales',
          data: salesData,
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: theme.gridColor },
          ticks: { color: theme.textColor }
        },
        y: {
          grid: { display: false },
          ticks: { color: theme.textColor, font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = sorted[ctx.dataIndex];
              const cpa = item.sales > 0 ? (item.spent / item.sales).toFixed(2) : 'N/A';
              return ` Sales: ${ctx.raw} | CPA: $${cpa} | Spend: ${formatCurrency(item.spent)}`;
            }
          }
        }
      }
    }
  });
}

// CHART 8: Ad Spend vs Approved Purchases Scatter Matrix
function renderAdScatterChart() {
  destroyChart('adScatter');
  const ctx = document.getElementById('adScatterChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  // Sample up to 300 points for crisp canvas performance
  const sample = data.length > 300 ? data.filter((_, idx) => idx % Math.ceil(data.length / 300) === 0) : data;

  const points = sample.map(d => ({
    x: Number(d.Spent.toFixed(2)),
    y: d.Approved_Conversion,
    ad_id: d.ad_id,
    camp: d.xyz_campaign_id,
    clicks: d.Clicks
  }));

  const theme = getChartTheme();

  state.charts['adScatter'] = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Ad Placement',
        data: points,
        backgroundColor: (ctx) => {
          const raw = ctx.raw;
          if (!raw) return 'rgba(99, 102, 241, 0.6)';
          if (raw.camp === '916') return 'rgba(16, 185, 129, 0.7)';
          if (raw.camp === '936') return 'rgba(59, 130, 246, 0.7)';
          return 'rgba(139, 92, 246, 0.7)';
        },
        pointRadius: 4.5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Ad Spend ($ USD)', color: theme.textColor, font: { size: 10 } },
          grid: { color: theme.gridColor },
          ticks: { color: theme.textColor }
        },
        y: {
          title: { display: true, text: 'Approved Purchases (Sales)', color: theme.textColor, font: { size: 10 } },
          grid: { color: theme.gridColor },
          ticks: { color: theme.textColor }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pt = ctx.raw;
              const aov = state.filters.aov;
              const roas = pt.x > 0 ? ((pt.y * aov) / pt.x).toFixed(2) : '0';
              return ` Ad #${pt.ad_id} (Camp ${pt.camp}) → Spend: $${pt.x} | Sales: ${pt.y} | ROAS: ${roas}x`;
            }
          }
        }
      }
    }
  });
}

// Render Benchmark Comparison Table
function renderBenchmarkTable() {
  const tbody = document.getElementById('campaignBenchmarkBody');
  if (!tbody) return;

  const data = state.filtered;
  const campaigns = [
    { id: '916', label: 'Campaign 916', role: 'Initial Pilot Test' },
    { id: '936', label: 'Campaign 936', role: 'Mid-Scale Growth' },
    { id: '1178', label: 'Campaign 1178', role: 'High-Volume Scale' }
  ];

  const rows = campaigns.map(camp => {
    const subset = data.filter(d => d.xyz_campaign_id === camp.id);
    const ads = subset.length;
    const spent = subset.reduce((acc, d) => acc + d.Spent, 0);
    const impr = subset.reduce((acc, d) => acc + d.Impressions, 0);
    const clicks = subset.reduce((acc, d) => acc + d.Clicks, 0);
    const sales = subset.reduce((acc, d) => acc + d.Approved_Conversion, 0);

    const ctr = impr > 0 ? (clicks / impr) * 100 : 0;
    const cpc = clicks > 0 ? spent / clicks : 0;
    const cpa = sales > 0 ? spent / sales : 0;
    const rev = sales * state.filters.aov;
    const roas = spent > 0 ? rev / spent : 0;
    const roi = spent > 0 ? ((rev - spent) / spent) * 100 : 0;

    return `
      <tr class="hover:bg-slate-800/40">
        <td class="py-2.5 px-3 font-semibold text-white">${camp.label}</td>
        <td class="py-2.5 px-3 text-slate-400 font-sans">${camp.role}</td>
        <td class="py-2.5 px-3 text-right">${ads}</td>
        <td class="py-2.5 px-3 text-right font-semibold text-slate-200">${formatCurrency(spent)}</td>
        <td class="py-2.5 px-3 text-right">${formatNumber(clicks)}</td>
        <td class="py-2.5 px-3 text-right text-indigo-400">${formatPercent(ctr, 3)}</td>
        <td class="py-2.5 px-3 text-right">${formatCurrency(cpc, 2)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-emerald-400">${sales}</td>
        <td class="py-2.5 px-3 text-right text-amber-400">${formatCurrency(cpa, 2)}</td>
        <td class="py-2.5 px-3 text-right font-semibold text-emerald-300">${formatCurrency(rev)}</td>
        <td class="py-2.5 px-3 text-right font-bold ${roas >= 2 ? 'text-emerald-400' : roas >= 1 ? 'text-indigo-400' : 'text-rose-400'}">${roas.toFixed(2)}x</td>
        <td class="py-2.5 px-3 text-right font-bold ${roi >= 0 ? 'text-purple-400' : 'text-rose-400'}">${roi >= 0 ? '+' : ''}${formatPercent(roi, 1)}</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
}

// Render Demographics Table
function renderDemographicsTable() {
  const tbody = document.getElementById('demographicsTableBody');
  if (!tbody) return;

  const data = state.filtered;
  const groups = [
    { name: 'Age 30-34', filter: d => d.age === '30-34' },
    { name: 'Age 35-39', filter: d => d.age === '35-39' },
    { name: 'Age 40-44', filter: d => d.age === '40-44' },
    { name: 'Age 45-49', filter: d => d.age === '45-49' },
    { name: 'Gender: Male (M)', filter: d => d.gender === 'M' },
    { name: 'Gender: Female (F)', filter: d => d.gender === 'F' }
  ];

  tbody.innerHTML = groups.map(grp => {
    const subset = data.filter(grp.filter);
    const count = subset.length;
    if (count === 0) return '';

    const impr = subset.reduce((acc, d) => acc + d.Impressions, 0);
    const clicks = subset.reduce((acc, d) => acc + d.Clicks, 0);
    const spent = subset.reduce((acc, d) => acc + d.Spent, 0);
    const sales = subset.reduce((acc, d) => acc + d.Approved_Conversion, 0);

    const ctr = impr > 0 ? (clicks / impr) * 100 : 0;
    const cpc = clicks > 0 ? spent / clicks : 0;
    const salesCr = clicks > 0 ? (sales / clicks) * 100 : 0;
    const cpa = sales > 0 ? spent / sales : 0;
    const roas = spent > 0 ? (sales * state.filters.aov) / spent : 0;

    return `
      <tr class="hover:bg-slate-800/40">
        <td class="py-2 px-3 font-semibold text-white font-sans">${grp.name}</td>
        <td class="py-2 px-3 text-right">${count}</td>
        <td class="py-2 px-3 text-right">${formatCompact(impr)}</td>
        <td class="py-2 px-3 text-right">${formatNumber(clicks)}</td>
        <td class="py-2 px-3 text-right text-indigo-400">${formatPercent(ctr, 3)}</td>
        <td class="py-2 px-3 text-right font-medium text-slate-200">${formatCurrency(spent)}</td>
        <td class="py-2 px-3 text-right">${formatCurrency(cpc, 2)}</td>
        <td class="py-2 px-3 text-right font-bold text-emerald-400">${sales}</td>
        <td class="py-2 px-3 text-right">${formatPercent(salesCr, 2)}</td>
        <td class="py-2 px-3 text-right text-amber-400">${formatCurrency(cpa, 2)}</td>
        <td class="py-2 px-3 text-right font-bold ${roas >= 1.5 ? 'text-emerald-400' : 'text-slate-300'}">${roas.toFixed(2)}x</td>
      </tr>
    `;
  }).join('');
}

// Render Top Interests Table
function renderInterestsTable() {
  const tbody = document.getElementById('interestsTableBody');
  if (!tbody) return;

  const data = state.filtered;
  const interestMap = {};

  data.forEach(d => {
    if (!interestMap[d.interest]) {
      interestMap[d.interest] = {
        interest: d.interest,
        count: 0,
        spent: 0,
        clicks: 0,
        leads: 0,
        sales: 0
      };
    }
    interestMap[d.interest].count++;
    interestMap[d.interest].spent += d.Spent;
    interestMap[d.interest].clicks += d.Clicks;
    interestMap[d.interest].leads += d.Total_Conversion;
    interestMap[d.interest].sales += d.Approved_Conversion;
  });

  const sorted = Object.values(interestMap).sort((a, b) => b.sales - a.sales).slice(0, 10);

  tbody.innerHTML = sorted.map(item => {
    const cpa = item.sales > 0 ? item.spent / item.sales : 0;
    const rev = item.sales * state.filters.aov;
    const roas = item.spent > 0 ? rev / item.spent : 0;
    const roi = item.spent > 0 ? ((rev - item.spent) / item.spent) * 100 : 0;

    return `
      <tr class="hover:bg-slate-800/40">
        <td class="py-2 px-3 font-semibold text-white">Interest #${item.interest}</td>
        <td class="py-2 px-3 text-right">${item.count}</td>
        <td class="py-2 px-3 text-right text-slate-200">${formatCurrency(item.spent)}</td>
        <td class="py-2 px-3 text-right">${formatNumber(item.clicks)}</td>
        <td class="py-2 px-3 text-right text-amber-400">${item.leads}</td>
        <td class="py-2 px-3 text-right font-bold text-emerald-400">${item.sales}</td>
        <td class="py-2 px-3 text-right">${formatCurrency(cpa, 2)}</td>
        <td class="py-2 px-3 text-right font-bold ${roas >= 1.5 ? 'text-emerald-400' : 'text-slate-300'}">${roas.toFixed(2)}x</td>
        <td class="py-2 px-3 text-right ${roi >= 0 ? 'text-purple-400' : 'text-rose-400'}">${roi >= 0 ? '+' : ''}${formatPercent(roi, 1)}</td>
      </tr>
    `;
  }).join('');
}

// Render Granular Ad Records Table with Pagination and Search
function renderTable() {
  const tbody = document.getElementById('adTableBody');
  if (!tbody) return;

  let list = [...state.filtered];

  // Search filter
  if (state.table.search) {
    const q = state.table.search;
    list = list.filter(d => 
      String(d.ad_id).includes(q) ||
      String(d.xyz_campaign_id).includes(q) ||
      String(d.fb_campaign_id).includes(q) ||
      d.age.toLowerCase().includes(q) ||
      d.gender.toLowerCase().includes(q) ||
      String(d.interest).includes(q)
    );
  }

  // Sort
  const [col, dir] = state.table.sort.split('_');
  list.sort((a, b) => {
    let valA = a[col];
    let valB = b[col];

    if (col === 'cpa') {
      valA = a.Approved_Conversion > 0 ? a.Spent / a.Approved_Conversion : 999999;
      valB = b.Approved_Conversion > 0 ? b.Spent / b.Approved_Conversion : 999999;
    } else if (col === 'roas') {
      valA = a.Spent > 0 ? (a.Approved_Conversion * state.filters.aov) / a.Spent : 0;
      valB = b.Spent > 0 ? (b.Approved_Conversion * state.filters.aov) / b.Spent : 0;
    }

    if (dir === 'desc') return valB - valA;
    return valA - valB;
  });

  const totalRecords = list.length;
  const totalPages = Math.ceil(totalRecords / state.table.pageSize) || 1;
  state.table.page = Math.min(state.table.page, totalPages);

  const startIdx = (state.table.page - 1) * state.table.pageSize;
  const paginated = list.slice(startIdx, startIdx + state.table.pageSize);

  tbody.innerHTML = paginated.map(d => {
    const ctr = d.Impressions > 0 ? (d.Clicks / d.Impressions) * 100 : 0;
    const cpa = d.Approved_Conversion > 0 ? d.Spent / d.Approved_Conversion : 0;
    const roas = d.Spent > 0 ? (d.Approved_Conversion * state.filters.aov) / d.Spent : 0;

    let roasBadge = `<span class="text-rose-400 font-bold">${roas.toFixed(2)}x</span>`;
    if (roas >= 2.0) {
      roasBadge = `<span class="text-emerald-400 font-bold">${roas.toFixed(2)}x</span>`;
    } else if (roas >= 1.0) {
      roasBadge = `<span class="text-indigo-400 font-bold">${roas.toFixed(2)}x</span>`;
    }

    return `
      <tr class="hover:bg-slate-800/50">
        <td class="py-2 px-3 text-slate-300 font-bold">${d.ad_id}</td>
        <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5">${d.xyz_campaign_id}</span></td>
        <td class="py-2 px-3 text-slate-400">${d.fb_campaign_id}</td>
        <td class="py-2 px-3">${d.age}</td>
        <td class="py-2 px-3 ${d.gender === 'M' ? 'text-blue-400' : 'text-pink-400'}">${d.gender}</td>
        <td class="py-2 px-3 text-right">#${d.interest}</td>
        <td class="py-2 px-3 text-right">${formatCompact(d.Impressions)}</td>
        <td class="py-2 px-3 text-right">${d.Clicks}</td>
        <td class="py-2 px-3 text-right text-indigo-400">${formatPercent(ctr, 2)}</td>
        <td class="py-2 px-3 text-right text-slate-200 font-semibold">${formatCurrency(d.Spent, 2)}</td>
        <td class="py-2 px-3 text-right text-amber-400">${d.Total_Conversion}</td>
        <td class="py-2 px-3 text-right text-emerald-400 font-bold">${d.Approved_Conversion}</td>
        <td class="py-2 px-3 text-right text-slate-300">${d.Approved_Conversion > 0 ? formatCurrency(cpa, 2) : '—'}</td>
        <td class="py-2 px-3 text-right">${roasBadge}</td>
      </tr>
    `;
  }).join('');

  // Update Pagination Info
  const infoEl = document.getElementById('tablePaginationInfo');
  if (infoEl) {
    const endIdx = Math.min(startIdx + state.table.pageSize, totalRecords);
    infoEl.textContent = totalRecords === 0 
      ? 'No records match search.' 
      : `Showing ${startIdx + 1} to ${endIdx} of ${formatNumber(totalRecords)} records`;
  }

  // Render Pagination Buttons
  renderPaginationButtons(totalPages);
}

// Pagination Controls Builder
function renderPaginationButtons(totalPages) {
  const container = document.getElementById('tablePaginationButtons');
  if (!container) return;

  let html = `
    <button class="px-2.5 py-1 text-xs rounded border border-white/10 ${state.table.page > 1 ? 'hover:bg-slate-700 text-slate-200' : 'opacity-40 cursor-not-allowed text-slate-500'}" 
      onclick="setTablePage(${state.table.page - 1})" ${state.table.page <= 1 ? 'disabled' : ''}>
      Prev
    </button>
  `;

  // Page Numbers logic
  const current = state.table.page;
  const range = [];
  for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
    range.push(i);
  }

  range.forEach(p => {
    html += `
      <button class="px-2.5 py-1 text-xs rounded border ${p === current ? 'bg-indigo-600 border-indigo-500 text-white font-bold' : 'border-white/10 hover:bg-slate-700 text-slate-300'}" 
        onclick="setTablePage(${p})">
        ${p}
      </button>
    `;
  });

  html += `
    <button class="px-2.5 py-1 text-xs rounded border border-white/10 ${state.table.page < totalPages ? 'hover:bg-slate-700 text-slate-200' : 'opacity-40 cursor-not-allowed text-slate-500'}" 
      onclick="setTablePage(${state.table.page + 1})" ${state.table.page >= totalPages ? 'disabled' : ''}>
      Next
    </button>
  `;

  container.innerHTML = html;
}

// Table Page Switcher Handler
window.setTablePage = function(page) {
  state.table.page = page;
  renderTable();
};

// Export to CSV Function
function exportFilteredDataToCSV() {
  if (!state.filtered.length) {
    alert('No data available to export.');
    return;
  }

  const aov = state.filters.aov;
  const headers = [
    'ad_id',
    'xyz_campaign_id',
    'fb_campaign_id',
    'age',
    'gender',
    'interest',
    'Impressions',
    'Clicks',
    'Spent',
    'Total_Conversion_Leads',
    'Approved_Conversion_Sales',
    'CTR_Percent',
    'CPC_USD',
    'CPA_USD',
    'Gross_Revenue_USD',
    'ROAS'
  ];

  const csvRows = [headers.join(',')];

  state.filtered.forEach(d => {
    const ctr = d.Impressions > 0 ? ((d.Clicks / d.Impressions) * 100).toFixed(4) : '0';
    const cpc = d.Clicks > 0 ? (d.Spent / d.Clicks).toFixed(2) : '0';
    const cpa = d.Approved_Conversion > 0 ? (d.Spent / d.Approved_Conversion).toFixed(2) : '0';
    const rev = (d.Approved_Conversion * aov).toFixed(2);
    const roas = d.Spent > 0 ? (rev / d.Spent).toFixed(2) : '0';

    const row = [
      d.ad_id,
      d.xyz_campaign_id,
      d.fb_campaign_id,
      `"${d.age}"`,
      `"${d.gender}"`,
      d.interest,
      d.Impressions,
      d.Clicks,
      d.Spent.toFixed(2),
      d.Total_Conversion,
      d.Approved_Conversion,
      ctr,
      cpc,
      cpa,
      rev,
      roas
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `marketing_campaign_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Light / Dark Theme Toggle
function setupTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  state.theme = saved;
  applyTheme();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  applyTheme();
  renderAllCharts();
}

function applyTheme() {
  const body = document.body;
  const icon = document.getElementById('themeIcon');
  if (state.theme === 'light') {
    body.classList.add('light-theme');
    if (icon) icon.className = 'fa-solid fa-moon text-indigo-400 text-sm';
  } else {
    body.classList.remove('light-theme');
    if (icon) icon.className = 'fa-solid fa-sun text-amber-400 text-sm';
  }
}
