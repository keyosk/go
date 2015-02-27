'use strict';

/**
 * @ngdoc overview
 * @name gonubApp
 * @description
 * # gonubApp
 *
 * Main module of the application.
 */
angular
  .module('gonubApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/game/:lobbyName/:boardSize', {
        templateUrl: 'views/game.html',
        controller: 'GameCtrl'
      })
      .when('/game/:lobbyName', {
        templateUrl: 'views/game.html',
        controller: 'GameCtrl'
      })
      .when('/game', {
        templateUrl: 'views/game.html',
        controller: 'GameCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
