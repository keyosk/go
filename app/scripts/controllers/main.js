'use strict';

/**
 * @ngdoc function
 * @name gonubApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the gonubApp
 */
angular.module('gonubApp')
  .controller('MainCtrl', function($scope, $timeout) {

    var VERSION = '0.0.2';

    var pubnubInstance = PUBNUB.init({
      'subscribe_key': 'sub-c-cbcff300-bb84-11e3-b6e0-02ee2ddab7fe',
      'publish_key': 'pub-c-01bb4e6e-4ad8-4c62-9b72-5278a11cf9e5'
    });

    var pubnubDataChannelPrefix = 'go-game-' + VERSION + '-';

    var getGamesListTimeout = null;

    $scope.activeChannels = false;

    $scope.getLobbyNameFromChannel = function(channel) {
      return channel.substr(pubnubDataChannelPrefix.length).split('-')[0];
    };

    $scope.getLobbySizeFromChannel = function(channel) {
      return channel.substr(pubnubDataChannelPrefix.length).split('-')[1];
    };

    var getGamesList = function() {
      pubnubInstance.here_now({
        'callback': function(result) {
          $scope.$apply(function() {
            $scope.activeChannels = _.filter(result.channels, function(item, channel) {
              item.channel = channel;
              return channel.indexOf(pubnubDataChannelPrefix) === 0;
            });
            getGamesListTimeout = $timeout(getGamesList, 5000);
          });
        }
      });
      return true;
    };

    getGamesList();

    $scope.$on('$destroy', function() {
      if (getGamesListTimeout !== null) {
        $timeout.cancel(getGamesListTimeout);
        getGamesListTimeout = null;
      }
    });

  });