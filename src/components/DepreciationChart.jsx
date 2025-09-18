import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const DepreciationChart = ({ purchasePrice, depreciationEntries, usefulLife, purchaseDate }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
const firstEntry = depreciationEntries[0];
const purchaseYear = firstEntry ? new Date(firstEntry.period).getFullYear() : new Date().getFullYear();

  useEffect(() => {
    if (chartRef.current) {
      // Prepare data for chart
      const years = Array.from({ length: usefulLife }, (_, i) => `Year ${i + 1}`);
      const depreciationData = Array(usefulLife).fill(0);
      
      // Group depreciation by year
     depreciationEntries.forEach(entry => {
  const date = new Date(entry.period);
  const yearIndex = date.getFullYear() - purchaseYear;
  if (yearIndex >= 0 && yearIndex < usefulLife) {
    depreciationData[yearIndex] += parseFloat(entry.amount);
  }
});

      // Calculate cumulative values
      const cumulativeDepreciation = [];
      let cumulative = 0;
      depreciationData.forEach(amount => {
        cumulative += amount;
        cumulativeDepreciation.push(cumulative);
      });

      const remainingValues = cumulativeDepreciation.map(dep => purchasePrice - dep);

      // Destroy previous chart instance if exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Create new chart
      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: years,
          datasets: [
            {
              label: 'Remaining Value',
              data: remainingValues,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1,
              fill: true
            },
            {
              label: 'Depreciation',
              data: cumulativeDepreciation,
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.1,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ₵${context.raw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
              }
            },
            legend: {
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '₵' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [purchasePrice, depreciationEntries, usefulLife]);

  return <canvas ref={chartRef} />;
};

export default DepreciationChart;