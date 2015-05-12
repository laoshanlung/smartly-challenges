var InMemoryGuard = require('./guard').InMemoryGuard
  , when = require('when')
  , should = require('should')
  , graph = require('./fb_graph')

describe('InMemoryGuard', function(){

  before(function(){
    this.guard = new InMemoryGuard({
      limit: 3,
      period: 1000
    });
  });

  it('controls the limit within 1s', function(done){
    var guard = this.guard;

    guard.call().delay(100)
    .then(guard.call.bind(guard)).delay(200)
    .then(guard.call.bind(guard)).delay(300)
    .delay(300)
    .then(guard.call.bind(guard))
    .then(function(result){
      guard.calls.size().should.be.equal(4)
      result.should.be.true;
    }).done(done, done);

  });

  it('sets the limit after 1s', function(done){
    var guard = this.guard;

    guard.call().delay(100)
    .then(guard.call.bind(guard)).delay(200)
    .then(guard.call.bind(guard)).delay(300)
    .delay(400)
    .then(guard.call.bind(guard))
    .then(function(result){
      guard.calls.size().should.be.equal(3)
      result.should.be.false;
    }).done(done, done);

  });

  it('resets the limit after 1s', function(done){
    var guard = this.guard;

    guard.call()
    .then(guard.call.bind(guard))
    .then(guard.call.bind(guard))
    .delay(1000)
    .then(guard.call.bind(guard))
    .then(guard.call.bind(guard))
    .then(guard.call.bind(guard))
    .then(function(result){
      guard.calls.size().should.be.equal(3)
      result.should.be.false;
    }).done(done, done);

  });

});

describe('FBGraph', function(){

  beforeEach(function(){
    graph.token = 'CAACEdEose0cBAFeeRzeZCNGwFqnnlevm0aTFYRhqZAEHeljTQYZCjJufskvMRWSaaR75xluy8yflOyK94V0KAmZAQjHa4WCxwUSxLH5bI3MAS9unqCgOnZC2FfBPKZC1Sguc6ZAp4iJgxfdwqLZBH2whcO9bNwRZBN2HAml3uBysrV7soxxZCbelxxilmnN6ijS8Cuth0UVW8syZAQbkLJjUZAhMmZBiZBOeLFBf8ZD';

    graph.maxAttempts = 5;

    graph.guard = new InMemoryGuard({
      limit: 3,
      period: 1000
    });
  });

  it('retrieves the data for the current user', function(done){
    graph.get('/me').then(function(result){
      should(result).be.ok;
    }).done(done, done);
  });

  it('returns error message', function(done){
    graph.get('/mee').then(function(){
      should.fail('Something went wrong')
    }, function(error){
      error.should.be.equal('(#803) Some of the aliases you requested do not exist: mee');
    }).done(done, done);
  });

  it('waits until there is available slot', function(done){
    when.all([
      graph.get('/me'),
      graph.get('/me'),
      graph.get('/me')
    ]).then(function(){
      return graph.get('/me')
    }).then(function(result){
      should(result).be.ok;
    }).done(done, done);
  });

  it('triggers timeout', function(done){
    graph.maxAttempts = 1;
    
    when.all([
      graph.get('/me'),
      graph.get('/me'),
      graph.get('/me')
    ]).then(function(){
      return graph.get('/me')
    }).then(function(result){
      should.fail('Must have limited connection here')
    }, function(error){
      error.should.be.equal('Limited connection');
    }).done(done, done);
  });
});