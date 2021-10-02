function testWebSocket() {
  return new Promise( (resolve, reject) => {
    var socket = new WebSocket("ws://localhost:8999");

    socket.onopen = function(event) {
      socket.send("get data from postgres please");
    }

    socket.onmessage = function(event) {
      console.log(`I got some data: ${event.data}`);
 
      resolve(event.data);
    }
  });
}

async function getChartData() {
  try {
    await testWebSocket();
  }

  catch(error){
    console.log("you failed")
  }

  finally{
    return data
    console.log(data)
  }
}

//trigger!
//getChartData();


function buildChart (){

  var followerData = [{"date_week":"2021-09-29T22:00:00.000Z","new_followers":"4","follower_growth":"decline"},{"date_week":"2021-09-22T22:00:00.000Z","new_followers":"17","follower_growth":"increase"},{"date_week":"2021-09-15T22:00:00.000Z","new_followers":"7","follower_growth":"increase"},{"date_week":"2021-09-08T22:00:00.000Z","new_followers":"6","follower_growth":"decline"},{"date_week":"2021-09-01T22:00:00.000Z","new_followers":"10","follower_growth":"increase"},{"date_week":"2021-08-25T22:00:00.000Z","new_followers":"8","follower_growth":"increase"},{"date_week":"2021-08-18T22:00:00.000Z","new_followers":"6","follower_growth":"decline"},{"date_week":"2021-08-11T22:00:00.000Z","new_followers":"16","follower_growth":"constant"},{"date_week":"2021-08-04T22:00:00.000Z","new_followers":"16","follower_growth":"increase"},{"date_week":"2021-07-28T22:00:00.000Z","new_followers":"9","follower_growth":"increase"}]
  
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

buildChart();





