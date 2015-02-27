'use strict';

/**
 * @ngdoc function
 * @name gonubApp.controller:NavigationCtrl
 * @description
 * # NavigationCtrl
 * Controller of the gonubApp
 */
angular.module('gonubApp')
  .controller('NavigationCtrl', function($scope, $location) {
    $scope.isCurrentPath = function(path) {
      if (path === '/') {
        return ($location.path() === path);
      }
      return ($location.path().indexOf(path) === 0);
    };
  });