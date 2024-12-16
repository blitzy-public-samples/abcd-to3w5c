/**
 * @fileoverview Chart.js configuration with enhanced accessibility and performance optimizations
 * for the Habit Tracking Application's data visualization components.
 * @version 1.0.0
 */

import { Chart, ChartOptions } from 'chart.js';
import { AnalyticsChartData } from '../types/analytics.types';
import { HEATMAP_CONFIG, CHART_DEFAULTS } from '../constants/analytics.constants';

// Performance optimization constants
const CHART_ANIMATION_DURATION = 750;
const CHART_LINE_TENSION = 0.4;
const CHART_POINT_RADIUS = 4;
const CHART_PERFORMANCE_THRESHOLD = 100;

/**
 * Interface for accessibility configuration options
 */
interface AccessibilityConfig {
  ariaLabels: {
    chartLabel: string;
    legendLabel: string;
    tooltipLabel: string;
  };
  keyboardNav: {
    enabled: boolean;
    focusableElements: string[];
  };
  highContrast: {
    enabled: boolean;
    colorPalette: Record<string, string>;
  };
}

/**
 * Interface for performance optimization configuration
 */
interface PerformanceConfig {
  decimation: {
    enabled: boolean;
    threshold: number;
  };
  lazyLoading: boolean;
  renderThrottle: number;
}

/**
 * Default Chart.js configuration with accessibility and performance enhancements
 */
export const chartConfig = {
  defaults: {
    font: {
      family: CHART_DEFAULTS.FONT_FAMILY,
      size: 14,
    },
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: CHART_ANIMATION_DURATION,
      easing: 'easeInOutQuart',
    },
    elements: {
      line: {
        tension: CHART_LINE_TENSION,
      },
      point: {
        radius: CHART_POINT_RADIUS,
      },
    },
  },
  accessibility: {
    ariaLabels: {
      chartLabel: 'Habit tracking visualization chart',
      legendLabel: 'Chart legend',
      tooltipLabel: 'Data point details',
    },
    keyboardNav: {
      enabled: true,
      focusableElements: ['.chart-legend', '.chart-tooltip'],
    },
    highContrast: {
      enabled: false,
      colorPalette: {
        primary: '#000000',
        secondary: '#FFFFFF',
        accent: '#FF0000',
      },
    },
  },
  performance: {
    decimation: {
      enabled: true,
      threshold: CHART_PERFORMANCE_THRESHOLD,
    },
    lazyLoading: true,
    renderThrottle: 16, // ~60fps
  },
};

/**
 * Creates customized chart options with enhanced accessibility and performance
 */
const createChartOptions = (
  options: Partial<ChartOptions>,
  accessibilityConfig?: Partial<AccessibilityConfig>
): ChartOptions => {
  return {
    ...chartConfig.defaults,
    ...options,
    plugins: {
      ...options.plugins,
      legend: {
        display: true,
        labels: {
          font: chartConfig.defaults.font,
          usePointStyle: true,
          generateLabels: (chart) => {
            const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
            return labels.map(label => ({
              ...label,
              text: `${label.text} (${accessibilityConfig?.ariaLabels?.legendLabel || ''})`,
            }));
          },
        },
      },
      tooltip: {
        enabled: CHART_DEFAULTS.TOOLTIP_ENABLED,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: chartConfig.defaults.font,
        bodyFont: chartConfig.defaults.font,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.formattedValue}`;
          },
        },
      },
    },
  };
};

/**
 * Enhanced configuration for habit progress charts
 */
export const progressChartOptions = createChartOptions({
  scales: {
    x: {
      grid: {
        color: CHART_DEFAULTS.GRID_COLOR,
        drawBorder: false,
      },
      ticks: {
        maxRotation: 0,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: CHART_DEFAULTS.GRID_COLOR,
        drawBorder: false,
      },
      ticks: {
        precision: 0,
      },
    },
  },
}, {
  ariaLabels: {
    chartLabel: 'Habit progress over time',
    legendLabel: 'Progress indicators',
    tooltipLabel: 'Progress value',
  },
});

/**
 * Enhanced configuration for habit completion heatmaps
 */
export const heatmapChartOptions = createChartOptions({
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'day',
        displayFormats: {
          day: 'MMM d',
        },
      },
      grid: {
        display: false,
      },
    },
    y: {
      type: 'category',
      grid: {
        display: false,
      },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.raw as number;
          const intensity = HEATMAP_CONFIG.INTENSITY_LEVELS.find(level => level >= value) || 1;
          const status = value === 0 ? 'No activity' :
            value < 0.5 ? 'Low activity' :
            value < 0.75 ? 'Medium activity' : 'High activity';
          return `${status}: ${Math.round(value * 100)}%`;
        },
      },
    },
  },
}, {
  ariaLabels: {
    chartLabel: 'Habit completion heatmap',
    legendLabel: 'Activity levels',
    tooltipLabel: 'Activity details',
  },
});

/**
 * Optimizes chart rendering performance
 */
const optimizeChartRendering = (chart: Chart): void => {
  const ctx = chart.ctx;
  
  // Enable hardware acceleration
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    (ctx as any).webkitImageSmoothingEnabled = true;
  }

  // Implement lazy loading for datasets
  if (chartConfig.performance.lazyLoading) {
    chart.options.animation = {
      ...chart.options.animation,
      onProgress: (animation) => {
        if (animation.currentStep === animation.numSteps) {
          requestAnimationFrame(() => {
            chart.draw();
          });
        }
      },
    };
  }

  // Apply dataset decimation for large datasets
  if (chartConfig.performance.decimation.enabled) {
    const datasets = chart.data.datasets;
    datasets.forEach(dataset => {
      if (Array.isArray(dataset.data) && dataset.data.length > chartConfig.performance.decimation.threshold) {
        // Implement data decimation logic here
        const decimationRatio = Math.floor(dataset.data.length / chartConfig.performance.decimation.threshold);
        dataset.data = dataset.data.filter((_, index) => index % decimationRatio === 0);
      }
    });
  }
};

// Apply optimizations to Chart.js defaults
Chart.defaults = {
  ...Chart.defaults,
  ...chartConfig.defaults,
};

export { optimizeChartRendering };