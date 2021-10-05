function testWebSocket() {
  return new Promise( (resolve, reject) => {
    var socket = new WebSocket("ws://localhost:8999");

    socket.onopen = function(event) {
      socket.send("websocket is now open");
    }

    socket.onmessage = function(event) {
      console.log(`I got some data: ${event.data}`);
      if (event.data != "Hi there, I am a WebSocket server") {
        buildChart(JSON.parse(event.data));  
      }
      
 
      resolve(event.data);
    }
  });
}

function buildChart (followerGrowthData){

  var followerData = followerGrowthData
  
  var footer = (tooltipItems) => {
    let x = "unknown"

    tooltipItems.forEach(function(tooltipItem) {
      x = tooltipItem.raw.follower_growth;
    });
    return x + ' from last week';
  };

  var ctx = document.getElementById('myChart').getContext('2d');
  var myChart = new Chart(ctx, {
      type: 'bar',
      data: {
          // labels: followerData.follower_growth,
          datasets: [{
              label: 'New Followers',
              data: followerData,
              backgroundColor: ['rgba(255, 192, 203, 1.0)']
          }]
      },
      options: {
          responsive: true,
          aspectRatio: 2,
          parsing: {
              xAxisKey: 'date_week',
              yAxisKey: 'new_followers'
          },
          plugins: {
            tooltip: {
              callbacks: {
                footer: footer,
              }
            }
          }
      }
  });

}

async function getChartData() {
  try {
    let data = await testWebSocket();
  }

  catch(error){
    console.log("you failed")
  }

  finally{
    console.log('this should be the end buddy')
  }
}

//trigger!
//getChartData();

getChartData();





