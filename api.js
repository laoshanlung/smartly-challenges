// increase the thread pool so that we have more worker threads for IO operations
process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var http = require('http')
  , url = require('url')
  , mysql = require('./mysql')
  , when = require('when')
  , parallel = require('when/parallel')
  , _ = require('underscore')
  , squel = require('squel')

/**
CREATE TABLE IF NOT EXISTS ad_statistics (ad_id INTEGER, date DATE, impressions BIGINT, clicks BIGINT, spent BIGINT);
CREATE TABLE IF NOT EXISTS ad_actions (ad_id INTEGER, date DATE, action VARCHAR(256), count BIGINT, value BIGINT);
 */

var buildQuery = function(select, params) {
  if (params.ad_ids && params.ad_ids.length > 0) {
    select.where('ad_id in ?', params.ad_ids);
  }

  if (params.start_time) {
    select.where('date >= ?', params.start_time);
  }

  if (params.end_time) {
    select.where('date <= ?', params.end_time);
  }

  select.order('date', false);

  return select;
}

var services = {
  getAdActions: function(params) {
    var select = squel.select().from('ad_actions')
    select.field('ad_id')
          .field('action')
          .field('sum(count)', 'count')
          .field('sum(value)', 'value')
          .group('action')

    select = buildQuery(select, params);
    
    select = select.toParam();

    return mysql.sendQuery(select.text, select.values);
  },
  getAdStatistics: function(params) {
    var select = squel.select().from('ad_statistics')
    select.field('ad_id')
          .field('sum(impressions)', 'impressions')
          .field('sum(clicks)', 'clicks')
          .field('sum(spent)', 'spent')
          .group('ad_id')

    select = buildQuery(select, params);
    
    select = select.toParam();

    return mysql.sendQuery(select.text, select.values);
  },
  getStats: function(params) {
    var self = this;

    return parallel([
      function(){ return self.getAdActions(params) },
      function(){ return self.getAdStatistics(params) }
    ]).then(function(results){
      var actions = results[0]
        , statistics = results[1]
        , output = {};

      _.each(statistics, function(statistic){
        var out = _.pick(statistic, 'impressions', 'clicks', 'spent');
        out.ctr = out.clicks/out.impressions;
        out.cpc = out.spent/out.clicks;
        out.cpm = out.spent/(out.impressions/1000);
        out.actions = {};

        var partitions = _.partition(actions, function(action){
          return statistic.ad_id == action.ad_id;
        });
        actions = partitions[1];
        _.each(partitions[0], function(action){
          var temp = _.pick(action, 'count', 'value');
          temp.cpa = temp.value/temp.count; // not sure about this???
          out.actions[action.action] = temp;
        });

        output[statistic.ad_id] = out;
      });

      return output;
    });
  }
}

// GET /api/stats?ad_ids=1,2,3&start_time=2013-09-01&end_time=2013-10-01

function handleRequest(request, response){
    var urlObj = url.parse(request.url, true);
    if (urlObj.pathname == '/api/stats') {
      response.setHeader('Content-Type', 'application/json');
      var query = _.clone(urlObj.query);
      query.ad_ids = query.ad_ids || '';
      query.ad_ids = query.ad_ids.split(',');

      services.getStats(query).done(function(data){
        response.end(JSON.stringify(data));
      }, function(error){
        response.statusCode = 500;
        response.end(JSON.stringify({
          'error': error
        }));
      });
    } else {
      response.end('Opps! I am just a demo');
    }
}

var server = http.createServer(handleRequest);

var port = process.env.PORT || 3000;

server.listen(port, function(){
    console.log("Server listening on: http://localhost:%s", port);
});