const fetch = require('node-fetch');
const sendMail = require('./sendMail');

const [cookie, user, pass, to] = process.argv.slice(2);
process.env.user = user;
process.env.pass = pass;
let score = 0;
let incr_point = 0;
let cont_count = -1;
let sum_count = -1;

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-ch-ua': '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  referer: 'https://juejin.cn/',
  accept: '*/*',
  cookie
};

// 抽奖
const drawFn = async () => {
  // 查询今日是否有免费抽奖机会
  const today = await fetch('https://api.juejin.cn/growth_api/v1/lottery_config/get', {
    headers,
    method: 'GET',
    credentials: 'include'
  }).then((res) => res.json());
  
  console.log("查询今日是否有免费抽奖机会：");
  console.log(JSON.stringify(today));

  if (today.err_no !== 0) return Promise.reject('已经签到！免费抽奖失败！');
  if (today.data.free_count === 0) return Promise.resolve('签到成功！今日已经免费抽奖！');

  // 免费抽奖
  const draw = await fetch('https://api.juejin.cn/growth_api/v1/lottery/draw', {
    headers,
    method: 'POST',
    credentials: 'include'
  }).then((res) => res.json());

  console.log("免费抽奖:");
  console.log(JSON.stringify(draw));
  
  if (draw.err_no !== 0) return Promise.reject('已经签到！免费抽奖异常！');
  console.log(JSON.stringify(draw, null, 2));
  if (draw.data.lottery_type === 1) score += 66;
  return Promise.resolve(`签到成功！恭喜抽到：${draw.data.lottery_name}`);
};

// 签到
(async () => {
  // 查询今日是否已经签到
  const today_status = await fetch('https://api.juejin.cn/growth_api/v1/get_today_status', {
    headers,
    method: 'GET',
    credentials: 'include'
  }).then((res) => res.json());

  console.log("查询今日是否已经签到:");
  console.log(JSON.stringify(today_status));
  
   
   // 查询连续天数
  const continuous = await fetch('https://api.juejin.cn/growth_api/v1/get_counts', {
    headers,
    method: 'POST',
    credentials: 'include'
  }).then((res) => res.json());
  
  console.log("查询连续天数:");
  console.log(JSON.stringify(continuous));
  if(continuous.err_no == 0){
     cont_count = continuous.data.cont_count;
     sum_count = continuous.data.sum_count;
  }
  
  if (today_status.err_no !== 0) return Promise.reject('签到失败！');
  if (today_status.data) return Promise.resolve('今日已经签到！');

  // 签到
  const check_in = await fetch('https://api.juejin.cn/growth_api/v1/check_in', {
    headers,
    method: 'POST',
    credentials: 'include'
  }).then((res) => res.json());

  console.log("签到:");
  console.log(JSON.stringify(check_in));
  incr_point = check_in.data.incr_point;
  
  
  if (check_in.err_no !== 0) return Promise.reject('签到异常！');
  
  cont_count += 1;
  sum_count += 1;
  return Promise.resolve(`签到成功！当前积分；${check_in.data.sum_point}`);
})()
  .then((msg) => {
    console.log(msg);
    return fetch('https://api.juejin.cn/growth_api/v1/get_cur_point', {
      headers,
      method: 'GET',
      credentials: 'include'
    }).then((res) => res.json());
  })
  .then((res) => {
    console.log(res);
    score = res.data;
    return drawFn();
  })
  .then((msg) => {
    console.log(msg);
    return sendMail({
      from: '掘金',
      to,
      subject: '定时任务',
      html: `
        <h1 style="text-align: center">自动签到通知</h1>
        <p style="text-indent: 2em">签到结果：${msg}</p>
        <p style="text-indent: 2em">签到获得：${incr_point}</p>
        <p style="text-indent: 2em">当前积分：${score}</p>
        <p style="text-indent: 2em">总共签到：${sum_count}天</p>
        <p style="text-indent: 2em">连续签到：${cont_count}天</p>       
      `
    }).catch(console.error);
  })
  .then(() => {
    console.log('邮件发送成功！');
  })
  .catch((err) => {
    sendMail({
      from: '掘金',
      to,
      subject: '定时任务',
      html: `
        <h1 style="text-align: center">自动签到通知</h1>
        <p style="text-indent: 2em">执行结果：${err}</p>
        <p style="text-indent: 2em">当前积分：${score}</p>
        <p style="text-indent: 2em">总共签到：${sum_count}天</p>
        <p style="text-indent: 2em">连续签到：${cont_count}天</p><br/>
      `
    }).catch(console.error);
  });
