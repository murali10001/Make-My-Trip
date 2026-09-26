/**
 * MakeMyTrip / MakeMyTour Load & Performance Testing Suite
 * Simulates high concurrent user load against Spring Boot backend endpoints.
 * 
 * Metrics evaluated:
 * - Throughput (Requests per second)
 * - Response time percentiles (p50, p90, p95, p99)
 * - Error rate percentage
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '50', 10);
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '500', 10);

const ENDPOINTS = [
    { name: 'Calculate Dynamic Price', path: '/api/pricing/calculate?itemId=FL-101&demand=HIGH&season=HOLIDAY_PEAK', method: 'GET' },
    { name: 'Get Available Offers', path: '/api/pricing/offers', method: 'GET' },
    { name: 'Flight Status Simulation', path: '/api/flight-status/simulate', method: 'GET' },
];

let completedRequests = 0;
let failedRequests = 0;
const responseTimes = [];

console.log(`=======================================================`);
console.log(`🚀 Starting Load & Performance Test Suite`);
console.log(`Target Base URL   : ${BASE_URL}`);
console.log(`Concurrent Users  : ${CONCURRENT_USERS}`);
console.log(`Total Requests    : ${TOTAL_REQUESTS}`);
console.log(`=======================================================\n`);

const startTime = Date.now();

function makeRequest(reqIndex) {
    return new Promise((resolve) => {
        const targetEndpoint = ENDPOINTS[reqIndex % ENDPOINTS.length];
        const reqStart = Date.now();

        const req = http.request(`${BASE_URL}${targetEndpoint.path}`, { method: targetEndpoint.method }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const duration = Date.now() - reqStart;
                responseTimes.push(duration);
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    completedRequests++;
                } else {
                    failedRequests++;
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            failedRequests++;
            resolve();
        });

        req.end();
    });
}

async function runLoadTest() {
    const queue = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i);
    const workers = Array.from({ length: CONCURRENT_USERS }, async () => {
        while (queue.length > 0) {
            const index = queue.shift();
            if (index !== undefined) {
                await makeRequest(index);
            }
        }
    });

    await Promise.all(workers);

    const totalDurationMs = Date.now() - startTime;
    const rps = ((completedRequests + failedRequests) / (totalDurationMs / 1000)).toFixed(2);

    responseTimes.sort((a, b) => a - b);
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.50)] || 0;
    const p90 = responseTimes[Math.floor(responseTimes.length * 0.90)] || 0;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
    const errorRate = (((failedRequests) / (completedRequests + failedRequests)) * 100).toFixed(2);

    console.log(`📊 Load Test Summary & Performance Report`);
    console.log(`-------------------------------------------------------`);
    console.log(`Total Execution Time : ${totalDurationMs} ms`);
    console.log(`Successful Requests  : ${completedRequests}`);
    console.log(`Failed Requests      : ${failedRequests}`);
    console.log(`Error Rate           : ${errorRate}%`);
    console.log(`Throughput           : ${rps} req/sec`);
    console.log(`Latency P50          : ${p50} ms`);
    console.log(`Latency P90          : ${p90} ms`);
    console.log(`Latency P95          : ${p95} ms`);
    console.log(`Latency P99          : ${p99} ms`);
    console.log(`-------------------------------------------------------`);

    if (parseFloat(errorRate) <= 1.0 && p95 < 500) {
        console.log(`✅ LOAD TEST PASSED: Performance SLA thresholds satisfied.`);
    } else {
        console.log(`⚠️ LOAD TEST NOTICE: Check server load capacity or active port.`);
    }
}

runLoadTest();
