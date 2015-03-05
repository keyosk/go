'use strict';

/**
 * @ngdoc function
 * @name gonubApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the gonubApp
 */
angular.module('gonubApp')
  .controller('MainCtrl', function($scope) {

    var VERSION = '0.0.2';

    var pubnubInstance = PUBNUB.init({
      'subscribe_key': 'sub-c-cbcff300-bb84-11e3-b6e0-02ee2ddab7fe',
      'publish_key': 'pub-c-01bb4e6e-4ad8-4c62-9b72-5278a11cf9e5'
    });

    var pubnubUUID = pubnubInstance.get_uuid();

    var pubnubDataChannelPrefix = 'go-game-' + VERSION + '-';

    $scope.activeChannels = [];

    pubnubInstance.here_now({
      'callback': function(result) {
        $scope.$apply(function() {
          $scope.activeChannels = _.filter(result.channels, function(item, channel) {
            item.channel = channel;
            return channel.indexOf(pubnubDataChannelPrefix) === 0;
          });
        });
      }
    });

    $scope.getLobbyNameFromChannel = function(channel) {
      return channel.substr(pubnubDataChannelPrefix.length).split('-')[0];
    };

    $scope.getLobbySizeFromChannel = function(channel) {
      return channel.substr(pubnubDataChannelPrefix.length).split('-')[1];
    };

  });