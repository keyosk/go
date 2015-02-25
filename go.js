   (function() {

     var randomString = function(len) {
       var text = '';
       var charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
       for (var i = 0; i < len; i++) {
         text += charset.charAt(Math.floor(Math.random() * charset.length));
       }
       return text;
     };

     var CREATE_GO = function(setup) {

       var SELF = function(setup) {
         return CREATE_GO(setup);
       };

       var findLibertyRecurseSafety = 0;

       SELF['containerEle'] = setup['containerEle'];
       SELF['lastPositionEle'] = setup['lastPositionEle'];
       SELF['currentPlayerEle'] = setup['currentPlayerEle'];

       SELF['capturedWhitePiecesEle'] = setup['capturedWhitePiecesEle'];
       SELF['capturedBlackPiecesEle'] = setup['capturedBlackPiecesEle'];

       SELF['playedPositionsEle'] = setup['playedPositionsEle'];
       SELF['templatePlayedPositionsEle'] = setup['templatePlayedPositionsEle'];
       SELF['templatePlayedPositions'] = null;

       SELF['lobbyName'] = setup['lobbyName'];
       SELF['boardSize'] = setup['boardSize'];

       SELF['clickCallback'] = setup['clickCallback'];

       SELF['playedPositions'] = [];

       SELF['getOppositePlayer'] = function(forPlayer) {
         return (forPlayer === 0) ? 1 : 0
       };

       SELF['createEmptyBoardStruct'] = function() {

         var emptyBoard = [];

         for (var x = 0; x < SELF['boardSize']; x++) {
           emptyBoard.push([]);
           for (var y = 0; y < SELF['boardSize']; y++) {
             emptyBoard[x].push(null);
           }
         }

         return emptyBoard;

       };

       SELF['drawBoardFromStruct'] = function() {

         if (SELF['containerEle'].children.length === 0) {

           var tableEle = document.createElement('table');

           for (var x in SELF['boardStruct']) {

             var tableRow = document.createElement('tr');
             for (var y in SELF['boardStruct'][x]) {
               var tableCell = document.createElement('td');
               var coord_text = (parseInt(x) + 1) + ',' + (parseInt(y) + 1);
               tableCell.className = SELF['getColorClass'](SELF['boardStruct'][x][y]);
               tableCell.innerHTML = '<div title=' + coord_text + '><span>' + coord_text + '</span></div>';
               tableRow.appendChild(tableCell);
               SELF['elementsCache'][x][y] = tableCell;
             }

             tableEle.appendChild(tableRow);

           }

           SELF['containerEle'].appendChild(tableEle);

           _.each(SELF['elementsCache'], function(row, x) {
             _.each(row, function(ele, y) {
               PUBNUB.bind('click', ele.children[0], function() {
                 x = parseInt(x);
                 y = parseInt(y);
                 var result = SELF['moveStoneToXY'](SELF['currentPlayer'], x, y);
                 if (result && 'function' === typeof SELF['clickCallback']) {
                   SELF['clickCallback'](x, y, SELF['getOppositePlayer'](SELF['currentPlayer']));
                 }
               });
             });
           });

         } else {

           for (var x in SELF['boardStruct']) {

             for (var y in SELF['boardStruct'][x]) {

               SELF['elementsCache'][x][y].className = SELF['getColorClass'](SELF['boardStruct'][x][y]);

               SELF['capturedWhitePiecesEle'].innerHTML = SELF['whitePrisoners'];
               SELF['capturedBlackPiecesEle'].innerHTML = SELF['blackPrisoners'];

               SELF['lastPositionEle'].innerHTML = SELF['lastPosition'];
             }
           }
         }

         SELF['playedPositionsEle'].innerHTML = SELF['templatePlayedPositions']({playedPositions: SELF['playedPositions']});
       };

       SELF['getPositionValid'] = function(forPlayer, x, y) {

         if (SELF['boardStruct'][x][y] !== null) {
           return false;
         }

         var adjacentPositions = SELF['adjacentPositionFinder'](x, y);

         findLibertyRecurseSafety = 0;

         var adjacentPositionsData = SELF['findDataForAdjacentPositions'](
           forPlayer, [
             [x, y]
           ],
           adjacentPositions
         );

         SELF['boardStruct'][x][y] = forPlayer;

         var prisonersTaken = SELF['tryToTakePrisoners'](forPlayer, x, y);

         if (Object.keys(adjacentPositionsData.liberties) === 0 && prisonersTaken === false) {
           SELF['boardStruct'][x][y] = null;
           return false;
         }

         return true;
       };

       SELF['adjacentPositionFinder'] = function(x, y) {

         var findUp = (x == 0) ? false : true;
         var findRight = (y == SELF['boardSize'] - 1) ? false : true;
         var findDown = (x == SELF['boardSize'] - 1) ? false : true;
         var findLeft = (y == 0) ? false : true;

         var positions = [];

         if (findDown) {
           var positionDown = SELF['boardStruct'][x + 1][y];
           positions.push([x + 1, y]);
         }

         if (findUp) {
           var positionUp = SELF['boardStruct'][x - 1][y];
           positions.push([x - 1, y]);
         }

         if (findRight) {
           var positionRight = SELF['boardStruct'][x][y + 1];
           positions.push([x, y + 1]);
         }

         if (findLeft) {
           var positionLeft = SELF['boardStruct'][x][y - 1];
           positions.push([x, y - 1]);
         }

         return positions;

       };

       SELF['findDataForAdjacentPositions'] = function(forPlayer, examinedPositions, adjacentPositions) {

         findLibertyRecurseSafety++

         if (findLibertyRecurseSafety > 200) {

           return {};
         }

         var _results = {
           'liberties': {},
           'group': {}
         };

         for (var idx in adjacentPositions) {
           var x = adjacentPositions[idx][0];
           var y = adjacentPositions[idx][1];

           var positionOwner = SELF['boardStruct'][x][y];

           if (positionOwner === null) {
             _results['liberties'][x + ',' + y] = 1;
             continue;
           }

           /*protection attempt for recursive loopback behavior*/

           var shouldContinue = false;
           for (var _idx in examinedPositions) {
             var _x = examinedPositions[_idx][0];
             var _y = examinedPositions[_idx][1];
             if (x === _x && y === _y) {
               shouldContinue = true;
               continue;
             }
           }
           if (shouldContinue) {
             continue;
           }

           /*protection attempt for recursive loopback behavior*/

           if (positionOwner === forPlayer) {

             var moreAdjacentPositions = SELF['adjacentPositionFinder'](x, y);

             moreAdjacentPositions = _.filter(moreAdjacentPositions, function(item) {
               var _x = item[0];
               var _y = item[1];

               var shouldReturnPosition = true;

               for (var _idx in examinedPositions) {
                 var __x = examinedPositions[_idx][0];
                 var __y = examinedPositions[_idx][1];
                 if (__x == _x && __y == _y) {
                   shouldReturnPosition = false;

                   break;
                 }
               }

               return shouldReturnPosition;
             });

             examinedPositions.push([x, y]);

             var adjacentPositionsData = SELF['findDataForAdjacentPositions'](forPlayer, examinedPositions, moreAdjacentPositions);

             for (var _idx in adjacentPositionsData.liberties) {
               _results['liberties'][_idx] = 1;
             }
           }
         }

         _results['group'] = examinedPositions;

         return _results;

       };

       SELF['tryToTakePrisoners'] = function(forPlayer, x, y) {

         var adjacentPositions = SELF['adjacentPositionFinder'](x, y);

         var opponentPlayer = SELF['getOppositePlayer'](forPlayer);

         adjacentPositions = _.filter(adjacentPositions, function(item) {
           var _x = item[0];
           var _y = item[1];
           return SELF['boardStruct'][_x][_y] === opponentPlayer;
         });

         var prisonersTaken = false;

         var prisonersList = {};

         for (var idx in adjacentPositions) {
           var _x = adjacentPositions[idx][0];
           var _y = adjacentPositions[idx][1];
           findLibertyRecurseSafety = 0;
           var adjacentPositionsData = SELF['findDataForAdjacentPositions'](
             opponentPlayer, [
               [x, y],
               [_x, _y]
             ],
             SELF['adjacentPositionFinder'](_x, _y)
           );

           if (Object.keys(adjacentPositionsData.liberties).length === 0) {

             SELF['boardStruct'][_x][_y] = null;

             prisonersList[_x + ',' + _y] = 1;

             prisonersTaken = true;

             for (var _idx in adjacentPositionsData.group) {
               var __x = adjacentPositionsData.group[_idx][0];
               var __y = adjacentPositionsData.group[_idx][1];
               if (SELF['boardStruct'][__x][__y] === opponentPlayer) {
                 SELF['boardStruct'][__x][__y] = null;
                 prisonersList[__x + ',' + __y] = 1;
               }
             }
           }
         }

         if (opponentPlayer === 0) {
           SELF['blackPrisoners'] = parseInt(SELF['blackPrisoners']) + Object.keys(prisonersList).length;
         } else {
           SELF['whitePrisoners'] = parseInt(SELF['whitePrisoners']) + Object.keys(prisonersList).length;
         }

         return prisonersTaken;

       };


       SELF['moveStoneToXY'] = function(forPlayer, x, y) {

         if (forPlayer !== SELF['currentPlayer']) {
           // don't allow a click out of turn
           return false;
         }

         var positionValid = SELF['getPositionValid'](forPlayer, x, y);

         if (positionValid === false) {
           return false;
         }

         SELF['lastPosition'] = SELF['getColorClass'](forPlayer) + ' @ ' + (parseInt(x) + 1) + ',' + (parseInt(y) + 1);

         SELF['cachePlayedPosition'](forPlayer, 'move', x, y);

         SELF['switchCurrentPlayer']();

         SELF['drawBoardFromStruct']();

         return true;
       };


       SELF['changeCurrentPlayerText'] = function() {
         SELF['currentPlayerEle'].innerHTML = SELF['getColorClass'](SELF['currentPlayer']);
       };

       SELF['switchCurrentPlayer'] = function() {
         SELF['currentPlayer'] = SELF['getOppositePlayer'](SELF['currentPlayer']);
         SELF['changeCurrentPlayerText']();
       };

       SELF['pass'] = function(forPlayer) {
        SELF['cachePlayedPosition'](forPlayer,'pass');
        SELF['switchCurrentPlayer']();
        SELF['playedPositionsEle'].innerHTML = SELF['templatePlayedPositions']({playedPositions: SELF['playedPositions']});
       };

       SELF['getColorClass'] = function(colorState) {
         var color = '';
         if (colorState === 0) {
           color = 'Black';
         } else if (colorState === 1) {
           color = 'White';
         }
         return color;
       };

       SELF['cachePlayedPosition'] = function(forPlayer, type, x, y) {
        var positionCache = {
          'type': type,
          'forPlayer': forPlayer,
          'time': (new Date().getTime())
        };
        if (type === 'move') {
          positionCache.x = x;
          positionCache.y = x;
        }
         SELF['playedPositions'].push(positionCache);
       };

       SELF['init'] = function() {

         SELF['elementsCache'] = SELF['elementsCache'] || SELF['createEmptyBoardStruct']();
         SELF['boardStruct'] = SELF['createEmptyBoardStruct']();

         SELF['blackPrisoners'] = 0;
         SELF['whitePrisoners'] = 0;
         SELF['currentPlayer'] = 0;
         SELF['lastPosition'] = '';

         SELF['playedPositions'] = [];

         if (SELF['templatePlayedPositions'] === null) {

           SELF['templatePlayedPositions'] = _.template(SELF['templatePlayedPositionsEle'].innerHTML.trim(), {'variable':'data'});
         }

         SELF['drawBoardFromStruct']();
         SELF['changeCurrentPlayerText']();
       };

       SELF['init']();

       return SELF;
     };

     (function init() {

       var lobbyName = (document.location.hash.match(/room=([^&]+)/) || ['']).slice(-1)[0] || randomString(5);

       var boardSize = (document.location.hash.match(/boardSize=([^&]+)/) || ['']).slice(-1)[0] || 9;

       if (boardSize > 19) {
         boardSize = 19;
       } else if (boardSize < 3) {
         boardSize = 3;
       }

       var hashString = 'room=' + lobbyName + '&boardSize=' + boardSize;

       document.location.hash = hashString;

       var lobbyNameLink = document.getElementById('lobby_name_link');
       lobbyNameLink.innerHTML = lobbyName;
       lobbyNameLink.href = '#' + hashString;

       var VERSION = '0.0.2';

       var pubnubInstance = PUBNUB.init({
         'subscribe_key': 'sub-c-cbcff300-bb84-11e3-b6e0-02ee2ddab7fe',
         'publish_key': 'pub-c-01bb4e6e-4ad8-4c62-9b72-5278a11cf9e5'
       });

       var pubnubUUID = PUBNUB.uuid();

       var pubnubDataChannel = 'go-game-' + VERSION + '-' + lobbyName + '-' + boardSize;

       GO = CREATE_GO({
         'containerEle': document.getElementById('game'),
         'lastPositionEle': document.getElementById('last_position'),
         'playedPositionsEle': document.getElementById('played_positions'),
         'templatePlayedPositionsEle': document.getElementById('template_played_positions'),
         'currentPlayerEle': document.getElementById('current_player'),
         'capturedWhitePiecesEle': document.getElementById('captured_white_pieces'),
         'capturedBlackPiecesEle': document.getElementById('captured_black_pieces'),
         'lobbyName': lobbyName,
         'boardSize': boardSize,
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
         }
       });

       PUBNUB.bind('click', document.getElementById('pass'), function() {
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
       });

       PUBNUB.bind('click', document.getElementById('undo'), function() {
         if (confirm('Are you sure you want to Undo?')) {
           pubnubInstance.publish({
             'channel': pubnubDataChannel,
             'message': {
               'type': 'undo',
               'forPlayer': GO.currentPlayer,
               'pubnubUUID': pubnubUUID,
               'time': (new Date().getTime())
             }
           });
         }
       });

       var processPubNubPayload = function(m, forHistory) {
         if ('undid' in m) {
           return;
         }
         if ('type' in m) {
           if (m.type === 'move' && 'x' in m && 'y' in m && 'forPlayer' in m) {
             GO.moveStoneToXY(parseInt(m.forPlayer), parseInt(m.x), parseInt(m.y));
           } else if (m.type === 'pass' && 'forPlayer' in m) {
             if (parseInt(GO.currentPlayer) === parseInt(m.forPlayer)) {
               GO.pass(parseInt(m.forPlayer));
             }
           } else if (m.type === 'undo' && forHistory === false) {
             setTimeout(function() {
               GO.init();
               requestPubNubHistory();
             }, 500);
           }
         }
       };

       var rollBackHistoryUsingUndo = function(messages) {
         for (var idx in messages) {
           if ('type' in messages[idx] && messages[idx].type === 'undo') {
             var undoIndex = idx;
             while (undoIndex - 1 >= 0) {
               undoIndex = undoIndex - 1;
               if (undoIndex >= 0) {
                 if ('type' in messages[undoIndex] && messages[undoIndex].type !== 'undo' && !('undid' in messages[undoIndex])) {
                   messages[undoIndex].undid = true;
                   break;
                 }
               } else {
                 break;
               }
             }
           }
         }
         return messages;
       };

       var requestPubNubHistory = function() {
         pubnubInstance.history({
           'channel': pubnubDataChannel,
           'callback': function(messages) {
             if (messages[0].length) {
               messages[0] = rollBackHistoryUsingUndo(messages[0]);
               for (var idx in messages[0]) {
                 processPubNubPayload(messages[0][idx], true);
               }
             }
           },
           'error': function() {}
         });
       };

       pubnubInstance.subscribe({
         'channel': pubnubDataChannel,
         'callback': function(m) {
           processPubNubPayload(m, false);
         }
       });

       requestPubNubHistory();

     }());

   }());