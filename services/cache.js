const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');

const redisUrl = 'redis://127.0.0.1:6379';

const client = redis.createClient(redisUrl);

client.hget = util.promisify(client.hget);

const debug = require('debug')('services:cache');

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');

  return this;
}

mongoose.Query.prototype.exec = async function() {
  if (!this.useCache) {
    debug('Not serving from cache');
    return exec.apply(this, arguments);
  }

  debug('Can serve from cache');

  const key = JSON.stringify(Object.assign({}, this.getQuery(), {
    collection: this.mongooseCollection.name
  }));

  // see if we have a value for key
  const cacheValue = await client.hget(this.hashKey, key);

  // if we do return it
  if (cacheValue) {
    const doc = JSON.parse(cacheValue);

    return Array.isArray(doc) 
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }

  // otherwise issue query and store
  const result = await exec.apply(this, arguments);

  client.hset(this.hashKey, key, JSON.stringify(result));

  return result;
};

module.exports = {
  clearHash(hashKey) {
    debug('Busting the cache');
    client.del(JSON.stringify(hashKey));
  }
};