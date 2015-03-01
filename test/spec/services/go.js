'use strict';

describe('Service: Go', function () {

  // load the service's module
  beforeEach(module('gonubApp'));

  // instantiate service
  var Go;
  beforeEach(inject(function (_Go_) {
    Go = _Go_;
  }));

  it('should do something', function () {
    expect(!!Go).toBe(true);
  });

});
