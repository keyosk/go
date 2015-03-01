'use strict';

describe('Controller: NavigationCtrl', function() {

  // load the controller's module
  beforeEach(module('gonubApp'));

  var NavigationCtrl,
    scope,
    location;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($controller, $rootScope, $location) {
    location = $location;
    scope = $rootScope.$new();
    NavigationCtrl = $controller('NavigationCtrl', {
      $scope: scope
    });
  }));

  it('should attach a method isCurrentPath to the scope', function() {
    expect(scope.isCurrentPath).toBeDefined();
  });

  it('verify method isCurrentPath behaves as intended', function() {
    location.path('/');
    expect(location.path()).toBe('/');
    expect(scope.isCurrentPath('/')).toBe(true);
    expect(scope.isCurrentPath('/game')).toBe(false);


    location.path('/game');
    expect(location.path()).toBe('/game');
    expect(scope.isCurrentPath('/')).toBe(false);
    expect(scope.isCurrentPath('/game')).toBe(true);

    location.path('/game/f2tc8/9');
    expect(location.path()).toBe('/game/f2tc8/9');
    expect(scope.isCurrentPath('/')).toBe(false);
    expect(scope.isCurrentPath('/game')).toBe(true);
  });


});