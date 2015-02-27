'use strict';

/**
 * @ngdoc function
 * @name gonubApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the gonubApp
 */
angular.module('gonubApp')
  .controller('GameCtrl', function($scope, $log, $routeParams, $location) {

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
    }

    var VERSION = '0.0.2';

    var pubnubInstance = PUBNUB.init({
      'subscribe_key': 'sub-c-cbcff300-bb84-11e3-b6e0-02ee2ddab7fe',
      'publish_key': 'pub-c-01bb4e6e-4ad8-4c62-9b72-5278a11cf9e5'
    });

    var pubnubUUID = PUBNUB.get_uuid();

    var pubnubDataChannel = 'go-game-' + VERSION + '-' + lobbyName + '-' + boardSize;

    var GO = CREATE_GO({
      'containerEle': document.getElementById('game'),
      'lobbyName': lobbyName,
      'boardSize': boardSize,
      'pubnubUUID': pubnubUUID,
      'dataChangedCallback': function() {
        $scope.boardStruct = GO['boardStruct'];
        $scope.playedPositions = GO['playedPositions'];
        $scope.currentPlayer = GO['currentPlayer'];
        $scope.currentPlayerColor = GO['getColorClass'](GO['currentPlayer']);
        $scope.lastPosition = GO['lastPosition'];
        $scope.whiteTurf = GO['whiteTurf'];
        $scope.blackTurf = GO['blackTurf'];
        $scope.whiteTurfCount = Object.keys(GO['whiteTurf']).length;
        $scope.blackTurfCount = Object.keys(GO['blackTurf']).length;
        $scope.whitePrisoners = GO['whitePrisoners'];
        $scope.blackPrisoners = GO['blackPrisoners'];
        $scope.turfIsVisible = GO['turfIsVisible'];
      },
      'clickCallback': function(x, y, forPlayer) {
        pubnubInstance.publish({
          'channel': pubnubDataChannel,
          'message': {
            'type': 'move',
            'forPlayer': forPlayer,
            'x': x,
            'y': y,
            'pubnubUUID': pubnubUUID,
            'time': (new Date().getTime())
          }
        });
      },
      'passCallback': function() {
        if (GO.movers[GO.currentPlayer] && GO.movers[GO.currentPlayer] !== pubnubUUID) {
          alert('You are not allowed to pass for another player.');
          return;
        }

        if (confirm('Are you sure you want to Pass?')) {
          pubnubInstance.publish({
            'channel': pubnubDataChannel,
            'message': {
              'type': 'pass',
              'forPlayer': GO.currentPlayer,
              'pubnubUUID': pubnubUUID,
              'time': (new Date().getTime())
            }
          });
        }
      },
      'undoCallback': function() {
        var currentPlayerIsYou = (GO.movers[GO.currentPlayer] && GO.movers[GO.currentPlayer] === pubnubUUID);
        var oppositePlayerIsYou = (GO.movers[GO.getOppositePlayer(GO.currentPlayer)] && GO.movers[GO.getOppositePlayer(GO.currentPlayer)] === pubnubUUID);

        if (currentPlayerIsYou === true && oppositePlayerIsYou === false) {
          alert('You are only allowed to undo your own move.');
          return;
        }

        if (confirm('Are you sure you want to Undo?')) {
          pubnubInstance.publish({
            'channel': pubnubDataChannel,
            'message': {
              'type': 'undo',
              'forPlayer': GO.getOppositePlayer(GO.currentPlayer),
              'pubnubUUID': pubnubUUID,
              'time': (new Date().getTime())
            }
          });
        }
      }
    });

    window.GO = GO;

    var get_all_history = function(args) {
      var channel = args['channel'],
        callback = args['callback'],
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
              history.push(m)
            });
            if (msgs.length < count) return callback(history.reverse());
            count = 100;
            add_messages();
          }
        };

      add_messages();

      function add_messages() {
        pubnubInstance.history(params)
      }
    };

    $scope.moveTo = function(x, y) {
      var forPlayer = GO['currentPlayer'];

      if (GO['movers'][forPlayer] && GO['movers'][forPlayer] !== GO['pubnubUUID']) {
        alert('That piece belongs to someone else.');
        return;
      }

      var result = GO['moveStoneToXY'](GO['currentPlayer'], x, y);
      if (result) {
        GO['cachePlayedPosition']({
          'type': 'move',
          'forPlayer': forPlayer,
          'x': x,
          'y': y
        });
        if ('function' === typeof GO['clickCallback']) {
          GO['clickCallback'](x, y, GO['getOppositePlayer'](GO['currentPlayer']));
        }
      }
    };

    $scope.boardStruct = GO['boardStruct'];

    get_all_history({
      'channel': pubnubDataChannel,
      'callback': function(messages) {

        if (messages.length) {

          messages = GO.rollBackHistoryUsingUndo(messages);

          if (historyPlayBackSpeed === 0) {

            for (var idx in messages) {
              GO.processPubNubPayload(messages[idx], true);
            }

            $scope.$apply(function() {

              GO.dataChangedCallback();

            });

          } else {

            var handleMessagesRecursively = function() {
              if (messages.length === 0) {
                return;
              }
              var message = messages.shift();
              GO.processPubNubPayload(message, true);

              $scope.$apply(function() {

                GO.dataChangedCallback();

              });

              setTimeout(handleMessagesRecursively, historyPlayBackSpeed);
            };

            handleMessagesRecursively();

          }

        }

      },
      'error': function() {}
    });

    pubnubInstance.subscribe({
      'channel': pubnubDataChannel,
      'callback': function(m) {
        GO.processPubNubPayload(m, false);
        $scope.$apply(function() {

          GO.dataChangedCallback();

        });
      }
    });

    $scope.$on("$destroy", function() {
      pubnubInstance.unsubscribe({
        'channel': pubnubDataChannel
      })
    });

    $scope.toggleTurfCount = function() {

      GO['toggleTurfCount']();

    };

  });