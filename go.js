   (function() {

       var boardEle = document.getElementById('board');
       var boardStruct;

       var lastPosition = null;

       var whitePrisoners = 0;

       var blackPrisoners = 0;

       var currentPlayer = 0;

       var boardSize = 9;

       var tiles = document.getElementsByClassName('tile');

       var currentPlayerEle = document.getElementById('current_player');

       var findLibertyRecurseSafety = 0;

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

           if (boardEle.children.length === 0) {

               for (var x in boardStruct) {

                   var li = document.createElement('li');

                   var ul = document.createElement('ul');

                   for (var y in boardStruct[x]) {
                       var _li = document.createElement('li');
                       var tile = boardStruct[x][y];
                       _li.className = 'tile ' + getColorClass(tile);
                       _li.setAttribute('data-x', x);
                       _li.setAttribute('data-y', y);
                       _li.innerHTML = '<div><span>' + x + ',' + y + '</span></div>';
                       ul.appendChild(_li);
                   }

                   li.appendChild(ul);
                   boardEle.appendChild(li);
               }

               li.appendChild(ul);
               boardEle.appendChild(li);

               PUBNUB.each(tiles, function(ele) {
                   PUBNUB.bind('click', ele, function() {
                       var x = parseInt(ele.getAttribute('data-x'));
                       var y = parseInt(ele.getAttribute('data-y'));
                       var result = moveStoneToXY(currentPlayer, x, y);
                   });
               });

           } else {

               for (var x in boardStruct) {

                   for (var y in boardStruct[x]) {

                       document.querySelector('li[data-x="' + x + '"][data-y="' + y + '"]').className = 'tile ' + getColorClass(boardStruct[x][y]);
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

           var prisonerTaken = false;

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

                   if (opponentPlayer === 0) {
                       blackPrisoners++;
                   } else {
                       whitePrisoners++;
                   }

                   prisonerTaken = true;

                   for (var _idx in liberties.group) {
                       var __x = liberties.group[_idx][0];
                       var __y = liberties.group[_idx][1];
                       if (boardStruct[__x][__y] === opponentPlayer) {
                           boardStruct[__x][__y] = null;
                           if (opponentPlayer === 0) {
                               blackPrisoners++;
                           } else {
                               whitePrisoners++;
                           }
                       }
                   }

               }
           }

           return prisonerTaken;

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

           document.getElementById('captured_white_pieces').innerHTML = whitePrisoners;
           document.getElementById('captured_black_pieces').innerHTML = blackPrisoners;

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

           lastPosition = [x, y];

           pass();

           drawBoardFromStruct();

           return true;

           // console.log('%s to move', getColorClass(forPlayer));
           // console.log(' ');
       };

       boardStruct = createEmptyBoardStruct();

       drawBoardFromStruct();

       var pass = function() {
           currentPlayer = (currentPlayer == 0) ? 1 : 0;
           currentPlayerEle.innerHTML = currentPlayer == 1 ? 'White' : 'Black';
       }

       PUBNUB.bind('click', document.getElementById('pass'), pass);

       // console.log('%s to move', getColorClass(currentPlayer));
       // console.log(' ');

   }());