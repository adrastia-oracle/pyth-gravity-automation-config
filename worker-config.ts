import { AdrastiaConfig, BatchConfig } from "../../src/config/adrastia-config";

const STD_WRITE_DELAY = 15_000; // Workers incrementally push updates with higher gas prices at 15 second intervals

const workerIndex = parseInt(process.env.ADRASTIA_WORKER_INDEX ?? "1");

const GRAVITY_UPTIME_WEBHOOK_URL = process.env.GRAVITY_UPTIME_WEBHOOK_URL;

const STANDARD_BATCH_CONFIG: BatchConfig = {
    // Primary polls every second, secondary every 4 seconds, others every 10 seconds
    pollingInterval: workerIndex == 1 ? 1_000 : workerIndex == 2 ? 4_000 : 10_000,
    writeDelay: STD_WRITE_DELAY * (workerIndex - 1),
    logging: [
        process.env.DATADOG_API_KEY
            ? {
                  type: "datadog",
                  sourceToken: process.env.DATADOG_API_KEY,
                  region: process.env.DATADOG_REGION,
                  level: "notice",
              }
            : undefined,
        process.env.ADRASTIA_LOGTAIL_TOKEN
            ? {
                  type: "logtail",
                  sourceToken: process.env.ADRASTIA_LOGTAIL_TOKEN,
                  level: "info",
              }
            : undefined,
    ],
    customerId: "pyth-gravity",
};

const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

// Priority is based on the worker index. Lower value means higher priority.
const PYTH_HERMES_ENDPOINTS = [
    {
        name: "Extrnode",
        url: process.env.PYTH_HERMES_EXTRNODE_URL,
        priority: {
            1: 1,
            2: 2,
            3: 1,
            4: 2,
        },
    },
    {
        name: "Pyth Official",
        url: "https://hermes.pyth.network",
        priority: {
            1: 2,
            2: 1,
            3: 2,
            4: 1,
        },
    },
];

const sortedHermesEndpoints = PYTH_HERMES_ENDPOINTS.sort((a, b) => {
    return a.priority[workerIndex] - b.priority[workerIndex];
}).map((endpoint) => {
    // Only return name and url
    return {
        name: endpoint.name,
        url: endpoint.url,
    };
});

const config: AdrastiaConfig = {
    httpCacheSeconds: 0,
    pythHermesEndpoints: sortedHermesEndpoints,
    chains: {
        gravity: {
            txConfig: {
                gasLimitMultiplier: {
                    dividend: 2n,
                    divisor: 1n,
                },
                transactionTimeout: STD_WRITE_DELAY * 2,
                txType: 2,
                eip1559: {
                    // Gas prices are based on the 75th percentile
                    percentile: 75,
                    historicalBlocks: Math.ceil(5 * 4), // 5 seconds of blocks
                    // Base fee multiplier of 1.25
                    baseFeeMultiplierDividend: 125n,
                    baseFeeMultiplierDivisor: 100n,
                },
                // Gas prices are incrementally scaled based on worker index
                gasPriceMultiplierDividend: 100n + BigInt(workerIndex - 1) * 50n,
                gasPriceMultiplierDivisor: 100n,
                // Check for tx confirmations every 250ms
                confirmationPollingInterval: 250,
                // Wait up to 2 seconds for tx confirmations
                transactionConfirmationTimeout: 2_000,
                // Wait for 5 confirmations
                waitForConfirmations: 5,
            },
            multicall2Address: MULTICALL3_ADDRESS,
            pythAddress: "0x2880aB155794e7179c9eE2e38200202908C17B43",
            uptimeWebhookUrl: GRAVITY_UPTIME_WEBHOOK_URL,
            batches: {
                0: {
                    ...STANDARD_BATCH_CONFIG,
                    batchId: "0-pyth-feeds",
                },
            },
            oracles: [
                {
                    address: "0x853E88C0Db7F55318AE03FE4Dd0a67Ffa10D8bc2", // Adrastia Pyth Updater contract address
                    tokens: [
                        {
                            address: "0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6",
                            batch: 0,
                            extra: {
                                desc: "WETH/USD",
                                heartbeat: 60, // 1 minute
                                updateThreshold: 10, // 10 bips, 0.1%
                                // preemptiveUpdateTime: 5, // 5 seconds
                            },
                        },
                        {
                            address: "0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33",
                            batch: 0,
                            extra: {
                                desc: "WBTC/USD",
                                heartbeat: 60, // 1 minute
                                updateThreshold: 10, // 10 bips, 0.1%
                                // preemptiveUpdateTime: 5, // 5 seconds
                            },
                        },
                        {
                            address: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
                            batch: 0,
                            extra: {
                                desc: "USDC/USD",
                                heartbeat: 60, // 1 minute
                                updateThreshold: 10, // 10 bips, 0.1%
                                // preemptiveUpdateTime: 5, // 5 seconds
                            },
                        },
                        {
                            address: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
                            batch: 0,
                            extra: {
                                desc: "USDT/USD",
                                heartbeat: 60, // 1 minute
                                updateThreshold: 10, // 10 bips, 0.1%
                                // preemptiveUpdateTime: 5, // 5 seconds
                            },
                        },
                        {
                            address: "0x0f6539d2f188eef5cb9dfba796f4c40407e55df14bb668a81a9ba3678d5a625c",
                            batch: 0,
                            extra: {
                                desc: "G/USD",
                                heartbeat: 60, // 1 minute
                                updateThreshold: 10, // 10 bips, 0.1%
                                // preemptiveUpdateTime: 5, // 5 seconds
                            },
                        },
                    ],
                },
            ],
        },
    },
};

export default config;
