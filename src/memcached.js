"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const memcached = require("memcached");
const KEY = `account1/balance`;
const DEFAULT_BALANCE = 100;
const MAX_EXPIRATION = 60 * 60 * 24 * 30;
const memcachedClient = new memcached(`${process.env.ENDPOINT}:${process.env.PORT}`);
exports.resetMemcached = async function () {
    var ret = new Promise((resolve, reject) => {
        memcachedClient.set(KEY, DEFAULT_BALANCE, MAX_EXPIRATION, (res, error) => {
            if (error)
                resolve(res);
            else
                reject(DEFAULT_BALANCE);
        });
    });
    return ret;
};
exports.chargeRequestMemcached = async function (input) {
    var remainingBalance = await getBalanceMemcached(KEY);
    const charges = getCharges();
    const isAuthorized = authorizeRequest(remainingBalance, charges);
    if (!authorizeRequest(remainingBalance, charges)) {
        return {
            remainingBalance,
            isAuthorized,
            charges: 0,
        };
    }
    remainingBalance = await chargeMemcached(KEY, charges);
    return {
        remainingBalance,
        charges,
        isAuthorized,
    };
};
function authorizeRequest(remainingBalance, charges) {
    return remainingBalance >= charges;
}
function getCharges() {
    return DEFAULT_BALANCE / 20;
}
async function getBalanceMemcached(key) {
    return new Promise((resolve, reject) => {
        memcachedClient.get(key, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(Number(data));
            }
        });
    });
}
async function chargeMemcached(key, charges) {
    return new Promise((resolve, reject) => {
        memcachedClient.decr(key, charges, (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                return resolve(Number(result));
            }
        });
    });
}
