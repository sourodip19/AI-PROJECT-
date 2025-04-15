document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('http://localhost:3000/api/feedback/analytics');
      const data = await response.json();
      
      // Update dashboard with analytics data
      document.getElementById('total-responses').textContent = data.totalResponses;
      document.getElementById('avg-satisfaction').textContent = 
        data.averageSatisfaction.toFixed(1) + ' / 5';
      
      // Create user type distribution chart
      const userTypeCtx = document.getElementById('user-type-chart').getContext('2d');
      new Chart(userTypeCtx, {
        type: 'pie',
        data: {
          labels: data.userTypeDistribution.map(item => item._id),
          datasets: [{
            data: data.userTypeDistribution.map(item => item.count),
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            },
            title: {
              display: true,
              text: 'User Type Distribution'
            }
          }
        }
      });
      
      // Create topic interests chart
      const topicsCtx = document.getElementById('topics-chart').getContext('2d');
      new Chart(topicsCtx, {
        type: 'bar',
        data: {
          labels: data.topicInterests.map(item => item._id),
          datasets: [{
            label: 'Interest Count',
            data: data.topicInterests.map(item => item.count),
            backgroundColor: '#36A2EB'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Topic Interests'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      document.getElementById('error-message').classList.remove('hidden');
    }
  });