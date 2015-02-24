   var board_ele = document.getElementById('board');
   var board_struct;

   var lastPosition = null;

   var whitePrisoners = 0;

   var blackPrisoners = 0;

   var playerState = 0;

   var board_size = 9;

   var tiles = document.getElementsByClassName('tile');

   var current_player_ele = document.getElementById('current_player');

   var findLibertyRecurseSafety = 0;

   var getColorClass = function(color_state) {
       var color = '';
       if (color_state === 0) {
           color = 'black';
       } else if (color_state === 1) {
           color = 'white';
       }
       return color;
   };

   var createEmptyBoardStruct = function() {

       var emptyBoard = [];

       for (var x = 0; x < board_size; x++) {
           emptyBoard.push([]);
           for (var y = 0; y < board_size; y++) {
               emptyBoard[x].push(null);
           }
       }

       return emptyBoard;

   };

   var drawBoardFromStruct = function() {

       if (board_ele.children.length === 0) {

           for (var x in board_struct) {

               var li = document.createElement('li');

               var ul = document.createElement('ul');

               for (var y in board_struct[x]) {
                   var _li = document.createElement('li');
                   var tile = board_struct[x][y];
                   var tile_class = 'tile ' + getColorClass(tile);
                   _li.className = tile_class;
                   _li.setAttribute('data-x', x);
                   _li.setAttribute('data-y', y);
                   _li.innerHTML = '<div><span>' + x + ',' + y + '</span></div>';
                   ul.appendChild(_li);
               }

               li.appendChild(ul);
               board_ele.appendChild(li);
           }

           li.appendChild(ul);
           board_ele.appendChild(li);

           PUBNUB.each(tiles, function(ele) {
               PUBNUB.bind('click', ele, function(click_event) {
                   var x = parseInt(ele.getAttribute('data-x'));
                   var y = parseInt(ele.getAttribute('data-y'));
                   var result = processClick(playerState, x, y);
               });
           });

       } else {

           for (var x in board_struct) {

               for (var y in board_struct[x]) {

                   document.querySelector('li[data-x="' + x + '"][data-y="' + y + '"]').className = 'tile ' + getColorClass(board_struct[x][y]);
               }
           }

       }

   };

   var tryToTakePrisoners = function(x, y) {
       // console.log('tryToTakePrisoners');
       var adjacentPositions = adjacentPositionFinder(x, y);
       // console.log('x, y, adjacentPositions', x, y, adjacentPositions);

       // console.log('I am : ', playerState);

       var enemyPlayer = (playerState == 0) ? 1 : 0;

       // console.log('Enemy is : ', enemyPlayer);

       adjacentPositions = _.filter(adjacentPositions, function(item) {
           var _x = item[0];
           var _y = item[1];
           return board_struct[_x][_y] === enemyPlayer;
       });

       // console.log('x, y, adjacentPositions', x, y, adjacentPositions);

       var prisonerTaken = false;

       for (var idx in adjacentPositions) {
           var _x = adjacentPositions[idx][0];
           var _y = adjacentPositions[idx][1];
           findLibertyRecurseSafety = 0;
           var liberties = findLibertiesOfAPosition(
               [
                   [x, y],
                   [_x, _y]
               ],
               adjacentPositionFinder(_x, _y),
               enemyPlayer
           );
           // console.log('!!liberties!!', liberties);
           if (Object.keys(liberties.liberties).length === 0) {
               // console.error('%s,%s and all of it and its adjacent squares are DEAD!', _x, _y);
               board_struct[_x][_y] = null;

               if (enemyPlayer === 0) {
                   blackPrisoners++;
               } else {
                   whitePrisoners++;
               }

               prisonerTaken = true;

               for (var _idx in liberties.group) {
                   var __x = liberties.group[_idx][0];
                   var __y = liberties.group[_idx][1];
                   if (board_struct[__x][__y] === enemyPlayer) {
                       board_struct[__x][__y] = null;
                       if (enemyPlayer === 0) {
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

       if (board_struct[x][y] !== null) {
           return false;
       }

       var adjacentPositions = adjacentPositionFinder(x, y);

       // console.log('x, y, adjacentPositions', x, y, adjacentPositions);

       findLibertyRecurseSafety = 0;

       var liberties = Object.keys(findLibertiesOfAPosition(
           [
               [x, y]
           ],
           adjacentPositions,
           forPlayer
       ).liberties).length;

       // console.log('Find liberty recursions : %s', findLibertyRecurseSafety);

       board_struct[x][y] = playerState;

       var prisonersTaken = tryToTakePrisoners(x, y);

       document.getElementById('captured_white_pieces').innerHTML = whitePrisoners;
       document.getElementById('captured_black_pieces').innerHTML = blackPrisoners;

       if (liberties === 0 && prisonersTaken === false) {
           board_struct[x][y] = null;
           return false;
       }

       // console.log('liberties', liberties);

       return true;
   };

   var findLibertiesOfAPosition = function(examined_positions, adjacentPositions, forPlayer) {

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
       // console.log('examined_positions', examined_positions);
       // console.log('adjacentPositions', adjacentPositions);

       for (var idx in adjacentPositions) {
           var x = adjacentPositions[idx][0];
           var y = adjacentPositions[idx][1];

           var positionOwner = board_struct[x][y];

           if (positionOwner === null) {
               _results['liberties'][x + ',' + y] = 1;
               continue;
           }

           /*protection attempt for recursive loopback behavior*/


           var shouldContinue = false;
           for (var _idx in examined_positions) {
               var _x = examined_positions[_idx][0];
               var _y = examined_positions[_idx][1];
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

                   for (var _idx in examined_positions) {
                       var __x = examined_positions[_idx][0];
                       var __y = examined_positions[_idx][1];
                       if (__x == _x && __y == _y) {
                           shouldReturnPosition = false;
                           // console.log('need to splice out the more adjacentPositions for _x, _y', _x, _y);
                           break;
                       }
                   }

                   return shouldReturnPosition;
               });

               // console.log('adjacentPositions to that are :', moreAdjacentPositions);

               examined_positions.push([x, y]);

               var found_liberties = findLibertiesOfAPosition(examined_positions, moreAdjacentPositions, forPlayer);

               for (var _idx in found_liberties.liberties) {
                   _results['liberties'][_idx] = 1;
               }

           }
       }

       // console.log('_liberties', _results);

       _results['group'] = examined_positions;

       return _results;

   };

   var adjacentPositionFinder = function(x, y) {

       var findUp = (x == 0) ? false : true;
       var findRight = (y == board_size - 1) ? false : true;
       var findDown = (x == board_size - 1) ? false : true;
       var findLeft = (y == 0) ? false : true;

       var positions = [];

       if (findDown) {
           var positionDown = board_struct[x + 1][y];
           positions.push([x + 1, y]);
       }

       if (findUp) {
           var positionUp = board_struct[x - 1][y];
           positions.push([x - 1, y]);
       }

       if (findRight) {
           var positionRight = board_struct[x][y + 1];
           positions.push([x, y + 1]);
       }


       if (findLeft) {
           var positionLeft = board_struct[x][y - 1];
           positions.push([x, y - 1]);
       }

       return positions;

   };

   var processClick = function(forPlayer, x, y) {

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

       // console.log('%s to move', getColorClass(playerState));
       // console.log(' ');
   };

   board_struct = createEmptyBoardStruct();

   drawBoardFromStruct();

   var pass = function() {
       playerState = (playerState == 0) ? 1 : 0;
       current_player_ele.innerHTML = playerState == 1 ? 'White' : 'Black';
   }

   PUBNUB.bind('click', document.getElementById('pass'), pass);

   // console.log('%s to move', getColorClass(playerState));
   // console.log(' ');