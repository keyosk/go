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

       SELF['movers'] = {};

       SELF['focused'] = true;

       SELF['containerEle'] = setup['containerEle'];
       SELF['lastPositionEle'] = setup['lastPositionEle'];
       SELF['currentPlayerEle'] = setup['currentPlayerEle'];

       SELF['scoreWhiteEle'] = setup['scoreWhiteEle'];
       SELF['scoreBlackEle'] = setup['scoreBlackEle'];

       SELF['playedPositionsEle'] = setup['playedPositionsEle'];
       SELF['templatePlayedPositionsEle'] = setup['templatePlayedPositionsEle'];
       SELF['templatePlayedPositions'] = null;

       SELF['lobbyName'] = setup['lobbyName'];
       SELF['boardSize'] = setup['boardSize'];

       SELF['pubnubUUID'] = setup['pubnubUUID'];
       SELF['clickCallback'] = setup['clickCallback'];

       SELF['playedPositions'] = [];

       SELF['lastPrisonersTaken'] = [];

       SELF['playerTextAnnouncementTimeout'] = false;

       SELF['getOppositePlayer'] = function(forPlayer) {
         return (forPlayer === 0) ? 1 : 0
       };

       SELF['handleOnBlur'] = function() {
         SELF['focused'] = false;
       };

       SELF['handleOnFocus'] = function() {
         SELF['focused'] = true;
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
                 var forPlayer = SELF['currentPlayer'];

                 if (SELF['movers'][forPlayer] && SELF['movers'][forPlayer] !== SELF['pubnubUUID']) {
                   alert('That piece belongs to someone else.');
                   return;
                 }

                 var result = SELF['moveStoneToXY'](SELF['currentPlayer'], x, y);
                 if (result) {
                   SELF['cachePlayedPosition']({
                     'type': 'move',
                     'forPlayer': forPlayer,
                     'x': x,
                     'y': y
                   });
                   if ('function' === typeof SELF['clickCallback']) {
                     SELF['clickCallback'](x, y, SELF['getOppositePlayer'](SELF['currentPlayer']));
                   }
                 }
               });
             });
           });

         } else {

           for (var x in SELF['boardStruct']) {
             for (var y in SELF['boardStruct'][x]) {
               SELF['elementsCache'][x][y].className = SELF['getColorClass'](SELF['boardStruct'][x][y]);
             }
           }

           SELF['scoreWhiteEle'].innerHTML = SELF['blackPrisoners'];
           SELF['scoreBlackEle'].innerHTML = SELF['whitePrisoners'];

           if ('text' in SELF['lastPosition']) {
             SELF['lastPositionEle'].innerHTML = SELF['lastPosition'].text;
           }

           if ('x' in SELF['lastPosition'] && 'y' in SELF['lastPosition']) {
             SELF['elementsCache'][SELF['lastPosition'].x][SELF['lastPosition'].y].className = SELF['elementsCache'][SELF['lastPosition'].x][SELF['lastPosition'].y].className + ' lastPiecePlayed';
           }

         }

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

         var prisonersTakenData = SELF['tryToTakePrisoners'](forPlayer, x, y);

         var numberPrisonersTaken = Object.keys(prisonersTakenData).length;

         SELF['lastPosition'] = {
           'text': SELF['getColorClass'](forPlayer) + ' @ ' + (parseInt(x) + 1) + ',' + (parseInt(y) + 1),
           'x': parseInt(x),
           'y': parseInt(y)
         };

         /* logic to determine if an immediate recapture is taking place */

         if (numberPrisonersTaken === 1 && SELF['lastPrisonersTaken'].length) {

           var potentialRecapture = SELF['lastPrisonersTaken'][SELF['lastPrisonersTaken'].length - 1];

           var lastOwner = potentialRecapture.forPlayer;
           var lastX = potentialRecapture.x;
           var lastY = potentialRecapture.y;
           var lastPrisoner = [];

           for (var idx in potentialRecapture.prisoners) {
             lastPrisoner.push(parseInt(idx.split(',')[0]));
             lastPrisoner.push(parseInt(idx.split(',')[1]));
           }

           var currentOwner = forPlayer;
           var currentX = x;
           var currentY = y;
           var currentPrisoner = [];

           for (var idx in prisonersTakenData) {
             currentPrisoner.push(parseInt(idx.split(',')[0]));
             currentPrisoner.push(parseInt(idx.split(',')[1]));
           }

           var recaptureFound = false;

           if (currentOwner !== lastOwner && currentPrisoner[0] === lastX && currentPrisoner[1] === lastY && lastPrisoner[0] === currentX && lastPrisoner[1] === currentY) {
             recaptureFound = true;
           }

           if (recaptureFound) {

             var immediateRecapture = false;

             var idx = SELF['playedPositions'].length;
             while (true) {
               if (idx === 0) {
                 break;
               }
               idx = idx - 1;
               if (SELF['playedPositions'][idx].type === 'move' && !('undid' in SELF['playedPositions'][idx])) {
                 immediateRecapture = (SELF['playedPositions'][idx].x === currentPrisoner[0] && SELF['playedPositions'][idx].y === currentPrisoner[1])
                 break;
               }
             }

             if (immediateRecapture) {
               numberPrisonersTaken = 0;
               alert('Immediate recapture is not allowed.');
             }

           }

         }

         /* end logic to determine if an immediate recapture is taking place */

         if (numberPrisonersTaken) {

           for (var idx in prisonersTakenData) {
             var _x = idx.split(',')[0];
             var _y = idx.split(',')[1];
             SELF['boardStruct'][_x][_y] = null;
           }

           SELF['lastPrisonersTaken'].push({
             forPlayer: forPlayer,
             x: x,
             y: y,
             prisoners: prisonersTakenData
           });

           if (SELF['getOppositePlayer'](forPlayer) === 0) {
             SELF['blackPrisoners'] = parseInt(SELF['blackPrisoners']) + numberPrisonersTaken;
           } else {
             SELF['whitePrisoners'] = parseInt(SELF['whitePrisoners']) + numberPrisonersTaken;
           }

         }

         if (Object.keys(adjacentPositionsData.liberties).length === 0 && numberPrisonersTaken === 0) {
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

           if ((forPlayer === null && positionOwner !== null) || (forPlayer !== null && positionOwner === null)) {
             _results['liberties'][x + ',' + y] = positionOwner;
             continue;
           }

           /*protection attempt for recursive loopback behavior*/

           var shouldContinue = false;
           for (var _idx in examinedPositions) {
             var _x = examinedPositions[_idx][0];
             var _y = examinedPositions[_idx][1];
             if (x === _x && y === _y) {
               shouldContinue = true;
               break;
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

             prisonersList[_x + ',' + _y] = opponentPlayer;

             for (var _idx in adjacentPositionsData.group) {
               var __x = adjacentPositionsData.group[_idx][0];
               var __y = adjacentPositionsData.group[_idx][1];
               if (SELF['boardStruct'][__x][__y] === opponentPlayer) {
                 prisonersList[__x + ',' + __y] = opponentPlayer;
               }
             }
           }
         }

         return prisonersList;

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

         SELF['switchCurrentPlayer']();

         SELF['drawBoardFromStruct']();

         return true;
       };


       SELF['changeCurrentPlayerText'] = function() {

         SELF['currentPlayerEle'].style.visibility = 'visible';

         SELF['currentPlayerEle'].innerHTML = SELF['getColorClass'](SELF['currentPlayer']);

         if (SELF['playerTextAnnouncementTimeout']) {
           clearTimeout(SELF['playerTextAnnouncementTimeout']);
           SELF['playerTextAnnouncementTimeout'] = null;
         }

         if (SELF['movers'][SELF['currentPlayer']] === SELF['pubnubUUID']) {

           var loop = function(element, status, time, loopCount) {
             if (loopCount++ > 5) {
               element.style.visibility = 'visible';
               if (SELF['playerTextAnnouncementTimeout']) {
                 clearTimeout(SELF['playerTextAnnouncementTimeout']);
                 SELF['playerTextAnnouncementTimeout'] = null;
               }
             } else {
               element.style.visibility = status;
               SELF['playerTextAnnouncementTimeout'] = setTimeout(function() {
                 loop(element, status === 'hidden' ? 'visible' : 'hidden', time, loopCount);
               }, time);
             }
           };

           loop(SELF['currentPlayerEle'], 'hidden', 750, 0);
         }
       };

       SELF['switchCurrentPlayer'] = function() {
         SELF['currentPlayer'] = SELF['getOppositePlayer'](SELF['currentPlayer']);
         SELF['changeCurrentPlayerText']();
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

       SELF['cachePlayedPosition'] = function(m) {

         if (!('pubnubUUID' in m)) {
           m['pubnubUUID'] = SELF['pubnubUUID'];
         }

         if (!('time' in m)) {
           m['time'] = (new Date().getTime());
         }

         SELF['playedPositions'].push(m);

         SELF['playedPositionsEle'].innerHTML = SELF['templatePlayedPositions']({
           playedPositions: SELF['playedPositions']
         });

       };

       SELF['rollBackHistoryUsingUndo'] = function(messages) {

         //Remove all previous undids to prevent cludging
         for (var idx in messages) {
           delete messages[idx].undid;
         }

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

       SELF['processPubNubPayload'] = function(m, forHistory) {
         if ('type' in m) {

           if (!forHistory && SELF['focused'] === false) {
             sounds.play('chat');
           }

           if (m.type === 'move' && 'forPlayer' in m && 'pubnubUUID' in m && !SELF['movers'][m.forPlayer]) {
             SELF['movers'][m.forPlayer] = m.pubnubUUID;
           }

           if ('undid' in m) {
             SELF['cachePlayedPosition'](m);
           } else if (m.type === 'move' && 'x' in m && 'y' in m && 'forPlayer' in m) {

             var result = SELF['moveStoneToXY'](parseInt(m.forPlayer), parseInt(m.x), parseInt(m.y));
             if (result) {
               SELF['cachePlayedPosition'](m);
             }

           } else if (m.type === 'pass' && 'forPlayer' in m) {
             if (parseInt(SELF['currentPlayer']) === parseInt(m.forPlayer)) {
               if (SELF['movers'][m.forPlayer] && SELF['movers'][m.forPlayer] !== m.pubnubUUID) {
                 //Only allow a pass on your own turn
               } else {
                 var lastPosition = SELF['playedPositions'][SELF['playedPositions'].length - 1];
                 if (lastPosition.type === 'pass') {
                   var results = SELF['attemptToCalculateAndAssignScores']();
                   if (results[0] || results[1]) {
                     var totalPointsBlack = parseInt(SELF['whitePrisoners']) + parseInt(results[0]);
                     var totalPointsWhite = parseInt(SELF['blackPrisoners']) + parseInt(results[1]);
                     if (totalPointsWhite > totalPointsBlack) {
                       alert('White Wins!');
                     } else if (totalPointsBlack > totalPointsWhite) {
                       alert('Black Wins!');
                     } else {
                       alert('Draw');
                     }
                   }
                 }
                 SELF['cachePlayedPosition'](m);
                 SELF['switchCurrentPlayer']();
               }
             }
           } else if (m.type === 'undo') {
             SELF['cachePlayedPosition'](m);
             if (forHistory === false) {
               SELF['undo'](m.forPlayer);
             }
           }
         }
       };

       SELF['undo'] = function(forPlayer) {

         var playedPositions = SELF['rollBackHistoryUsingUndo'](SELF['playedPositions']);

         SELF['init']();

         for (var idx in playedPositions) {
           SELF['processPubNubPayload'](playedPositions[idx], true);
         }

         SELF['drawBoardFromStruct']();

       };

       SELF['attemptToCalculateAndAssignScores'] = function() {

         var finalEmptySpots = [];

         var finalEmptyCoords = {};

         var emptySpots = 0;

         var shouldBreak = false;

         for (var x in SELF['boardStruct']) {

           for (var y in SELF['boardStruct'][x]) {

             x = parseInt(x);
             y = parseInt(y);

             if (SELF['boardStruct'][x][y] === null) {

               emptySpots++;

               var adjacentPositions = SELF['adjacentPositionFinder'](x, y);

               findLibertyRecurseSafety = 0;

               var adjacentPositionsData = SELF['findDataForAdjacentPositions'](
                 null, [
                   [x, y]
                 ],
                 adjacentPositions
               );

               finalEmptySpots.push(adjacentPositionsData);
             }

           }
         }

         var turfFor0 = 0;
         var turfFor1 = 0;

         for (var idx in finalEmptySpots) {

           var owners = [];

           for (var _idx in finalEmptySpots[idx].liberties) {
             var _x = parseInt(_idx.split(',')[0]);
             var _y = parseInt(_idx.split(',')[1]);
             owners.push(SELF['boardStruct'][_x][_y]);
           }

           var sameOwner = (owners.length === _.filter(owners, function(item) {
             return item === owners[0];
           }).length);

           if (sameOwner && (owners[0] === 1 || owners[0] === 0)) {

             if (owners[0] === 0) {
               turfFor0++;
             } else if (owners[0] === 1) {
               turfFor1++;
             }

             for (var _idx in finalEmptySpots[idx].group) {

               //dedupe

               var _x = parseInt(finalEmptySpots[idx].group[_idx][0]);
               var _y = parseInt(finalEmptySpots[idx].group[_idx][1]);

               finalEmptyCoords[_x + ',' + _y] = {
                 forPlayer: owners[0],
                 x: _x,
                 y: _y
               };

             }

           } else {
             // console.error('not the same owner', owners);
           }


         }

         for (var _idx in finalEmptyCoords) {
           var _x = parseInt(finalEmptyCoords[_idx].x);
           var _y = parseInt(finalEmptyCoords[_idx].y);
           if (finalEmptyCoords[_idx].forPlayer === 0) {
             SELF['elementsCache'][_x][_y].className = SELF['elementsCache'][_x][_y].className + ' blackTurf';
           } else if (finalEmptyCoords[_idx].forPlayer === 1) {
             SELF['elementsCache'][_x][_y].className = SELF['elementsCache'][_x][_y].className + ' whiteTurf';
           }
         }

         SELF['scoreBlackEle'].innerHTML = parseInt(SELF['whitePrisoners']) + ' + ' + parseInt(turfFor0);
         SELF['scoreWhiteEle'].innerHTML = parseInt(SELF['blackPrisoners']) + ' + ' + parseInt(turfFor1);

         return [
           turfFor0, turfFor1
         ];

       };

       SELF['init'] = function() {

         SELF['elementsCache'] = SELF['elementsCache'] || SELF['createEmptyBoardStruct']();
         SELF['boardStruct'] = SELF['createEmptyBoardStruct']();

         SELF['blackPrisoners'] = 0;
         SELF['whitePrisoners'] = 0;
         SELF['currentPlayer'] = 0;
         SELF['lastPosition'] = {};

         SELF['playedPositions'] = [];

         SELF['lastPrisonersTaken'] = [];

         SELF['movers'] = {};

         if (SELF['templatePlayedPositions'] === null) {

           window.onblur = SELF['handleOnBlur'];
           window.onfocus = SELF['handleOnFocus'];

           SELF['templatePlayedPositions'] = _.template(SELF['templatePlayedPositionsEle'].innerHTML.trim(), {
             'variable': 'data'
           });
         }

         SELF['drawBoardFromStruct']();
         SELF['changeCurrentPlayerText']();
       };

       SELF['init']();

       return SELF;
     };

     (function init() {

       var lobbyName = (document.location.hash.match(/room=([^&]+)/) || ['']).slice(-1)[0] || randomString(5);

       var boardSize = parseInt((document.location.hash.match(/boardSize=([^&]+)/) || ['']).slice(-1)[0]) || 9;

       var historyPlayBackSpeed = parseInt((document.location.hash.match(/historyPlayBackSpeed=([^&]+)/) || ['']).slice(-1)[0] || 0);

       if (boardSize > 19) {
         boardSize = 19;
       } else if (boardSize < 3) {
         boardSize = 3;
       }

       var hashString = 'room=' + lobbyName + '&boardSize=' + boardSize;

       if (historyPlayBackSpeed !== 0) {
         hashString = hashString + '&historyPlayBackSpeed=' + historyPlayBackSpeed;
       }

       document.location.hash = hashString;

       var lobbyNameLink = document.getElementById('lobby_name_link');
       lobbyNameLink.innerHTML = lobbyName;
       lobbyNameLink.href = '#' + hashString;

       var VERSION = '0.0.2';

       var pubnubInstance = PUBNUB.init({
         'subscribe_key': 'sub-c-cbcff300-bb84-11e3-b6e0-02ee2ddab7fe',
         'publish_key': 'pub-c-01bb4e6e-4ad8-4c62-9b72-5278a11cf9e5'
       });

       var pubnubUUID = PUBNUB.get_uuid();

       var pubnubDataChannel = 'go-game-' + VERSION + '-' + lobbyName + '-' + boardSize;

       GO = CREATE_GO({
         'containerEle': document.getElementById('game'),
         'lastPositionEle': document.getElementById('last_position'),
         'playedPositionsEle': document.getElementById('played_positions'),
         'templatePlayedPositionsEle': document.getElementById('template_played_positions'),
         'currentPlayerEle': document.getElementById('current_player'),
         'scoreWhiteEle': document.getElementById('score_white'),
         'scoreBlackEle': document.getElementById('score_black'),
         'lobbyName': lobbyName,
         'boardSize': boardSize,
         'pubnubUUID': pubnubUUID,
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



       window.GO_CALC = GO.attemptToCalculateAndAssignScores;

       PUBNUB.bind('click', document.getElementById('pass'), function() {

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
       });

       PUBNUB.bind('click', document.getElementById('undo'), function() {

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
               'forPlayer': GO.currentPlayer,
               'pubnubUUID': pubnubUUID,
               'time': (new Date().getTime())
             }
           });
         }
       });

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

       get_all_history({
         'channel': pubnubDataChannel,
         'callback': function(messages) {
           if (messages.length) {

             messages = GO.rollBackHistoryUsingUndo(messages);

             if (historyPlayBackSpeed === 0) {

               for (var idx in messages) {
                 GO.processPubNubPayload(messages[idx], true);
               }

             } else {

               var handleMessagesRecursively = function() {
                 if (messages.length === 0) {
                   return;
                 }
                 var message = messages.shift();
                 GO.processPubNubPayload(message, true);
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
         }
       });

     }());

   }());