'use strict';

(function() {

  var CREATE_GO = function(setup) {

    var SELF = function(setup) {
      return CREATE_GO(setup);
    };

    var findLibertyRecurseSafety = 0;

    SELF.initted = false;

    SELF.turfIsVisible = false;

    SELF.movers = {};

    SELF.focused = true;


    SELF.lobbyName = setup.lobbyName;
    SELF.boardSize = setup.boardSize;

    SELF.pubnubUUID = setup.pubnubUUID;

    SELF.clickCallback = setup.clickCallback;
    SELF.passCallback = setup.passCallback;
    SELF.undoCallback = setup.undoCallback;
    SELF.dataChangedCallback = setup.dataChangedCallback;

    SELF.playedPositions = [];

    SELF.lastPrisonersTaken = [];

    SELF.getOppositePlayer = function(forPlayer) {
      return (forPlayer === 0) ? 1 : 0;
    };

    SELF.handleOnBlur = function() {
      SELF.focused = false;
    };

    SELF.handleOnFocus = function() {
      SELF.focused = true;
    };

    SELF.createEmptyBoardStruct = function() {

      var emptyBoard = [];

      for (var x = 0; x < SELF.boardSize; x++) {
        emptyBoard.push([]);
        for (var y = 0; y < SELF.boardSize; y++) {
          emptyBoard[x].push(-1);
        }
      }

      return emptyBoard;

    };

    SELF.getPositionValid = function(forPlayer, x, y) {

      if (SELF.boardStruct[x][y] !== -1) {
        return false;
      }

      var adjacentPositions = SELF.adjacentPositionFinder(x, y);

      findLibertyRecurseSafety = 0;

      var adjacentPositionsData = SELF.findDataForAdjacentPositions(
        forPlayer, [
          [x, y]
        ],
        adjacentPositions
      );

      SELF.boardStruct[x][y] = forPlayer;

      var prisonersTakenData = SELF.tryToTakePrisoners(forPlayer, x, y);

      var numberPrisonersTaken = Object.keys(prisonersTakenData).length;

      SELF.lastPosition = {
        'x': parseInt(x),
        'y': parseInt(y)
      };

      /* logic to determine if an immediate recapture is taking place */

      // Ko prevention logic is currently bugged. Need time to understand how undo effects it.

      // if (numberPrisonersTaken === 1 && SELF.lastPrisonersTaken.length) {

      //   var potentialRecapture = SELF.lastPrisonersTaken[SELF.lastPrisonersTaken.length - 1];

      //   var lastOwner = potentialRecapture.forPlayer;
      //   var lastX = potentialRecapture.x;
      //   var lastY = potentialRecapture.y;
      //   var lastPrisoner = [];

      //   for (var idx in potentialRecapture.prisoners) {
      //     lastPrisoner.push(parseInt(idx.split(',')[0]));
      //     lastPrisoner.push(parseInt(idx.split(',')[1]));
      //   }

      //   var currentOwner = forPlayer;
      //   var currentX = x;
      //   var currentY = y;
      //   var currentPrisoner = [];

      //   for (var _idx in prisonersTakenData) {
      //     currentPrisoner.push(parseInt(_idx.split(',')[0]));
      //     currentPrisoner.push(parseInt(_idx.split(',')[1]));
      //   }

      //   var recaptureFound = false;

      //   if (currentOwner !== lastOwner && currentPrisoner[0] === lastX && currentPrisoner[1] === lastY && lastPrisoner[0] === currentX && lastPrisoner[1] === currentY) {
      //     recaptureFound = true;
      //   }

      //   if (recaptureFound) {

      //     var immediateRecapture = false;

      //     var playedPositionsPointer = SELF.playedPositions.length;
      //     while (true) {
      //       if (playedPositionsPointer === 0) {
      //         break;
      //       }
      //       playedPositionsPointer = playedPositionsPointer - 1;
      //       if (SELF.playedPositions[playedPositionsPointer].type === 'move' && !('undid' in SELF.playedPositions[playedPositionsPointer])) {
      //         immediateRecapture = (SELF.playedPositions[playedPositionsPointer].x === currentPrisoner[0] && SELF.playedPositions[playedPositionsPointer].y === currentPrisoner[1]);
      //         break;
      //       }
      //     }

      //     if (immediateRecapture) {
      //       numberPrisonersTaken = 0;
      //       window.alert('Immediate recapture is not allowed.');
      //     }

      //   }

      // }

      /* end logic to determine if an immediate recapture is taking place */

      if (numberPrisonersTaken) {

        for (var idxPrisonersTaken in prisonersTakenData) {
          var _x = idxPrisonersTaken.split(',')[0];
          var _y = idxPrisonersTaken.split(',')[1];
          SELF.boardStruct[_x][_y] = -1;
        }

        SELF.lastPrisonersTaken.push({
          forPlayer: forPlayer,
          x: x,
          y: y,
          prisoners: prisonersTakenData
        });

        if (SELF.getOppositePlayer(forPlayer) === 0) {
          SELF.blackPrisoners = parseInt(SELF.blackPrisoners) + numberPrisonersTaken;
        } else {
          SELF.whitePrisoners = parseInt(SELF.whitePrisoners) + numberPrisonersTaken;
        }

      }

      if (Object.keys(adjacentPositionsData.liberties).length === 0 && numberPrisonersTaken === 0) {
        SELF.boardStruct[x][y] = -1;
        return false;
      }

      return true;
    };

    SELF.adjacentPositionFinder = function(x, y) {

      x = parseInt(x);
      y = parseInt(y);

      var findUp = (x === 0) ? false : true;
      var findRight = (y === SELF.boardSize - 1) ? false : true;
      var findDown = (x === SELF.boardSize - 1) ? false : true;
      var findLeft = (y === 0) ? false : true;

      var positions = [];

      if (findDown) {
        positions.push([x + 1, y]);
      }

      if (findUp) {
        positions.push([x - 1, y]);
      }

      if (findRight) {
        positions.push([x, y + 1]);
      }

      if (findLeft) {
        positions.push([x, y - 1]);
      }

      return positions;

    };

    SELF.findDataForAdjacentPositions = function(forPlayer, examinedPositions, adjacentPositions) {

      findLibertyRecurseSafety++;

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

        var positionOwner = SELF.boardStruct[x][y];

        if ((forPlayer === -1 && positionOwner !== -1) || (forPlayer !== -1 && positionOwner === -1)) {
          _results.liberties[x + ',' + y] = positionOwner;
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

          var moreAdjacentPositions = SELF.adjacentPositionFinder(x, y);

          moreAdjacentPositions = window._.filter(moreAdjacentPositions, function(item) {
            var _x = item[0];
            var _y = item[1];

            var shouldReturnPosition = true;

            for (var _idx in examinedPositions) {
              var __x = parseInt(examinedPositions[_idx][0]);
              var __y = parseInt(examinedPositions[_idx][1]);
              if (__x === _x && __y === _y) {
                shouldReturnPosition = false;
                break;
              }
            }

            return shouldReturnPosition;
          });

          examinedPositions.push([x, y]);

          var adjacentPositionsData = SELF.findDataForAdjacentPositions(forPlayer, examinedPositions, moreAdjacentPositions);

          for (var __idx in adjacentPositionsData.liberties) {
            _results.liberties[__idx] = 1;
          }
        }
      }

      _results.group = examinedPositions;

      return _results;

    };

    SELF.tryToTakePrisoners = function(forPlayer, x, y) {

      var adjacentPositions = SELF.adjacentPositionFinder(x, y);

      var opponentPlayer = SELF.getOppositePlayer(forPlayer);

      adjacentPositions = window._.filter(adjacentPositions, function(item) {
        var _x = item[0];
        var _y = item[1];
        return SELF.boardStruct[_x][_y] === opponentPlayer;
      });

      var prisonersList = {};

      for (var idx in adjacentPositions) {
        var _x = adjacentPositions[idx][0];
        var _y = adjacentPositions[idx][1];
        findLibertyRecurseSafety = 0;
        var adjacentPositionsData = SELF.findDataForAdjacentPositions(
          opponentPlayer, [
            [x, y],
            [_x, _y]
          ],
          SELF.adjacentPositionFinder(_x, _y)
        );

        if (Object.keys(adjacentPositionsData.liberties).length === 0) {

          prisonersList[_x + ',' + _y] = opponentPlayer;

          for (var _idx in adjacentPositionsData.group) {
            var __x = adjacentPositionsData.group[_idx][0];
            var __y = adjacentPositionsData.group[_idx][1];
            if (SELF.boardStruct[__x][__y] === opponentPlayer) {
              prisonersList[__x + ',' + __y] = opponentPlayer;
            }
          }
        }
      }

      return prisonersList;

    };


    SELF.moveStoneToXY = function(forPlayer, x, y) {

      if (forPlayer !== SELF.currentPlayer) {
        // don't allow a click out of turn
        return false;
      }

      var positionValid = SELF.getPositionValid(forPlayer, x, y);

      if (positionValid === false) {
        return false;
      }

      SELF.switchCurrentPlayer();



      return true;
    };

    SELF.switchCurrentPlayer = function() {
      SELF.currentPlayer = SELF.getOppositePlayer(SELF.currentPlayer);

    };

    SELF.getColorClass = function(colorState) {
      var color = '';
      if (colorState === 0) {
        color = 'Black';
      } else if (colorState === 1) {
        color = 'White';
      }
      return color;
    };

    SELF.cachePlayedPosition = function(m) {

      if (!('pubnubUUID' in m)) {
        m.pubnubUUID = SELF.pubnubUUID;
      }

      if (!('time' in m)) {
        m.time = (new Date().getTime());
      }

      SELF.playedPositions.push(m);

    };

    SELF.rollBackHistoryUsingUndo = function(messages) {

      //Remove all previous undids to prevent cludging
      for (var idxMessageToDelete in messages) {
        delete messages[idxMessageToDelete].undid;
      }

      for (var idxMessage in messages) {
        if ('type' in messages[idxMessage] && messages[idxMessage].type === 'undo') {
          var undoIndex = idxMessage;
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

    SELF.processPubNubPayload = function(m, forHistory) {
      if ('type' in m) {

        // if (!forHistory && SELF.focused === false) {
          if (!forHistory) {
          window.sounds.play('chat');
        }

        if (m.type === 'move' && 'forPlayer' in m && 'pubnubUUID' in m && !SELF.movers[m.forPlayer]) {
          SELF.movers[m.forPlayer] = m.pubnubUUID;
        }

        if ('undid' in m) {
          SELF.cachePlayedPosition(m);
        } else if (m.type === 'move' && 'x' in m && 'y' in m && 'forPlayer' in m) {

          var result = SELF.moveStoneToXY(parseInt(m.forPlayer), parseInt(m.x), parseInt(m.y));
          if (result) {
            SELF.cachePlayedPosition(m);
          }
          if (!forHistory && SELF.turfIsVisible) {
            SELF.attemptToCalculateAndAssignScores();
          }

        } else if (m.type === 'pass' && 'forPlayer' in m) {
          if (parseInt(SELF.currentPlayer) === parseInt(m.forPlayer)) {
            if (SELF.movers[m.forPlayer] && SELF.movers[m.forPlayer] !== m.pubnubUUID) {
              //Only allow a pass on your own turn
            } else {
              var lastPosition = SELF.playedPositions[SELF.playedPositions.length - 1];
              if (lastPosition.type === 'pass') {
                SELF.turfIsVisible = true;
                SELF.attemptToCalculateAndAssignScores();
              }
              // if (results[0] || results[1]) {
              //   var totalPointsBlack = parseInt(SELF.whitePrisoners) + parseInt(results[0]);
              //   var totalPointsWhite = parseInt(SELF.blackPrisoners) + parseInt(results[1]);
              //   if (totalPointsWhite > totalPointsBlack) {
              //     window.alert('White Wins!');
              //   } else if (totalPointsBlack > totalPointsWhite) {
              //     window.alert('Black Wins!');
              //   } else {
              //     window.alert('Draw');
              //   }
              // }
              // }
              SELF.cachePlayedPosition(m);
              SELF.switchCurrentPlayer();
            }
          }
        } else if (m.type === 'undo') {
          SELF.cachePlayedPosition(m);
          if (forHistory === false) {
            SELF.undo();
          }
        }
      }
    };

    SELF.undo = function() {

      var playedPositions = SELF.rollBackHistoryUsingUndo(SELF.playedPositions);

      SELF.init();

      for (var idx in playedPositions) {
        SELF.processPubNubPayload(playedPositions[idx], true);
      }

      if (SELF.turfIsVisible) {
        SELF.attemptToCalculateAndAssignScores();
      }

    };

    SELF.attemptToCalculateAndAssignScores = function() {

      var finalEmptySpots = [];

      var finalEmptyCoords = {};

      var emptySpots = 0;

      for (var x in SELF.boardStruct) {

        for (var y in SELF.boardStruct[x]) {

          x = parseInt(x);
          y = parseInt(y);

          if (SELF.boardStruct[x][y] === -1) {

            emptySpots++;

            var adjacentPositions = SELF.adjacentPositionFinder(x, y);

            findLibertyRecurseSafety = 0;

            var adjacentPositionsData = SELF.findDataForAdjacentPositions(-1, [
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
          owners.push(SELF.boardStruct[_x][_y]);
        }

        var sameOwner = (owners.length === window._.filter(owners, function(item) {
          return item === owners[0];
        }).length);

        if (sameOwner && (owners[0] === 1 || owners[0] === 0)) {

          if (owners[0] === 0) {
            turfFor0++;
          } else if (owners[0] === 1) {
            turfFor1++;
          }

          for (var __idx in finalEmptySpots[idx].group) {

            //dedupe

            var __x = parseInt(finalEmptySpots[idx].group[__idx][0]);
            var __y = parseInt(finalEmptySpots[idx].group[__idx][1]);

            finalEmptyCoords[__x + ',' + __y] = {
              forPlayer: owners[0],
              x: __x,
              y: __y
            };

          }

        } else {
          // console.error('not the same owner', owners);
        }


      }

      SELF.blackTurf = {};
      SELF.whiteTurf = {};

      for (var ___idx in finalEmptyCoords) {
        var ___x = parseInt(finalEmptyCoords[___idx].x);
        var ___y = parseInt(finalEmptyCoords[___idx].y);
        if (finalEmptyCoords[___idx].forPlayer === 0) {
          SELF.blackTurf[___x + ',' + ___y] = 1;
        } else if (finalEmptyCoords[___idx].forPlayer === 1) {
          SELF.whiteTurf[___x + ',' + ___y] = 1;
        }
      }


      SELF.dataChangedCallback();

      return [
        turfFor0, turfFor1
      ];

    };

    SELF.toggleTurfCount = function() {

      SELF.turfIsVisible = !SELF.turfIsVisible;

      if (SELF.turfIsVisible) {
        SELF.attemptToCalculateAndAssignScores();
      } else {
        SELF.dataChangedCallback();
      }

    };

    SELF.init = function() {

      SELF.boardStruct = SELF.createEmptyBoardStruct();

      SELF.blackPrisoners = 0;
      SELF.whitePrisoners = 0;
      SELF.currentPlayer = 0;
      SELF.lastPosition = {};

      SELF.playedPositions = [];
      SELF.lastPrisonersTaken = [];

      SELF.whiteTurf = 0;
      SELF.blackTurf = 0;

      SELF.movers = {};

      if (!SELF.initted) {

        window.onblur = SELF.handleOnBlur;
        window.onfocus = SELF.handleOnFocus;

      }

      SELF.initted = true;

    };

    SELF.init();

    return SELF;
  };

  window.CREATE_GO = CREATE_GO;

}());