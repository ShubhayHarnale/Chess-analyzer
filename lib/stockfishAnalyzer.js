const { Chess } = require('chess.js');
const { spawn } = require('child_process');

class StockfishAnalyzer {
  constructor() {
    this.stockfish = null;
    this.isReady = false;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.stockfish = spawn('stockfish');
        
        let isReadyReceived = false;
        
        this.stockfish.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('readyok') && !isReadyReceived) {
            isReadyReceived = true;
            this.isReady = true;
            resolve();
          }
        });

        this.stockfish.stderr.on('data', (data) => {
          console.error('Stockfish error:', data.toString());
        });

        this.stockfish.on('error', (error) => {
          reject(new Error(`Failed to start Stockfish: ${error.message}`));
        });

        // Initialize Stockfish
        this.stockfish.stdin.write('uci\n');
        this.stockfish.stdin.write('isready\n');

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!isReadyReceived) {
            reject(new Error('Stockfish initialization timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(new Error(`Stockfish not available: ${error.message}`));
      }
    });
  }

  async analyzePosition(fen, depth = 15, timeLimit = 5000) {
    if (!this.isReady) {
      await this.start();
    }

    return new Promise((resolve, reject) => {
      let bestMove = '';
      let evaluation = null;
      let principalVariation = [];
      let depthReached = 0;
      let nodes = 0;
      let nps = 0;
      
      const timeout = setTimeout(() => {
        reject(new Error('Analysis timeout'));
      }, timeLimit + 2000);

      const dataHandler = (data) => {
        const output = data.toString();
        const lines = output.split('\n');
        
        for (const line of lines) {
          if (line.includes('info depth')) {
            const depthMatch = line.match(/depth (\d+)/);
            if (depthMatch) {
              depthReached = parseInt(depthMatch[1]);
            }

            const nodesMatch = line.match(/nodes (\d+)/);
            if (nodesMatch) {
              nodes = parseInt(nodesMatch[1]);
            }

            const npsMatch = line.match(/nps (\d+)/);
            if (npsMatch) {
              nps = parseInt(npsMatch[1]);
            }

            const pvMatch = line.match(/pv (.+)$/);
            if (pvMatch) {
              principalVariation = pvMatch[1].trim().split(' ');
            }

            if (line.includes('score cp')) {
              const match = line.match(/score cp (-?\d+)/);
              if (match) {
                evaluation = {
                  type: 'centipawn',
                  value: parseInt(match[1])
                };
              }
            } else if (line.includes('score mate')) {
              const match = line.match(/score mate (-?\d+)/);
              if (match) {
                evaluation = {
                  type: 'mate',
                  value: parseInt(match[1])
                };
              }
            }
          }
          
          if (line.includes('bestmove')) {
            bestMove = line.split(' ')[1];
            
            this.stockfish.stdout.removeListener('data', dataHandler);
            clearTimeout(timeout);
            
            resolve({
              bestMove,
              evaluation,
              depth: depthReached,
              principalVariation,
              nodes,
              nps,
              timeMs: timeLimit
            });
            return;
          }
        }
      };

      this.stockfish.stdout.on('data', dataHandler);
      
      // Send analysis commands
      this.stockfish.stdin.write(`position fen ${fen}\n`);
      this.stockfish.stdin.write(`go depth ${depth} movetime ${timeLimit}\n`);
    });
  }

  async analyzeGame(pgnText, userPlayer = 'white') {
    const chess = new Chess();
    chess.loadPgn(pgnText);
    
    const moves = chess.history({ verbose: true });
    
    const positions = [];
    const analysis = [];
    
    // Reset and replay game to get all positions
    chess.reset();
    positions.push(chess.fen());
    
    for (const move of moves) {
      chess.move(move);
      positions.push(chess.fen());
    }

    // Analyze each position
    for (let i = 0; i < positions.length - 1; i++) {
      const currentFen = positions[i];
      const nextFen = positions[i + 1];
      const moveIndex = i;
      
      try {
        // Analyze current position to get best move
        const currentAnalysis = await this.analyzePosition(currentFen, 12, 3000);
        
        // Analyze position after the move was played
        const nextAnalysis = await this.analyzePosition(nextFen, 12, 3000);
        
        // Determine if this is a user move
        const moveColor = moves[moveIndex].color;
        const isUserMove = (userPlayer === 'white' && moveColor === 'w') || 
                          (userPlayer === 'black' && moveColor === 'b');
        
        // Calculate detailed move quality only for user moves
        let moveQuality, explanation;
        if (isUserMove) {
          moveQuality = this.evaluateMoveQuality(
            currentAnalysis,
            nextAnalysis,
            moves[moveIndex]
          );
          explanation = this.generateMoveExplanation(
            currentAnalysis,
            nextAnalysis,
            moves[moveIndex],
            moveQuality
          );
        } else {
          // Basic info for opponent moves
          moveQuality = { classification: 'opponent', score: 0 };
          explanation = `Opponent played ${moves[moveIndex].san}`;
        }
        
        analysis.push({
          moveIndex,
          move: moves[moveIndex],
          beforePosition: currentFen,
          afterPosition: nextFen,
          bestMove: isUserMove ? currentAnalysis.bestMove : null, // Only show best move for user moves
          actualMove: moves[moveIndex].san,
          evaluation: {
            before: currentAnalysis.evaluation,
            after: nextAnalysis.evaluation
          },
          moveQuality,
          explanation,
          isUserMove
        });
        
      } catch (error) {
        console.error(`Analysis failed for move ${i}:`, error);
        analysis.push({
          moveIndex,
          move: moves[moveIndex],
          error: error.message
        });
      }
    }

    return analysis;
  }

  evaluateMoveQuality(beforeAnalysis, afterAnalysis, move) {
    if (!beforeAnalysis.evaluation || !afterAnalysis.evaluation) {
      return { classification: 'unknown', score: 0 };
    }

    // Calculate evaluation drop from the moving player's perspective
    // Both evaluations should be from the same perspective (the moving player)
    const isWhiteMove = move.color === 'w';
    const beforeEval = this.evaluationToCentipawns(beforeAnalysis.evaluation, isWhiteMove);
    const afterEval = this.evaluationToCentipawns(afterAnalysis.evaluation, isWhiteMove);
    
    const evalDrop = beforeEval - afterEval;
    
    // Check if best move was played
    const playedBestMove = move.san === beforeAnalysis.bestMove || 
                          move.from + move.to === beforeAnalysis.bestMove ||
                          move.from + move.to + (move.promotion || '') === beforeAnalysis.bestMove;

    let classification;
    let score = evalDrop;

    if (playedBestMove) {
      classification = 'best';
    } else if (evalDrop < 10) {
      classification = 'excellent';
    } else if (evalDrop < 25) {
      classification = 'good';
    } else if (evalDrop < 50) {
      classification = 'inaccuracy';
    } else if (evalDrop < 100) {
      classification = 'mistake';
    } else {
      classification = 'blunder';
    }

    // Special cases
    if (beforeAnalysis.evaluation.type === 'mate' && move.san.includes('#')) {
      classification = 'brilliant';
    }
    
    if (move.san.includes('+') && evalDrop < 50) {
      classification = 'good'; // Checks are often good
    }

    return { classification, score: Math.round(score) };
  }

  getRawCentipawns(evaluation) {
    // Returns raw centipawn value from Stockfish (always from White's perspective)
    if (evaluation.type === 'mate') {
      return evaluation.value > 0 ? 10000 : -10000;
    } else {
      return evaluation.value;
    }
  }

  evaluationToCentipawns(evaluation, whiteToMove) {
    if (evaluation.type === 'mate') {
      const mateValue = evaluation.value > 0 ? 10000 : -10000;
      return whiteToMove ? mateValue : -mateValue;
    } else {
      return whiteToMove ? evaluation.value : -evaluation.value;
    }
  }

  generateMoveExplanation(beforeAnalysis, afterAnalysis, move, moveQuality) {
    const explanations = [];

    // Move quality assessment
    switch (moveQuality.classification) {
      case 'brilliant':
        explanations.push('Brilliant move! A spectacular sacrifice or tactical shot.');
        break;
      case 'best':
        explanations.push('Perfect! This is the best move in the position.');
        break;
      case 'excellent':
        explanations.push('Excellent move, practically as good as the best.');
        break;
      case 'good':
        explanations.push('Good move that maintains the position.');
        break;
      case 'inaccuracy':
        explanations.push(`Inaccuracy. Loses about ${moveQuality.score/100} pawns of advantage.`);
        break;
      case 'mistake':
        explanations.push(`Mistake! This loses ${moveQuality.score/100} pawns.`);
        break;
      case 'blunder':
        explanations.push(`Blunder!! This throws away ${moveQuality.score/100} pawns.`);
        break;
    }

    // Move type analysis
    if (move.captured) {
      explanations.push(`Captures the ${move.captured} on ${move.to}.`);
    }

    if (move.san.includes('O-O-O')) {
      explanations.push('Castles queenside, bringing the king to safety.');
    } else if (move.san.includes('O-O')) {
      explanations.push('Castles kingside, securing the king.');
    }

    if (move.san.includes('+')) {
      explanations.push('Gives check, forcing the opponent to respond.');
    }

    if (move.san.includes('#')) {
      explanations.push('Checkmate! The game is over.');
    }

    if (move.promotion) {
      explanations.push(`Promotes to a ${move.promotion}, gaining material.`);
    }

    // Position evaluation context
    if (beforeAnalysis.evaluation && afterAnalysis.evaluation) {
      const beforeEval = beforeAnalysis.evaluation;
      const afterEval = afterAnalysis.evaluation;

      if (beforeEval.type === 'centipawn' && afterEval.type === 'centipawn') {
        const evalChange = Math.abs(beforeEval.value - afterEval.value);
        if (evalChange > 100) {
          explanations.push('This significantly changes the evaluation.');
        }
      }

      if (beforeEval.type === 'mate' || afterEval.type === 'mate') {
        explanations.push('Forces or allows a mating sequence.');
      }
    }

    // Strategic hints based on piece moved
    switch (move.piece) {
      case 'p':
        if (move.to[1] === '7' || move.to[1] === '2') {
          explanations.push('Advances the pawn towards promotion.');
        }
        break;
      case 'n':
        explanations.push('Develops or repositions the knight.');
        break;
      case 'b':
        explanations.push('The bishop controls important diagonal squares.');
        break;
      case 'r':
        explanations.push('The rook takes control of important files or ranks.');
        break;
      case 'q':
        explanations.push('The queen exerts powerful influence on the position.');
        break;
      case 'k':
        if (!move.san.includes('O')) {
          explanations.push('King move - possibly for safety or activity.');
        }
        break;
    }

    // Alternative move suggestion
    if (beforeAnalysis.bestMove && beforeAnalysis.bestMove !== move.san && moveQuality.score > 25) {
      explanations.push(`Better was ${beforeAnalysis.bestMove}.`);
    }

    return explanations.join(' ');
  }

  formatEvaluation(evaluation) {
    if (!evaluation) return '0.00';
    
    if (evaluation.type === 'mate') {
      return evaluation.value > 0 ? `+M${Math.abs(evaluation.value)}` : `-M${Math.abs(evaluation.value)}`;
    } else {
      return (evaluation.value / 100).toFixed(2);
    }
  }

  stop() {
    if (this.stockfish) {
      this.stockfish.kill();
      this.stockfish = null;
      this.isReady = false;
    }
  }
}

module.exports = StockfishAnalyzer;