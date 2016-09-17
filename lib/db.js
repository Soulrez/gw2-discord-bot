var
	async = require('async'),
	config = require('config'),
	redis = require('redis')
;

var db = {};

var prefix = 'gw2_discord:';

var options = { };
['host', 'port', 'path', 'password', 'db'].forEach(function(item) {
	var value = config.get('redis.'+item);
	if (value) options[item] = value;
});
if (options.path) {
	delete options.host;
	delete options.port;
}

var client = redis.createClient(options);

db.clearCache = function(cache_name, callback) {
	client.del(prefix+'cache:'+cache_name, callback);
};

db.saveCachedResponse = function(path, key, response, ttl, callback) {
	client.psetex(prefix+'response_cache:'+path+':'+key, ttl, JSON.stringify(response), callback);
};

db.getCachedResponse = function(path, key, callback) {
	client.get(prefix+'response_cache:'+path+':'+key, function(err, response) {
		if (err) return callback(err);
		if (! response) return callback();
		callback(null, JSON.parse(response));
	});
};

db.setUserKey = function(user_id, key, token, callback) {
	async.parallel([
		function(next) {
			client.hset(prefix+'user_keys', user_id, key, next);
		},
		function(next) {
			client.hset(prefix+'user_tokens', user_id, JSON.stringify(token), next);
		}
	], callback);
};

db.setUserAccount = function(user_id, account, callback) {
	if (! callback) callback = function() { };
	async.parallel([
		function(next) {
			client.hset(prefix+'user_accounts', account.name, user_id, next);
		},
		function(next) {
			client.hset(prefix+'user_ids', user_id, JSON.stringify(account), next);
		}
	], callback);
};

db.removeUser = function(user_id, callback) {
	db.getAccountByUser(user_id, function(err, account) {
		async.parallel([
			function(next) {
				if (! account) return next();
				client.hdel(prefix+'user_accounts', account.name, next);
			},
			function(next) {
				client.hdel(prefix+'user_ids', user_id, next);
			},
			function(next) {
				client.hdel(prefix+'user_tokens', user_id, next);
			},
			function(next) {
				client.hdel(prefix+'user_keys', user_id, next);
			}
		], callback);
	});
};

db.getUserToken = function(user_id, callback) {
	client.hget(prefix+'user_tokens', user_id, callback);
};

db.getUserKey = function(user_id, callback) {
	client.hget(prefix+'user_keys', user_id, callback);
};

db.getUserByAccount = function(account, callback) {
	client.hget(prefix+'user_accounts', account, callback);
};

db.getAccountByUser = function(user_id, callback) {
	client.hget(prefix+'user_ids', user_id, function(err, result) {
		if (err) return callback(err);
		callback(null, JSON.parse(result));
	});
}

db.setObject = function(name, object, callback) {
	client.set(prefix+name, JSON.stringify(object), callback);
}

db.getObject = function(name, callback) {
	client.get(prefix+name, function(err, object) {
		if (err) return callback(err);
		callback(null, JSON.parse(object));
	});
}

db.getCacheKeys = function(name, callback) {
	client.hkeys(prefix+'cache:'+name, callback);
}

db.getCache = function(cache_name, keys, callback) {
	client.hmget(prefix+'cache:'+cache_name, keys, callback);
}

db.setCache = function(cache_name, id, object, callback) {
	client.hset(prefix+'cache:'+cache_name, id, JSON.stringify(object), callback);
}

module.exports = db;