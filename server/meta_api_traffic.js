import axios from 'axios';

// ── Configuration ────────────────────────────────────────────────────────────
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.AD_ACCOUNT_ID || 'act_228005107581213';
const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const BATCH_SIZE = 25;
const BATCH_PAUSE_MS = 90 * 1000; // 90 seconds
const TARGET_CALLS = 500;
const MIN_DELAY_MS = 4000;
const MAX_DELAY_MS = 8000;
const RATE_LIMIT_WAIT_MS = 5 * 60 * 1000; // 5 minutes when rate limited

// ── Endpoints to rotate ──────────────────────────────────────────────────────
const ENDPOINTS = [
  { path: `/${AD_ACCOUNT_ID}/campaigns`, fields: 'id,name,status,objective,daily_budget,lifetime_budget' },
  { path: `/${AD_ACCOUNT_ID}/adsets`, fields: 'id,name,status,daily_budget,targeting,bid_amount' },
  { path: `/${AD_ACCOUNT_ID}/ads`, fields: 'id,name,status,creative' },
  { path: `/${AD_ACCOUNT_ID}/insights`, fields: 'impressions,clicks,spend,ctr,cpc,actions' },
  { path: `/${AD_ACCOUNT_ID}/customaudiences`, fields: 'id,name,subtype' },
  { path: `/${AD_ACCOUNT_ID}/adimages`, fields: 'hash,name,url,width,height' },
  { path: `/${AD_ACCOUNT_ID}/adcreatives`, fields: 'id,name,title,body,object_story_spec' },
  { path: `/${AD_ACCOUNT_ID}`, fields: 'id,name,account_status,currency,balance,amount_spent' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const timestamp = () => new Date().toLocaleTimeString();

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!ACCESS_TOKEN) {
    console.error('ERROR: Set ACCESS_TOKEN environment variable.');
    console.error('Usage: ACCESS_TOKEN=<your-token> node meta_api_traffic.js');
    process.exit(1);
  }

  console.log(`\n=== Meta API Traffic Generator ===`);
  console.log(`Account: ${AD_ACCOUNT_ID}`);
  console.log(`Target: ${TARGET_CALLS} successful calls`);
  console.log(`Batch size: ${BATCH_SIZE}, pause: ${BATCH_PAUSE_MS / 1000}s between batches`);
  console.log(`Delay per request: ${MIN_DELAY_MS / 1000}–${MAX_DELAY_MS / 1000}s`);
  console.log(`Rate limit cooldown: ${RATE_LIMIT_WAIT_MS / 1000}s\n`);

  let successCount = 0;
  let errorCount = 0;
  let batchNum = 0;

  while (successCount < TARGET_CALLS) {
    batchNum++;
    const batchTarget = Math.min(BATCH_SIZE, TARGET_CALLS - successCount);
    console.log(`\n── Batch ${batchNum} (${batchTarget} requests) ──`);

    for (let i = 0; i < batchTarget; i++) {
      const endpoint = pick(ENDPOINTS);
      const url = `${BASE_URL}${endpoint.path}`;

      try {
        const res = await axios.get(url, {
          params: { access_token: ACCESS_TOKEN, fields: endpoint.fields, limit: 25 },
          timeout: 15000,
        });

        successCount++;
        const dataCount = res.data?.data?.length ?? (res.data?.id ? 1 : 0);
        const appUsage = res.headers['x-app-usage'] || '';
        const adAccUsage = res.headers['x-ad-account-usage'] || '';
        const usageInfo = [appUsage && `app:${appUsage}`, adAccUsage && `acc:${adAccUsage}`].filter(Boolean).join(' | ');
        console.log(`  [${timestamp()}] #${successCount} OK ${endpoint.path} → ${dataCount} items ${usageInfo ? '| ' + usageInfo : ''}`);
      } catch (err) {
        const status = err.response?.status;
        const metaErr = err.response?.data?.error;
        const msg = metaErr?.message || err.message;

        // Stop on auth errors
        if (status === 401 || status === 403) {
          console.error(`\n FATAL: Auth error (${status}). Token expired or missing permissions.`);
          printSummary(successCount, errorCount, batchNum);
          process.exit(1);
        }

        // Rate limited — wait and retry instead of counting as error
        if (status === 400 && (msg.includes('too many calls') || msg.includes('request limit'))) {
          console.log(`  [${timestamp()}] RATE LIMITED — waiting ${RATE_LIMIT_WAIT_MS / 1000}s...`);
          await sleep(RATE_LIMIT_WAIT_MS);
          i--; // retry this request
          continue;
        }

        // Other errors
        errorCount++;
        console.error(`  [${timestamp()}] FAIL ${endpoint.path} → ${status || 'network'} ${msg}`);
      }

      // Random delay between requests
      const delay = randInt(MIN_DELAY_MS, MAX_DELAY_MS);
      await sleep(delay);
    }

    printSummary(successCount, errorCount, batchNum);

    // Pause between batches (unless we're done)
    if (successCount < TARGET_CALLS) {
      console.log(`\n  Pausing ${BATCH_PAUSE_MS / 1000}s before next batch...`);
      await sleep(BATCH_PAUSE_MS);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  printSummary(successCount, errorCount, batchNum);
}

function printSummary(success, errors, batches) {
  const total = success + errors;
  const rate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0.0';
  console.log(`  Summary: ${success} success, ${errors} errors (${rate}% error rate), ${batches} batches`);
}

main();
