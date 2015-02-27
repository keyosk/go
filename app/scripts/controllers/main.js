'use strict';

/**
 * @ngdoc function
 * @name gonubApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the gonubApp
 */
angular.module('gonubApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
