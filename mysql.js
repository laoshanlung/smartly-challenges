var config = require('./config')

var mysql = require('mysql');
var pool = mysql.createPool({
  connectionLimit : 10,
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.username,
  password: config.mysql.password,
  database: config.mysql.database
});
var when = require('when');

module.exports = {
  sendQuery: function(query, data) {
    var deferred = when.defer();

    pool.query(query, data, function(error, rows, fields) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve(rows);
      }
    });

    return deferred.promise;
  }
}