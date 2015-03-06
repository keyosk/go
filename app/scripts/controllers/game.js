'use strict';

/**
 * @ngdoc function
 * @name gonubApp.controller:GameCtrl
 * @description
 * # GameCtrl
 * Controller of the gonubApp
 */
angular.module('gonubApp')
  .controller('GameCtrl', function($scope, $log, $routeParams, $location, Go) {

    var randomString = function(len) {
      var text = '';
      var charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
      for (var i = 0; i < len; i++) {
        text += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return text;
    };

    var lobbyName = randomString(5);

    var boardSize = 9;

    var historyPlayBackSpeed = ('historyPlayBackSpeed' in $routeParams) ? $routeParams.historyPlayBackSpeed : 0;

    var needToRedirect = false;

    if ('lobbyName' in $routeParams && $routeParams.lobbyName.trim().length > 0) {
      lobbyName = $routeParams.lobbyName;
    } else {
      needToRedirect = true;
    }

    if ('boardSize' in $routeParams && $routeParams.boardSize >= 3 && $routeParams.boardSize <= 19) {
      boardSize = $routeParams.boardSize;
    } else {
      needToRedirect = true;
    }

    if (needToRedirect) {
      $location.path('/game/' + lobbyName + '/' + boardSize);
      return;
    }

    var VERSION = '0.0.2';

    var pubnubInstance = PUBNUB.init({
      'subscribe_key': 'sub-c-cbcff300-bb84-11e3-b6e0-02ee2ddab7fe',
      'publish_key': 'pub-c-01bb4e6e-4ad8-4c62-9b72-5278a11cf9e5'
    });

    var pubnubUUID = pubnubInstance.get_uuid();

    var pubnubDataChannel = 'go-game-' + VERSION + '-' + lobbyName + '-' + boardSize;

    Go.init({
      'lobbyName': lobbyName,
      'boardSize': boardSize,
      'pubnubUUID': pubnubUUID
    });

    $scope.Go = Go;

    $scope.getColumnIDFromY = function(y) {
      var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      return alphabet[y];
    };

    $scope.getColumnIDFromX = function(x) {
      return boardSize - x;
    };

    $scope.getFormattedCoord = function(x, y) {
      return $scope.getColumnIDFromY(y) + $scope.getColumnIDFromX(x);
    };

    $scope.moveTo = function(x, y) {
      var forPlayer = Go.currentPlayer;

      if (Go.movers[forPlayer] && Go.movers[forPlayer] !== Go.pubnubUUID) {
        window.alert('That piece belongs to someone else.');
        return;
      }

      var result = Go.moveStoneToXY(Go.currentPlayer, x, y);

      if (result) {
        Go.cachePlayedPosition({
          'type': 'move',
          'forPlayer': forPlayer,
          'x': x,
          'y': y
        });
        pubnubInstance.publish({
          'channel': pubnubDataChannel,
          'message': {
            'type': 'move',
            'forPlayer': Go.getOppositePlayer(Go.currentPlayer),
            'x': x,
            'y': y,
            'pubnubUUID': pubnubUUID,
            'time': (new Date().getTime())
          }
        });
      }
    };



    $scope.pass = function() {
      if (Go.movers[Go.currentPlayer] && Go.movers[Go.currentPlayer] !== pubnubUUID) {
        window.alert('You are not allowed to pass for another player.');
        return;
      }

      if (window.confirm('Are you sure you want to Pass?')) {
        pubnubInstance.publish({
          'channel': pubnubDataChannel,
          'message': {
            'type': 'pass',
            'forPlayer': Go.currentPlayer,
            'pubnubUUID': pubnubUUID,
            'time': (new Date().getTime())
          }
        });
      }
    };

    $scope.undo = function() {
      var currentPlayerIsYou = (Go.movers[Go.currentPlayer] && Go.movers[Go.currentPlayer] === pubnubUUID);
      var oppositePlayerIsYou = (Go.movers[Go.getOppositePlayer(Go.currentPlayer)] && Go.movers[Go.getOppositePlayer(Go.currentPlayer)] === pubnubUUID);

      if (currentPlayerIsYou === true && oppositePlayerIsYou === false) {
        window.alert('You are only allowed to undo your own move.');
        return;
      }

      if (window.confirm('Are you sure you want to Undo?')) {
        pubnubInstance.publish({
          'channel': pubnubDataChannel,
          'message': {
            'type': 'undo',
            'forPlayer': Go.getOppositePlayer(Go.currentPlayer),
            'pubnubUUID': pubnubUUID,
            'time': (new Date().getTime())
          }
        });
      }
    };

    var getAllHistory = function(args) {

      var channel = args.channel,
        callback = args.callback,
        start = 0,
        count = 100,
        history = [],
        params = {
          channel: channel,
          count: count,
          reverse: false,
          callback: function(messages) {
            var msgs = messages[0];
            start = messages[1];
            params.start = start;
            PUBNUB.each(msgs.reverse(), function(m) {
              history.push(m);
            });
            if (msgs.length < count) {
              return callback(history.reverse());
            }
            count = 100;
            addMessages();
          }
        };

      var addMessages = function() {
        pubnubInstance.history(params);
      };

      addMessages();

    };

    var handleMessagesRecursively = function(messages) {
      if (messages.length === 0) {
        return;
      }
      var message = messages.shift();

      try {
        $scope.$apply(function() {
          Go.processPubNubPayload(message, true);
        });
      } catch (e) {
        Go.processPubNubPayload(message, true);
      }

      setTimeout(function() {
        handleMessagesRecursively(messages);
      }, historyPlayBackSpeed);
    };

    getAllHistory({
      'channel': pubnubDataChannel,
      'callback': function(messages) {

        if (messages.length) {

          messages = Go.rollBackHistoryUsingUndo(messages);

          if (historyPlayBackSpeed === 0) {

            try {
              $scope.$apply(function() {
                for (var idx in messages) {
                  Go.processPubNubPayload(messages[idx], true);
                }
              });
            } catch (e) {
              for (var idx in messages) {
                Go.processPubNubPayload(messages[idx], true);
              }
            }

          } else {

            handleMessagesRecursively(messages);

          }

        }

      }
    });

    pubnubInstance.subscribe({
      'channel': pubnubDataChannel,
      'callback': function(m) {
        try {
          $scope.$apply(function() {
            Go.processPubNubPayload(m, false);
          });
        } catch (e) {
          Go.processPubNubPayload(m, false);
        }
      }
    });

    $scope.$on('$destroy', function() {
      pubnubInstance.unsubscribe({
        'channel': pubnubDataChannel
      });
    });

  });