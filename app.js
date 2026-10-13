/**
 * Alpha innovation marketing Campaign Analytics
 * Power BI Interactive Single-Page Application Engine
 */

// Application State
const state = {
  raw: [],
  filtered: [],
  filters: {
    campaign: 'all',
    gender: 'all',
    age: 'all',
    interest: 'all',
    aov: 100
  },
  charts: {}
};

// Power BI Official Theme Color Palette
const PBI_COLORS = {
  blue1: '#118DFF',
  navy: '#12239E',
  orange: '#E66C37',
  purple: '#6B007B',
  magenta: '#E044A7',
  violet: '#744EC2',
  yellow: '#D9B300',
  red: '#D64550',
  green: '#107C41',
  teal: '#008272',
  grayBorder: '#e1e3e6',
  grayText: '#605e5c',
  grayDark: '#252423'
};

// Formatting Helpers
const formatCurrencyCompact = (val) => {
  if (val === undefined || isNaN(val)) return '$0';
  if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'K';
  return '$' + Number(val).toFixed(0);
};

const formatCurrency = (val, decimals = 2) => {
  if (val === undefined || isNaN(val)) return '$0.00';
  return '$' + Number(val).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatNumberCompact = (val) => {
  if (val === undefined || isNaN(val)) return '0';
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
  return Number(val).toLocaleString('en-US');
};

const formatNumber = (val) => {
  if (val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-US');
};

const formatPercent = (val, decimals = 2) => {
  if (val === undefined || isNaN(val)) return '0.00%';
  return Number(val).toFixed(decimals) + '%';
};

// Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initDataset();
  setupSlicerListeners();
});

// Load & Pre-process Real Dataset
function initDataset() {
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
    populateInterestOptions();
    applySlicers();
  } else {
    fetch('data.json')
      .then(res => res.json())
      .then(data => {
        state.raw = data;
        populateInterestOptions();
        applySlicers();
      })
      .catch(err => console.error('Failed to load dataset:', err));
  }
}

// Populate Interest Slicer Dropdown
function populateInterestOptions() {
  const select = document.getElementById('interestSelect');
  if (!select) return;

  const interests = [...new Set(state.raw.map(d => d.interest))].sort((a, b) => a - b);
  select.innerHTML = '<option value="all">All (40 Categories)</option>';

  interests.forEach(id => {
    const count = state.raw.filter(d => d.interest === id).length;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `Interest #${id} (${count})`;
    select.appendChild(opt);
  });
}

// Set Up Power BI Slicer Events
function setupSlicerListeners() {
  // Campaign Slicer Tiles
  document.querySelectorAll('.pbi-slicer-tile[data-slicer="campaign"]').forEach(tile => {
    tile.addEventListener('click', (e) => {
      document.querySelectorAll('.pbi-slicer-tile[data-slicer="campaign"]').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      state.filters.campaign = tile.getAttribute('data-val');
      applySlicers();
    });
  });

  // Gender Slicer Tiles
  document.querySelectorAll('.pbi-slicer-tile[data-slicer="gender"]').forEach(tile => {
    tile.addEventListener('click', (e) => {
      document.querySelectorAll('.pbi-slicer-tile[data-slicer="gender"]').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      state.filters.gender = tile.getAttribute('data-val');
      applySlicers();
    });
  });

  // Age Dropdown Slicer
  document.getElementById('ageSelect')?.addEventListener('change', (e) => {
    state.filters.age = e.target.value;
    applySlicers();
  });

  // Interest Dropdown Slicer
  document.getElementById('interestSelect')?.addEventListener('change', (e) => {
    state.filters.interest = e.target.value;
    applySlicers();
  });

  // Customer Lifetime Value / AOV Slider
  const aovSlider = document.getElementById('aovSlider');
  const aovDisplay = document.getElementById('aovDisplay');
  aovSlider?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    state.filters.aov = val;
    if (aovDisplay) aovDisplay.textContent = `$${val}`;
    applySlicers();
  });

  // Reset to Default Button
  document.getElementById('resetFiltersBtn')?.addEventListener('click', resetAllSlicers);

  // Export to CSV
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportSummarizedCSV);

  // Full Screen Toggle
  document.getElementById('fullScreenBtn')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });
}

// Reset Slicers to Default
function resetAllSlicers() {
  state.filters.campaign = 'all';
  state.filters.gender = 'all';
  state.filters.age = 'all';
  state.filters.interest = 'all';
  state.filters.aov = 100;

  document.querySelectorAll('.pbi-slicer-tile[data-slicer="campaign"]').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-val') === 'all');
  });

  document.querySelectorAll('.pbi-slicer-tile[data-slicer="gender"]').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-val') === 'all');
  });

  const ageEl = document.getElementById('ageSelect');
  if (ageEl) ageEl.value = 'all';

  const intEl = document.getElementById('interestSelect');
  if (intEl) intEl.value = 'all';

  const aovSlider = document.getElementById('aovSlider');
  if (aovSlider) aovSlider.value = 100;
  const aovDisplay = document.getElementById('aovDisplay');
  if (aovDisplay) aovDisplay.textContent = '$100';

  applySlicers();
}

// Slicer Filter Engine
function applySlicers() {
  const { campaign, gender, age, interest } = state.filters;

  state.filtered = state.raw.filter(d => {
    if (campaign !== 'all' && d.xyz_campaign_id !== campaign) return false;
    if (gender !== 'all' && d.gender !== gender) return false;
    if (age !== 'all' && d.age !== age) return false;
    if (interest !== 'all' && d.interest !== Number(interest)) return false;
    return true;
  });

  updateRecordFeedback();
  updateKpiCards();
  renderAllCharts();
  renderMatrixTable();
}

// Update Active Filter Indicator
function updateRecordFeedback() {
  const statusEl = document.getElementById('filterStatus');
  if (statusEl) {
    statusEl.textContent = `${formatNumber(state.filtered.length)}`;
  }
}

// Calculate & Update Power BI Callout KPI Cards
function updateKpiCards() {
  const data = state.filtered;
  const aov = state.filters.aov;

  const totalSpent = data.reduce((acc, d) => acc + d.Spent, 0);
  const totalImpressions = data.reduce((acc, d) => acc + d.Impressions, 0);
  const totalClicks = data.reduce((acc, d) => acc + d.Clicks, 0);
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
  const cpl = totalLeads > 0 ? totalSpent / totalLeads : 0;
  const salesCr = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;
  const cpa = totalSales > 0 ? totalSpent / totalSales : 0;

  // Card 1: Spend
  document.getElementById('kpiSpend').textContent = formatCurrencyCompact(totalSpent);
  document.getElementById('kpiCpc').textContent = formatCurrency(cpc, 2);
  document.getElementById('kpiCpm').textContent = formatCurrency(cpm, 2);

  // Card 2: Gross Revenue
  document.getElementById('kpiRevenue').textContent = formatCurrencyCompact(grossRevenue);
  const profitEl = document.getElementById('kpiProfit');
  if (profitEl) {
    profitEl.textContent = (netProfit >= 0 ? '+' : '') + formatCurrencyCompact(netProfit);
    profitEl.className = netProfit >= 0 ? 'text-[#107c41] font-bold' : 'text-[#d64550] font-bold';
  }

  // Card 3: Campaign ROI
  const roiEl = document.getElementById('kpiRoi');
  if (roiEl) {
    roiEl.textContent = (roi >= 0 ? '+' : '') + formatPercent(roi, 1);
    roiEl.className = 'pbi-kpi-value ' + (roi >= 0 ? 'text-[#6b007b]' : 'text-[#d64550]');
  }
  document.getElementById('kpiRoas').textContent = roas.toFixed(2) + 'x';

  // Card 4: Impressions & Clicks
  document.getElementById('kpiImpressions').textContent = formatNumberCompact(totalImpressions);
  document.getElementById('kpiClicks').textContent = formatNumberCompact(totalClicks);
  document.getElementById('kpiCtr').textContent = formatPercent(ctr, 3);

  // Card 5: Inquiries (Leads)
  document.getElementById('kpiLeads').textContent = formatNumber(totalLeads);
  document.getElementById('kpiLeadCr').textContent = formatPercent(leadCr, 2);
  document.getElementById('kpiCpl').textContent = formatCurrency(cpl, 2);

  // Card 6: Approved Purchases
  document.getElementById('kpiSales').textContent = formatNumber(totalSales);
  document.getElementById('kpiSalesCr').textContent = formatPercent(salesCr, 2);
  document.getElementById('kpiCpa').textContent = formatCurrency(cpa, 2);
}

// Destroy Existing Chart Safely
function destroyChart(name) {
  if (state.charts[name]) {
    state.charts[name].destroy();
    state.charts[name] = null;
  }
}

// Render All Power BI Visuals
function renderAllCharts() {
  renderGenderPieChart();
  renderAgeSpendPieChart();
  renderCampaignBarChart();
  renderFunnelComboChart();
}

// -------------------------------------------------------------
// VISUAL 1: PIE CHART - Approved Purchases by Gender
// -------------------------------------------------------------
function renderGenderPieChart() {
  destroyChart('genderPie');
  const ctx = document.getElementById('genderPieChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const mSales = data.filter(d => d.gender === 'M').reduce((acc, d) => acc + d.Approved_Conversion, 0);
  const fSales = data.filter(d => d.gender === 'F').reduce((acc, d) => acc + d.Approved_Conversion, 0);
  const total = mSales + fSales || 1;

  state.charts['genderPie'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Male Buyers', 'Female Buyers'],
      datasets: [{
        data: [mSales, fSales],
        backgroundColor: [PBI_COLORS.blue1, PBI_COLORS.magenta],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: "'Segoe UI', sans-serif", size: 11 },
            color: PBI_COLORS.grayDark,
            boxWidth: 12,
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${formatNumber(ctx.raw)} sales (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// VISUAL 2: PIE CHART - Ad Spend by Age Bracket
// -------------------------------------------------------------
function renderAgeSpendPieChart() {
  destroyChart('ageSpendPie');
  const ctx = document.getElementById('ageSpendPieChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const ages = ['30-34', '35-39', '40-44', '45-49'];
  const spendByAge = ages.map(age => {
    return data.filter(d => d.age === age).reduce((acc, d) => acc + d.Spent, 0);
  });
  const totalSpend = spendByAge.reduce((a, b) => a + b, 0) || 1;

  state.charts['ageSpendPie'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ages.map(a => `Age ${a}`),
      datasets: [{
        data: spendByAge,
        backgroundColor: [PBI_COLORS.blue1, PBI_COLORS.navy, PBI_COLORS.orange, PBI_COLORS.purple],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: "'Segoe UI', sans-serif", size: 11 },
            color: PBI_COLORS.grayDark,
            boxWidth: 12,
            padding: 8
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = ((ctx.raw / totalSpend) * 100).toFixed(1);
              return ` ${ctx.label}: ${formatCurrency(ctx.raw, 0)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// VISUAL 3: CLUSTERED COLUMN CHART - Spend vs Gross Revenue
// -------------------------------------------------------------
function renderCampaignBarChart() {
  destroyChart('campaignBar');
  const ctx = document.getElementById('campaignBarChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const campaigns = ['916', '936', '1178'];
  const labels = ['Camp 916 (Pilot)', 'Camp 936 (Growth)', 'Camp 1178 (Scale)'];

  const spendData = campaigns.map(id => {
    return data.filter(d => d.xyz_campaign_id === id).reduce((acc, d) => acc + d.Spent, 0);
  });

  const revData = campaigns.map(id => {
    const sales = data.filter(d => d.xyz_campaign_id === id).reduce((acc, d) => acc + d.Approved_Conversion, 0);
    return sales * state.filters.aov;
  });

  state.charts['campaignBar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Ad Spend ($ Cost)',
          data: spendData,
          backgroundColor: PBI_COLORS.blue1,
          borderRadius: 2
        },
        {
          label: 'Gross Revenue ($ Sales)',
          data: revData,
          backgroundColor: PBI_COLORS.green,
          borderRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Segoe UI', sans-serif", size: 10.5 }, color: PBI_COLORS.grayText }
        },
        y: {
          grid: { color: PBI_COLORS.grayBorder },
          ticks: {
            font: { family: "'Segoe UI', sans-serif", size: 10 },
            color: PBI_COLORS.grayText,
            callback: (v) => formatCurrencyCompact(v)
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            font: { family: "'Segoe UI', sans-serif", size: 10.5 },
            color: PBI_COLORS.grayDark,
            boxWidth: 10
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw, 0)}`
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// VISUAL 4: COMBO CHART - Marketing Funnel Drop-off (Log Scale)
// -------------------------------------------------------------
function renderFunnelComboChart() {
  destroyChart('funnelCombo');
  const ctx = document.getElementById('funnelComboChart')?.getContext('2d');
  if (!ctx) return;

  const data = state.filtered;
  const impressions = data.reduce((acc, d) => acc + d.Impressions, 0);
  const clicks = data.reduce((acc, d) => acc + d.Clicks, 0);
  const leads = data.reduce((acc, d) => acc + d.Total_Conversion, 0);
  const sales = data.reduce((acc, d) => acc + d.Approved_Conversion, 0);

  state.charts['funnelCombo'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1. Impressions', '2. Clicks', '3. Leads', '4. Purchases'],
      datasets: [
        {
          type: 'bar',
          label: 'Volume (Log scale)',
          data: [impressions, clicks, leads, sales],
          backgroundColor: [
            PBI_COLORS.navy,
            PBI_COLORS.blue1,
            PBI_COLORS.orange,
            PBI_COLORS.green
          ],
          borderRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Segoe UI', sans-serif", size: 10.5 }, color: PBI_COLORS.grayText }
        },
        y: {
          type: 'logarithmic',
          grid: { color: PBI_COLORS.grayBorder },
          ticks: {
            font: { family: "'Segoe UI', sans-serif", size: 10 },
            color: PBI_COLORS.grayText,
            callback: (v) => formatNumberCompact(v)
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Funnel Volume: ${formatNumber(ctx.raw)} units`
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// VISUAL 5: POWER BI MATRIX TABLE - Top Performing Interests
// -------------------------------------------------------------
function renderMatrixTable() {
  const tbody = document.getElementById('matrixTableBody');
  if (!tbody) return;

  const data = state.filtered;
  const interestMap = {};

  data.forEach(d => {
    if (!interestMap[d.interest]) {
      interestMap[d.interest] = {
        id: d.interest,
        ads: 0,
        spent: 0,
        clicks: 0,
        leads: 0,
        sales: 0
      };
    }
    interestMap[d.interest].ads++;
    interestMap[d.interest].spent += d.Spent;
    interestMap[d.interest].clicks += d.Clicks;
    interestMap[d.interest].leads += d.Total_Conversion;
    interestMap[d.interest].sales += d.Approved_Conversion;
  });

  const sorted = Object.values(interestMap).sort((a, b) => b.sales - a.sales).slice(0, 8);

  tbody.innerHTML = sorted.map(item => {
    const cpa = item.sales > 0 ? item.spent / item.sales : 0;
    const rev = item.sales * state.filters.aov;
    const roas = item.spent > 0 ? rev / item.spent : 0;

    return `
      <tr>
        <td class="font-semibold text-gray-800">Interest Code #${item.id}</td>
        <td class="text-right text-gray-600">${item.ads}</td>
        <td class="text-right font-medium">${formatCurrency(item.spent, 0)}</td>
        <td class="text-right text-gray-700">${formatNumber(item.clicks)}</td>
        <td class="text-right text-[#e66c37] font-semibold">${item.leads}</td>
        <td class="text-right text-[#107c41] font-bold">${item.sales}</td>
        <td class="text-right text-gray-800">${cpa > 0 ? formatCurrency(cpa, 2) : '—'}</td>
        <td class="text-right font-bold ${roas >= 2.0 ? 'text-[#107c41]' : roas >= 1.0 ? 'text-[#118dff]' : 'text-[#d64550]'}">${roas.toFixed(2)}x</td>
      </tr>
    `;
  }).join('');
}

// Export CSV Summary
function exportSummarizedCSV() {
  if (!state.filtered.length) {
    alert('No records available to export.');
    return;
  }

  const headers = ['ad_id', 'xyz_campaign_id', 'fb_campaign_id', 'age', 'gender', 'interest', 'Impressions', 'Clicks', 'Spent', 'Total_Conversion', 'Approved_Conversion', 'Gross_Revenue', 'ROAS'];
  const rows = [headers.join(',')];

  state.filtered.forEach(d => {
    const rev = (d.Approved_Conversion * state.filters.aov).toFixed(2);
    const roas = d.Spent > 0 ? (rev / d.Spent).toFixed(2) : '0';
    rows.push([
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
      rev,
      roas
    ].join(','));
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Alpha_Innovation_Campaign_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
