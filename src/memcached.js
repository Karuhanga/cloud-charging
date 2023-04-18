"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const memcached = require("memcached");

const KEY = `account1/balance`;
const DEFAULT_BALANCE = 100;
const MAX_EXPIRATION = 60 * 60 * 24 * 30;

const memcachedClient = new memcached(`${process.env.ENDPOINT}:${process.env.PORT}`);

exports.resetMemcached = async function () {
    var ret = new Promise((resolve, reject) => {
        memcachedClient.set(KEY, DEFAULT_BALANCE, MAX_EXPIRATION, (res, notError) => {
            if (notError)
                resolve(DEFAULT_BALANCE);
            else
                reject(res);
        });
    });
    return ret;
};

exports.chargeRequestMemcached = async function (input) {
    const remainingBalanceIdentifiable = await getBalanceMemcached(KEY);
    let remainingBalance = Number(remainingBalanceIdentifiable[KEY]);
    const charges = getCharges();
    const isAuthorized = authorizeRequest(remainingBalance, charges);
    if (!isAuthorized) {
        return {
            remainingBalance,
            isAuthorized,
            charges: 0,
        };
    }
    remainingBalance = await chargeMemcached(KEY, charges, remainingBalanceIdentifiable);
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

function getBalanceMemcached(key) {
    return new Promise((resolve, reject) => {
        memcachedClient.gets(key, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

function chargeMemcached(key, charges, remainingBalanceIdentifiable) {
    let remainingBalance = Number(remainingBalanceIdentifiable[KEY]);
    const newBalance = remainingBalance - charges;

    return new Promise((resolve, reject) => {
        memcachedClient.cas(key, newBalance, remainingBalanceIdentifiable.cas, MAX_EXPIRATION, (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                return resolve(newBalance);
            }
        });
    });
}
