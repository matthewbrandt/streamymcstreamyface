require("dotenv").config();
const axios = require('axios').default;
const broadcaster_id = '556670211';

// create axios instance to retrieve follow data from api
// function that GETs the instance and returns data, rerunning until no more cursors left
// take all data and write to postgres in one go

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'datamcdataface',
  password: process.env.POSTGRES_PW,
  port: 5432
});

// create the table on first setup
const create_query = `
CREATE TABLE IF NOT EXISTS user_followers (
  from_id int,
  from_login varchar,
  from_name varchar,
  to_id int,
  to_login varchar,
  to_name varchar,
  followed_at timestamp
);
`;

pool.query(create_query);

let cursor_string = '';
const instance = axios.create({
    baseURL: 'http://localhost:8000/api/twitch/helix/users/follows',
    headers: {
        'Authorization': 'TOKEN ' + process.env.TAU_TOKEN,
    },
    params: {
      to_id: broadcaster_id,
      after: cursor_string
    }
})

async function getFollowerData() {
  let followerArr = [];
  
  const firstResult = await instance.get();
  for (const row of firstResult.data.data) {
    followerArr.push(row);
    }
  
  const secondResult = await instance.get('', { params: { after: firstResult.data.pagination.cursor }});
  for (const row of secondResult.data.data) {
    followerArr.push(row);
    }

  const thirdResult = await instance.get('', { params: { after: secondResult.data.pagination.cursor }});
  for (const row of thirdResult.data.data) {
    followerArr.push(row);
    }
  //console.log(followerArr);
  return followerArr;
  
};

async function mostRecentFollowTimestamp() {
  let getFollower = `
  SELECT MAX(followed_at) FROM user_followers;`
  ;

  try {
    const res = await pool.query(getFollower)
    //console.log("fn", res.rows[0].max)
    return console.log("max timestmap in DB: ") + res.rows[0].max ? res.rows[0].max : '1970-01-01T00:00:00Z';
  } catch (err) {
    console.log(err.stack)
  }
};

async function dropFollowers(followData, mostRecentFollowerTS) { 
  const writeFollowers = followData.filter(el =>
    el.followed_at > mostRecentFollowerTS
    )
  return writeFollowers;
}

async function writeFollowerData(follower_array) {
  let write_followers = `
  INSERT INTO user_followers
  VALUES ($1,$2,$3,$4,$5,$6,$7);`
  ;

  //console.log(follower_array);
  for (let follower of follower_array) {
    await pool.query(write_followers, Object.values(follower))
  }
};

async function computeFollowerData() {
  let getFollowerKPI = `
  WITH generate_series AS (
      SELECT generate_series AS full_ts
      FROM generate_series('2021-07-30T19:00:00Z',CURRENT_TIMESTAMP,'1 hour'::INTERVAL)
  ),

  follower_velocity AS (
      SELECT *,
            DATE_TRUNC('hour', followed_at::TIMESTAMP) AS followed_at_ts
      FROM generate_series AS gs
              LEFT JOIN user_followers AS uf ON DATE_TRUNC('hour', uf.followed_at::TIMESTAMP) = gs.full_ts
  ),

  final AS (
  SELECT DISTINCT DATE_TRUNC('week', followed_at_ts) AS time_interval,
                  COUNT(DISTINCT from_id) AS new_followers
  FROM follower_velocity
  GROUP BY 1
  ORDER BY 1 DESC),

  final_final AS (
  SELECT CAST(time_interval AS date) AS date_week,
        new_followers,
        CASE
            WHEN follower_rate < 0 THEN 'decline'
            WHEN follower_rate = 0 THEN 'constant'
          ELSE 'increase'
        END AS follower_growth
  FROM (
      SELECT *,
            --handle divide by 0 case if the user has no new followers
            (new_followers - LEAD(new_followers) OVER(ORDER BY time_interval DESC)) / new_followers::FLOAT AS follower_rate

      FROM final
      WHERE time_interval IS NOT NULL)t
  ORDER BY time_interval DESC)

  INSERT INTO followers_growth
  SELECT * FROM final_final;
  `;

  try {
    await pool.query("DELETE FROM followers_growth")
    const res = await pool.query(getFollowerKPI)
    return res.rows;
  } catch (err) {
    console.log(err.stack)
  }
};

async function readFollowerGrowth() {
  let getFollowerGrowth = `
    SELECT *
    FROM followers_growth
  `;

  try {
    const res = await pool.query(getFollowerGrowth)
    return res.rows;
  } catch (err) {
    console.log(err.stack)
  }
}

async function followerStuff() {
  const followData = await getFollowerData();
  //console.log(followData);

  //check the most recent timestamp in postgres before adding rows
  const mostRecentFollowerTS = await mostRecentFollowTimestamp();
  console.log(mostRecentFollowerTS);

  const writeFollowers = await dropFollowers(followData, mostRecentFollowerTS);
  console.log("new followers written in DB: ", writeFollowers.length);
  
  await writeFollowerData(writeFollowers);

  //calculate the metrics and insert new values into DB
  await computeFollowerData();

  //stored procedure if executing the same query
  const kpi = await readFollowerGrowth();
  
  //close the pool, no more swimming
  //pool.end();

  return kpi;

};

const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {

  //connection is up, let's add a simple simple event
  ws.on('message', async (message) => {

      //log the received message and send it back to the client
      console.log('ws message received: %s', message);
      //ws.send(`Hello, you sent -> ${message}`);
      const kpi = await followerStuff();
      ws.send(JSON.stringify(kpi));
      console.log('ws data sent');

  });


  //send immediatly a feedback to the incoming connection    
  ws.send('Hi there, I am a WebSocket server');
});

followerStuff();

//start our server
server.listen(8999, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});
