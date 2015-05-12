var guard = require('./guard')
  , Guard = guard.Guard
  , InMemoryGuard = guard.InMemoryGuard
  , when = require('when')
  , _ = require('underscore')
  , request = require('request')
  , fs = require('fs')

var defaultGuard = new InMemoryGuard({
  limit: 600,
  period: 600*1000
});

/**
 * internal method to actually make the API call
 * @param  {Object} params [description]
 * @param {String} params.type the HTTP method
 * @param {String} params.path the path to be appended to the endpoint
 * @param {Object} [params.data] the data to be sent
 * @param {Number} [params.backoff] the last known backoff times
 * @return {Promise} a promise that will resolve to the response
 */
var makeApiCall = function(params) {
  var self = this;

  this.guard = this.guard || defaultGuard; // allows custom guard
  if (this.guard instanceof Guard) {

  } else {
    return when.reject('Wrong Guard implementation');
  }

  params = params || {};
  params = _.defaults(params, {
    data: {},
    attempts: 1
  });

  if (!params.type && !params.path) {
    return when.reject('Missing type and/or path');
  }

  params.type = params.type.toLowerCase();
  if (_.indexOf(['get', 'post', 'put', 'delete'], params.type) == -1) {
    return when.reject('Unsupported HTTP method'); 
  }

  if (params.path.charAt(0) != '/') {
    params.path = params.path + '/'
  }

  return this.guard.call().then(function(isLimited){
    if (isLimited) {
      // reached the max attempt, just reject it
      if (params.attempts > self.maxAttempts) {
        return when.reject('Limited connection');
      }

      // backoff a bit before calling again
      var attempts = params.attempts;
      params.attempts += 1
      return when(null).delay(attempts*self.backoff).then(function(){
        return makeApiCall.call(self, params);
      });
    } else {
      // actually makes the call
      var options = {};
      options['method'] = params.type;
      options['baseUrl'] = [self.endpoint, self.version].join('/');
      options['url'] = params.path;
      options['qs'] = {
        access_token: self.token
      }
      options['json'] = true;

      if (params.type == 'get') {
        options['qs'] = _.extend(options['qs'], params.data);
      } else {
        options['body'] = params.data;
      }

      return when.promise(function(resolve, reject){
        request(options, function(error, response, body){
          if (error) {
            return reject("Network error");
          }
          // success or not?
          if (response.statusCode == 200) {
            resolve(body);  
          } else {
            reject(body.error.message);
          }
          
        });
      }).catch(function(error){
        // handles error logging separately
        self.logError(error);
        throw error;
      });
    }
  });
}

module.exports = {
  endpoint: 'https://graph.facebook.com',
  version: 'v2.3',
  token: null,
  maxAttempts: 5,
  backoff: 500, // ms

  logError: function(error) {
    fs.appendFile('request_log.txt', error + '\n\r', function (err) {

    });
  },

  get: function(path, data) {
    return makeApiCall.call(this, {
      type: 'get',
      path: path,
      data: data
    });
  },

  post: function(path, data) {
    return makeApiCall.call(this, {
      type: 'post',
      path: path,
      data: data
    });
  },

  put: function(path, data) {
    return makeApiCall.call(this, {
      type: 'put',
      path: path,
      data: data
    });
  },

  delete: function(path, data) {
    return makeApiCall.call(this, {
      type: 'delete',
      path: path,
      data: data
    });
  }
}