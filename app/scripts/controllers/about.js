'use strict';

/**
 * @ngdoc function
 * @name gonubApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the gonubApp
 */
angular.module('gonubApp')
  .controller('AboutCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
