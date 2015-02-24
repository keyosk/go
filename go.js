   var board_ele = document.getElementById('board');
   var board_struct;

   var lastPosition = null;

   var whitePrisoners = 0;

   var blackPrisoners = 0;

   var playerState = 0;

   var board_size = 9;

   var tiles = document.getElementsByClassName('tile');

   var current_player_ele document.getElementById('current_player');

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

       for (var i = 0; i < board_size; i++) {
           emptyBoard.push([]);
           for (var j = 0; j < board_size; j++) {
               emptyBoard[i].push(null);
           }
       }

       return emptyBoard;

   };

   var drawBoardFromStruct = function(struct) {


       for (var i in struct) {

           var li = document.createElement('li');

           var ul = document.createElement('ul');

           for (var j in struct[i]) {
               var _li = document.createElement('li');
               var tile = struct[i][j];
               var tile_class = 'tile ' + getColorClass(tile);
               _li.className = tile_class;
               _li.setAttribute('data-x', i);
               _li.setAttribute('data-y', j);
               _li.innerHTML = '<div><span>' + i + ',' + j + '</span></div>';
               ul.appendChild(_li);
           }

           li.appendChild(ul);
           board_ele.appendChild(li);
       }

       li.appendChild(ul);
       board_ele.appendChild(li);

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
           var liberties = findLibertiesOfAPosition([
               [x, y],
               [_x, _y]
           ], adjacentPositionFinder(_x, _y), enemyPlayer);
           // console.log('!!liberties!!', liberties);
           if (Object.keys(liberties.liberties).length === 0) {
               // console.error('%s,%s and all of it and its adjacent squares are DEAD!', _x, _y);
               var ele = document.querySelector('li[data-x="' + _x + '"][data-y="' + _y + '"]');
               ele.className = 'tile';
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
                       var ele = document.querySelector('li[data-x="' + __x + '"][data-y="' + __y + '"]');
                       ele.className = 'tile';
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

   var getPositionValid = function(x, y) {

       // console.log('determineIfPositionIsValid');

       if (board_struct[x][y] !== null) {
           return false;
       }

       var adjacentPositions = adjacentPositionFinder(x, y);

       // console.log('x, y, adjacentPositions', x, y, adjacentPositions);

       findLibertyRecurseSafety = 0;

       var liberties = Object.keys(findLibertiesOfAPosition([
           [x, y]
       ], adjacentPositions, playerState).liberties).length;

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

   var processClick = function(ele) {
       var x = parseInt(ele.getAttribute('data-x'));
       var y = parseInt(ele.getAttribute('data-y'));
       var positionValid = getPositionValid(x, y);
       if (positionValid === false) {
           // console.log('invalid position');
           // console.log(' ');
           return;
       }

       var className = 'tile ' + getColorClass(playerState);

       ele.className = className;

       lastPosition = [x, y];

       pass();

       // console.log('%s to move', getColorClass(playerState));
       // console.log(' ');
   };

   board_struct = createEmptyBoardStruct();

   // potential Ko position
   // board_struct = JSON.parse("[[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,1,1,null,null,null],[null,null,null,1,0,null,1,null,null],[null,null,null,null,1,1,null,null,null],[null,null,null,null,null,null,0,0,0],[null,null,null,null,null,null,null,0,0],[null,null,null,null,null,null,null,null,null]]");
   // playerState = 1;

   // complicated Ko position
   // board_struct = JSON.parse("[[1,1,1,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,0,0,0,0,0,0,null],[null,null,0,1,1,1,1,0,null],[null,null,0,1,0,null,1,0,null],[null,null,0,1,1,1,1,0,null],[null,null,0,0,0,0,0,0,0],[null,null,null,null,null,null,null,0,0],[1,1,1,1,1,1,1,1,1]]");
   // playerState = 0;

   // complicated Ko position 2
   // board_struct = JSON.parse("[[1,1,1,null,null,null,null,null,0],[null,null,null,null,null,null,null,null,null],[null,null,0,0,0,0,0,0,null],[null,null,0,1,1,1,1,0,null],[null,null,0,1,null,0,1,0,null],[null,null,0,1,1,1,1,0,null],[null,null,0,0,0,0,0,0,0],[null,null,null,null,null,null,null,0,0],[1,1,1,1,1,1,1,1,1]]");
   // playerState = 1;

   // complicated Ko position 3
   // board_struct = JSON.parse("[[1,1,1,null,null,null,null,null,0],[null,null,null,null,null,null,null,null,null],[null,null,0,0,0,0,0,0,null],[null,null,0,1,1,1,1,0,null],[null,null,0,1,1,null,1,0,null],[null,null,0,1,1,1,1,0,null],[null,null,0,0,0,0,0,0,0],[null,null,null,null,null,null,null,0,0],[1,1,1,1,1,1,1,1,1]]");
   // playerState = 0;

   // some straight lines
   // board_struct = JSON.parse("[[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,0,0,0,1,1,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]]");
   // playerState = 1;

   //some broken board state
   // board_struct = JSON.parse("[[0,0,0,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,0,0,0,1,1,1,null],[null,null,null,null,null,null,1,1,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]]");
   // playerState = 1;

   //white to be captured by black
   // board_struct = JSON.parse("[[0,0,0,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,0,1,0,null,null,null],[null,null,0,0,0,1,1,1,null],[null,null,null,null,null,1,1,1,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]]");
   // playerState = 0;

   //many white to be captured by black
   // board_struct = JSON.parse("[[0,0,0,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,0,1,0,null,0,0],[null,null,0,0,0,1,1,1,1],[null,null,null,null,0,1,1,1,1],[null,null,null,null,null,0,0,0,1],[null,null,null,null,null,null,null,null,0],[1,1,1,0,0,null,1,1,null]]");
   // playerState = 0;

   // turning point :(
   // board_struct = JSON.parse("[[null,null,null,null,null,0,1,0,null],[null,null,null,null,null,0,1,0,null],[null,null,0,1,1,0,1,0,1],[null,null,0,1,0,0,1,0,1],[null,null,0,1,1,0,1,1,null],[null,null,null,null,0,1,1,null,1],[null,null,0,null,null,0,0,1,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]])


   // turning point =)
   // board_struct = JSON.parse("[[null,null,null,null,null,0,1,0,null],[null,null,null,null,null,0,1,0,null],[null,null,0,1,1,0,1,0,1],[null,null,0,1,0,0,1,0,1],[null,null,0,1,1,0,1,1,null],[null,null,null,null,0,1,1,0,null],[null,null,0,null,null,0,0,1,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]]")
   // playerState = 1;

   drawBoardFromStruct(board_struct);

   PUBNUB.each(tiles, function(ele) {
       PUBNUB.bind('click', ele, function(click_event) {
           processClick(ele);
       });
   });

   var pass = function() {
       playerState = (playerState == 0) ? 1 : 0;
       current_player_ele.innerHTML = playerState == 1 ? 'White' : 'Black';
   };

   PUBNUB.bind('click', document.getElementById('pass'), pass);

   // console.log('%s to move', getColorClass(playerState));
   // console.log(' ');