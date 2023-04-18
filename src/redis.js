"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const redis = require("redis");
const util = require("util");

const KEY = `account1/balance`;
const DEFAULT_BALANCE = 100;

exports.chargeRequestRedis = async function (input) {
    const redisClient = await getRedisClient();

    await watch(redisClient, KEY);  // acquire lock on key
    let remainingBalance = await getBalanceRedis(redisClient, KEY);
    const charges = getCharges();

    const isAuthorized = authorizeRequest(remainingBalance, charges);
    if (!isAuthorized) {
        await unwatch(redisClient);  // release lock on key
        await disconnectRedis(redisClient);

        return {
            remainingBalance,
            isAuthorized,
            charges: 0,
        };
    }

    let redisTransactionClient = await multi(redisClient);
    redisTransactionClient = await chargeRedis(redisTransactionClient, KEY, charges);
    remainingBalance = await exec(redisTransactionClient);
    await disconnectRedis(redisClient);

    return {
        remainingBalance,
        charges,
        isAuthorized,
    };
};

exports.resetRedis = async function () {
    const redisClient = await getRedisClient();
    const ret = new Promise((resolve, reject) => {
        redisClient.set(KEY, String(DEFAULT_BALANCE), (err, res) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(DEFAULT_BALANCE);
            }
        });
    });
    await disconnectRedis(redisClient);
    return ret;
};

async function getRedisClient() {
    return new Promise((resolve, reject) => {
        try {
            const client = new redis.RedisClient({
                host: process.env.ENDPOINT,
                port: parseInt(process.env.PORT || "6379"),
            });
            client.on("ready", () => {
                console.log('redis client ready');
                resolve(client);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}

async function disconnectRedis(client) {
    return new Promise((resolve, reject) => {
        client.quit((error, res) => {
            if (error) {
                reject(error);
            }
            else if (res == "OK") {
                console.log('redis client disconnected');
                resolve(res);
            }
            else {
                reject("unknown error closing redis connection.");
            }
        });
    });
}

function authorizeRequest(remainingBalance, charges) {
    return remainingBalance >= charges;
}

function getCharges() {
    return DEFAULT_BALANCE / 20;
}

async function getBalanceRedis(redisClient, key) {
    const res = await util.promisify(redisClient.get).bind(redisClient).call(redisClient, key);
    return parseInt(res || "0");
}

async function chargeRedis(redisClient, key, charges) {
    return redisClient.decrby(key, charges);
}

async function watch(redisClient, key) {
    return util.promisify(redisClient.watch).bind(redisClient).call(redisClient, key);
}

async function unwatch(redisClient) {
    return util.promisify(redisClient.unwatch).bind(redisClient).call(redisClient);
}

function multi(redisClient) {
    return redisClient.multi();
}

async function exec(redisClient) {
    return util.promisify(redisClient.exec).bind(redisClient).call(redisClient);
}
