var Backbone = require('backbone')
  , when = require('when')
  , _ = require('underscore')
  , request = require('request')

var Guard = Backbone.Model.extend({
  getLimit: function() {
    return this.get('limit')
  },

  getPeriod: function() {
    return this.get('period')
  },

  cut: function() {
    return this.removeCallsWithin(this.getPeriod());
  },

  isLimited: function() {
    var self = this;
    return this.countCallsWithin(this.getPeriod()).then(function(count){
      if (count > self.getLimit()) {
        return true;
      }
      return false;
    });
  },

  call: function() {
    var self = this;

    return this.addNewCall().then(function(){
      return self.cut();
    }).then(function(){
      return self.isLimited();
    })
  },

  countCallsWithin: function(ms) {
    return when.reject('Needs implementation'); 
  },

  addNewCall: function() {
    return when.reject('Needs implementation'); 
  },

  removeCallsWithin: function(ms) {
    return when.reject('Needs implementation');
  }
});

var InMemoryGuard = Guard.extend({
  initialize: function() {
    this.calls = [];
  },

  addNewCall: function() {
    this.calls.push(new Date().getTime());
    return when(this);
  },

  countCallsWithin: function(ms) {
    var now = new Date().getTime();

    var calls = _.filter(this.calls, function(call){
      return now - call < ms;
    });

    return when(calls.length);
  },

  removeCallsWithin: function(ms) {
    var now = new Date().getTime();

    this.calls = _.reject(this.calls, function(call){
      return  call < now - ms;
    });

    return when(this.calls);
  }
});

module.exports = {
  Guard: Guard,
  InMemoryGuard: InMemoryGuard
}