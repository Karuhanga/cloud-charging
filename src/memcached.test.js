"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const memcached = require("memcached");
const chargeRequestMemchached = require("./memcached");

const KEY = `testAccount/balance`;
const MAX_EXPIRATION = 60 * 60 * 24 * 30;

const memcachedClient = new memcached(`${process.env.ENDPOINT}:${process.env.PORT}`);

exports.testChargeRequestMemcachedDoesNotCommitIfChanged = async function (input) {
    await resetTestMemcached();
    const remainingBalanceIdentifiable = await chargeRequestMemchached.getBalanceMemcached(KEY);
    await resetTestMemcached();
    try {
        await chargeRequestMemchached.chargeMemcached(KEY, 10, remainingBalanceIdentifiable);
    } catch (e) {
        return {response: "✅ testChargeRequestMemcachedDoesNotCommitIfChanged."};
    }

    return {response: "❌ testChargeRequestMemcachedDoesNotCommitIfChanged: Expected charge call to be invalidated."};
};

async function resetTestMemcached() {
    const balance = randomInteger(100, 1000);

    var ret = new Promise((resolve, reject) => {
        memcachedClient.set(KEY, balance, MAX_EXPIRATION, (res, notError) => {
            if (notError)
                resolve(balance);
            else
                reject(res);
        });
    });
    return ret;
}

function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
