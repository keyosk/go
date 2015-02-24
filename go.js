   (function() {

       var rand = function(len) {
           var text = '';
           var charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
           for (var i = 0; i < len; i++) {
               text += charset.charAt(Math.floor(Math.random() * charset.length));
           }
           return text;
       };

       var containerEle = document.getElementById('game');

       var lastPositionEle = document.getElementById('last_position');

       var elementsCache;

       var boardStruct;

       var whitePrisoners = 0;

       var blackPrisoners = 0;

       var currentPlayer = 0;

       var boardSize = (location.href.match(/boardSize=([^&]+)/) || ['']).slice(-1)[0] || 9;

       var currentPlayerEle = document.getElementById('current_player');

       var lobbyNameLink = document.getElementById('lobby_name_link');

       var capturedWhitePiecesEle = document.getElementById('captured_white_pieces');
       var capturedBlackPiecesEle = document.getElementById('captured_black_pieces');

       var findLibertyRecurseSafety = 0;

       var lobbyName = (location.href.match(/room=([^&]+)/) || ['']).slice(-1)[0] || rand(5);

       var VERSION = '0.0.2';

       var pubnubDataChannel = 'go-game-' + VERSION + '-' + lobbyName;

       var lastPosition = '';

       var pubnubInstance = PUBNUB.init({
           'subscribe_key': 'demo',
           'publish_key': 'demo'
       });


       var pubnubUUID = PUBNUB.uuid();

       var getColorClass = function(colorState) {
           var color = '';
           if (colorState === 0) {
               color = 'black';
           } else if (colorState === 1) {
               color = 'white';
           }
           return color;
       };

       var createEmptyBoardStruct = function() {

           var emptyBoard = [];

           for (var x = 0; x < boardSize; x++) {
               emptyBoard.push([]);
               for (var y = 0; y < boardSize; y++) {
                   emptyBoard[x].push(null);
               }
           }

           return emptyBoard;

       };

       var drawBoardFromStruct = function() {

           if (containerEle.children.length === 0) {

               var tableEle = document.createElement('table');

               for (var x in boardStruct) {

                   var tableRow = document.createElement('tr');
                   for (var y in boardStruct[x]) {
                       var tableCell = document.createElement('td');
                       var tile = boardStruct[x][y];
                       tableCell.className = getColorClass(tile);
                       tableCell.innerHTML = '<div><span>' + (parseInt(x) + 1) + ',' + (parseInt(y) + 1) + '</span></div>';
                       tableRow.appendChild(tableCell);
                       elementsCache[x][y] = tableCell;
                   }

                   tableEle.appendChild(tableRow);

               }

               containerEle.appendChild(tableEle);

               PUBNUB.each(elementsCache, function(row, x) {
                   PUBNUB.each(row, function(ele, y) {
                       PUBNUB.bind('click', ele, function() {
                           x = parseInt(x);
                           y = parseInt(y);
                           var result = moveStoneToXY(currentPlayer, x, y);
                           if (result) {
                               pubnubInstance.publish({
                                   'channel': pubnubDataChannel,
                                   'message': {
                                       'type': 'move',
                                       'forPlayer': (currentPlayer == 0) ? 1 : 0,
                                       'x': x,
                                       'y': y,
                                       'pubnubUUID': pubnubUUID,
                                       'time': (new Date().getTime())
                                   }
                               });
                           }
                       });
                   });
               });

           } else {

               for (var x in boardStruct) {

                   for (var y in boardStruct[x]) {

                       elementsCache[x][y].className = getColorClass(boardStruct[x][y]);

                       capturedWhitePiecesEle.innerHTML = whitePrisoners;
                       capturedBlackPiecesEle.innerHTML = blackPrisoners;

                       lastPositionEle.innerHTML = lastPosition;
                   }
               }

           }

       };

       var tryToTakePrisoners = function(forPlayer, x, y) {
           // console.log('tryToTakePrisoners');
           var adjacentPositions = adjacentPositionFinder(x, y);
           // console.log('x, y, adjacentPositions', x, y, adjacentPositions);

           // console.log('I am : ', forPlayer);

           var opponentPlayer = (forPlayer == 0) ? 1 : 0;

           // console.log('Opponent is : ', opponentPlayer);

           adjacentPositions = _.filter(adjacentPositions, function(item) {
               var _x = item[0];
               var _y = item[1];
               return boardStruct[_x][_y] === opponentPlayer;
           });

           // console.log('x, y, adjacentPositions', x, y, adjacentPositions);

           var prisonersTaken = false;

           var prisonersList = {};

           for (var idx in adjacentPositions) {
               var _x = adjacentPositions[idx][0];
               var _y = adjacentPositions[idx][1];
               findLibertyRecurseSafety = 0;
               var liberties = findLibertiesOfAPosition(
                   opponentPlayer, [
                       [x, y],
                       [_x, _y]
                   ],
                   adjacentPositionFinder(_x, _y)
               );
               // console.log('!!liberties!!', liberties);
               if (Object.keys(liberties.liberties).length === 0) {
                   // console.error('%s,%s and all of it and its adjacent squares are DEAD!', _x, _y);
                   boardStruct[_x][_y] = null;

                   prisonersList[_x + ',' + _y] = 1;

                   prisonersTaken = true;

                   for (var _idx in liberties.group) {
                       var __x = liberties.group[_idx][0];
                       var __y = liberties.group[_idx][1];
                       if (boardStruct[__x][__y] === opponentPlayer) {
                           boardStruct[__x][__y] = null;
                           prisonersList[__x + ',' + __y] = 1;
                       }
                   }

               }
           }


           if (opponentPlayer === 0) {
               blackPrisoners = parseInt(blackPrisoners) + Object.keys(prisonersList).length;
           } else {
               whitePrisoners = parseInt(whitePrisoners) + Object.keys(prisonersList).length;
           }

           return prisonersTaken;

       }

       var getPositionValid = function(forPlayer, x, y) {

           // console.log('determineIfPositionIsValid');

           if (boardStruct[x][y] !== null) {
               return false;
           }

           var adjacentPositions = adjacentPositionFinder(x, y);

           // console.log('x, y, adjacentPositions', x, y, adjacentPositions);

           findLibertyRecurseSafety = 0;

           var liberties = Object.keys(findLibertiesOfAPosition(
               forPlayer, [
                   [x, y]
               ],
               adjacentPositions
           ).liberties).length;

           // console.log('Find liberty recursions : %s', findLibertyRecurseSafety);

           boardStruct[x][y] = forPlayer;

           var prisonersTaken = tryToTakePrisoners(forPlayer, x, y);

           if (liberties === 0 && prisonersTaken === false) {
               boardStruct[x][y] = null;
               return false;
           }

           // console.log('liberties', liberties);

           return true;
       };

       var findLibertiesOfAPosition = function(forPlayer, examinedPositions, adjacentPositions) {

           findLibertyRecurseSafety++

           if (findLibertyRecurseSafety > 200) {
               // console.log('Recursed too many times, bailing out.');
               return {};
           }

           var _results = {
               'liberties': {},
               'group': {}
           };

           // console.log('findLibertiesOfAPosition');
           // console.log('examinedPositions', examinedPositions);
           // console.log('adjacentPositions', adjacentPositions);

           for (var idx in adjacentPositions) {
               var x = adjacentPositions[idx][0];
               var y = adjacentPositions[idx][1];

               var positionOwner = boardStruct[x][y];

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

               // console.log('adjacentPosition', x, y, getColorClass(positionOwner));

               if (positionOwner === forPlayer) {
                   // console.log('adjacentPosition is mine');
                   var moreAdjacentPositions = adjacentPositionFinder(x, y);

                   moreAdjacentPositions = _.filter(moreAdjacentPositions, function(item) {
                       var _x = item[0];
                       var _y = item[1];

                       var shouldReturnPosition = true;

                       for (var _idx in examinedPositions) {
                           var __x = examinedPositions[_idx][0];
                           var __y = examinedPositions[_idx][1];
                           if (__x == _x && __y == _y) {
                               shouldReturnPosition = false;
                               // console.log('need to splice out the more adjacentPositions for _x, _y', _x, _y);
                               break;
                           }
                       }

                       return shouldReturnPosition;
                   });

                   // console.log('adjacentPositions to that are :', moreAdjacentPositions);

                   examinedPositions.push([x, y]);

                   var foundLiberties = findLibertiesOfAPosition(forPlayer, examinedPositions, moreAdjacentPositions);

                   for (var _idx in foundLiberties.liberties) {
                       _results['liberties'][_idx] = 1;
                   }

               }
           }

           // console.log('_liberties', _results);

           _results['group'] = examinedPositions;

           return _results;

       };

       var adjacentPositionFinder = function(x, y) {

           var findUp = (x == 0) ? false : true;
           var findRight = (y == boardSize - 1) ? false : true;
           var findDown = (x == boardSize - 1) ? false : true;
           var findLeft = (y == 0) ? false : true;

           var positions = [];

           if (findDown) {
               var positionDown = boardStruct[x + 1][y];
               positions.push([x + 1, y]);
           }

           if (findUp) {
               var positionUp = boardStruct[x - 1][y];
               positions.push([x - 1, y]);
           }

           if (findRight) {
               var positionRight = boardStruct[x][y + 1];
               positions.push([x, y + 1]);
           }


           if (findLeft) {
               var positionLeft = boardStruct[x][y - 1];
               positions.push([x, y - 1]);
           }

           return positions;

       };

       var moveStoneToXY = function(forPlayer, x, y) {

           if (forPlayer !== currentPlayer) {
               // don't allow a click out of turn
               return false;
           }

           var positionValid = getPositionValid(forPlayer, x, y);

           if (positionValid === false) {
               // console.log('invalid position');
               // console.log(' ');
               return false;
           }

           lastPosition = (forPlayer == 1 ? 'White' : 'Black') + ' @ ' + (parseInt(x) + 1) + ',' + (parseInt(y) + 1);

           pass();

           drawBoardFromStruct();

           return true;

           // console.log('%s to move', getColorClass(forPlayer));
           // console.log(' ');
       };

       var pass = function() {
           currentPlayer = (currentPlayer == 0) ? 1 : 0;
           currentPlayerEle.innerHTML = currentPlayer == 1 ? 'White' : 'Black';

       };

       var processPubNubPayload = function(m) {
           if ('type' in m) {
               if (m.type === 'move' && 'x' in m && 'y' in m && 'forPlayer' in m) {
                   moveStoneToXY(parseInt(m.forPlayer), parseInt(m.x), parseInt(m.y));
               } else if (m.type === 'pass' && 'forPlayer' in m) {
                   if (parseInt(currentPlayer) === parseInt(m.forPlayer)) {
                       pass();
                   }
               } else if (m.type === 'undo') {
                   setTimeout(function() {
                       boardStruct = createEmptyBoardStruct();
                       blackPrisoners = 0;
                       whitePrisoners = 0;
                       currentPlayer = 0;
                       lastPosition = '';
                       drawBoardFromStruct();
                       currentPlayerEle.innerHTML = currentPlayer == 1 ? 'White' : 'Black';
                       requestPubNubHistory();
                   }, 500);
               }
           }
       };

       var requestPubNubHistory = function() {

           pubnubInstance.history({
               'channel': pubnubDataChannel,
               'callback': function(messages) {
                   if (messages[0].length) {

                       for (var idx in messages[0]) {
                           var m = messages[0][idx]
                           if ('type' in m && m.type === 'undo') {
                               var undoIndex = idx;
                               while (undoIndex - 1 >= 0) {
                                   undoIndex = undoIndex - 1;
                                   if (undoIndex >= 0) {
                                       var _m = messages[0][undoIndex];
                                       if ('type' in _m && _m.type !== 'undo') {
                                           messages[0][undoIndex] = {};
                                           break;
                                       }
                                   } else {
                                       break;
                                   }
                               }
                           }
                       }

                       for (var idx in messages[0]) {
                           var m = messages[0][idx]
                           if ('type' in m) {
                               if (m.type === 'move' && 'x' in m && 'y' in m && 'forPlayer' in m) {
                                   moveStoneToXY(parseInt(m.forPlayer), parseInt(m.x), parseInt(m.y));
                               } else if (m.type === 'pass' && 'forPlayer' in m) {
                                   if (parseInt(currentPlayer) === parseInt(m.forPlayer)) {
                                       pass();
                                   }
                               }
                           }
                       }
                   }
               },
               'error': function() {}
           });

       };

       (function init() {

           var searchString = '';

           if ((location.href.match(/room=([^&]+)/) || ['']).slice(-1)[0] !== lobbyName) {
               searchString = '?room=' + lobbyName;
           }

           if ((location.href.match(/boardSize=([^&]+)/) || ['']).slice(-1)[0] != boardSize) {
               searchString = searchString + '&boardSize=' + boardSize;
           }

           if (searchString !== '') {
               document.location.search = searchString;
           }

           boardStruct = createEmptyBoardStruct();

           elementsCache = createEmptyBoardStruct();

           drawBoardFromStruct();

           PUBNUB.bind('click', document.getElementById('pass'), function() {
               if (confirm('Are you sure you want to Pass?')) {
                   pubnubInstance.publish({
                       'channel': pubnubDataChannel,
                       'message': {
                           'type': 'pass',
                           'forPlayer': currentPlayer,
                           'pubnubUUID': pubnubUUID,
                           'time': (new Date().getTime())
                       }
                   });
                   pass();
               }
           });

           PUBNUB.bind('click', document.getElementById('undo'), function() {
               if (confirm('Are you sure you want to Undo?')) {
                   pubnubInstance.publish({
                       'channel': pubnubDataChannel,
                       'message': {
                           'type': 'undo',
                           'forPlayer': currentPlayer,
                           'pubnubUUID': pubnubUUID,
                           'time': (new Date().getTime())
                       }
                   });
               }
           });

           lobbyNameLink.innerHTML = lobbyName;
           lobbyNameLink.href = '?room=' + lobbyName + '&boardSize=' + boardSize;

           pubnubInstance.subscribe({
               'channel': pubnubDataChannel,
               'callback': processPubNubPayload
           });

           requestPubNubHistory();

       }());

       // console.log('%s to move', getColorClass(currentPlayer));
       // console.log(' ');

   }());