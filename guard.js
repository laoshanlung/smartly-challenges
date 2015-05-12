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

var Calls = Backbone.Collection.extend({

});

var InMemoryGuard = Guard.extend({
  initialize: function() {
    this.calls = new Calls();
  },

  addNewCall: function() {
    this.calls.add({
      date: new Date().getTime()
    });

    return when(this);
  },

  countCallsWithin: function(ms) {
    var now = new Date().getTime();

    var calls = this.calls.filter(function(call){
      return now - call.get('date') < ms;
    });

    return when(calls.length);
  },

  removeCallsWithin: function(ms) {
    var now = new Date().getTime();

    var calls = this.calls.filter(function(call){
      return  call.get('date') < now - ms;
    });

    return when(this.calls.remove(calls));
  }
});

module.exports = {
  Guard: Guard,
  InMemoryGuard: InMemoryGuard
}