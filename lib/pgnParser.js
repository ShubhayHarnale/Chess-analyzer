const { Chess } = require('chess.js');

class PGNParser {
  constructor() {
    this.chess = new Chess();
  }

  /**
   * Parse a PGN string and extract comprehensive game data
   * @param {string} pgnText - Raw PGN text
   * @returns {Object} Parsed game data with positions, moves, and metadata
   */
  parsePGN(pgnText) {
    try {
      // Reset chess instance
      this.chess.reset();
      
      // Validate and load PGN
      const isValid = this.validatePGN(pgnText);
      if (!isValid.valid) {
        throw new Error(`Invalid PGN: ${isValid.error}`);
      }

      // Load the PGN
      this.chess.loadPgn(pgnText);
      
      // Extract all game data
      const gameData = {
        header: this.chess.header(),
        moves: this.extractMoves(),
        positions: this.extractAllPositions(pgnText),
        gameInfo: this.extractGameInfo(),
        statistics: this.calculateStatistics(),
        result: this.chess.header().Result || '*',
        isGameOver: this.chess.isGameOver(),
        gameOverReason: this.getGameOverReason()
      };

      return {
        success: true,
        data: gameData
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: this.diagnoseError(pgnText, error)
      };
    }
  }

  /**
   * Validate PGN format and structure
   * @param {string} pgnText - PGN text to validate
   * @returns {Object} Validation result
   */
  validatePGN(pgnText) {
    if (!pgnText || typeof pgnText !== 'string') {
      return { valid: false, error: 'PGN text is required and must be a string' };
    }

    // Trim whitespace
    pgnText = pgnText.trim();
    
    if (pgnText.length === 0) {
      return { valid: false, error: 'PGN text cannot be empty' };
    }

    // Check for basic PGN structure
    const hasValidStructure = this.checkPGNStructure(pgnText);
    if (!hasValidStructure.valid) {
      return hasValidStructure;
    }

    // Test with chess.js
    try {
      const testChess = new Chess();
      testChess.loadPgn(pgnText);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `Chess.js validation failed: ${error.message}` 
      };
    }
  }

  /**
   * Check basic PGN structure requirements
   * @param {string} pgnText - PGN text
   * @returns {Object} Structure validation result
   */
  checkPGNStructure(pgnText) {
    // Check for required elements
    const lines = pgnText.split('\n');
    let hasHeaders = false;
    let hasMoves = false;
    let hasResult = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for header tags
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        hasHeaders = true;
      }
      
      // Check for moves (simple pattern)
      if (/^\s*\d+\./.test(trimmedLine) || /^[a-h1-8NBRQK+#=\-O]+/.test(trimmedLine)) {
        hasMoves = true;
      }
      
      // Check for game result
      if (/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(trimmedLine)) {
        hasResult = true;
      }
    }

    if (!hasHeaders) {
      return { valid: false, error: 'PGN must contain header information in [Tag "Value"] format' };
    }

    if (!hasMoves && !hasResult) {
      return { valid: false, error: 'PGN must contain either moves or a result' };
    }

    return { valid: true };
  }

  /**
   * Extract all moves with additional metadata
   * @returns {Array} Array of move objects
   */
  extractMoves() {
    const moves = [];
    const history = this.chess.history({ verbose: true });
    
    history.forEach((move, index) => {
      moves.push({
        moveNumber: Math.floor(index / 2) + 1,
        color: move.color,
        san: move.san,
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured || null,
        promotion: move.promotion || null,
        flags: move.flags,
        check: move.san.includes('+'),
        checkmate: move.san.includes('#'),
        fen: null // Will be populated by extractAllPositions
      });
    });

    return moves;
  }

  /**
   * Extract all positions (FEN strings) from the game
   * @param {string} pgnText - Original PGN text
   * @returns {Array} Array of position objects
   */
  extractAllPositions(pgnText) {
    const positions = [];
    const tempChess = new Chess();
    
    try {
      // Reset and load PGN
      tempChess.reset();
      tempChess.loadPgn(pgnText);
      
      // Get starting position
      tempChess.reset();
      positions.push({
        moveNumber: 0,
        fen: tempChess.fen(),
        turn: 'w',
        position: 'starting'
      });

      // Replay game and capture each position
      const moves = tempChess.history();
      tempChess.reset();
      
      // Load PGN again to get all moves
      tempChess.loadPgn(pgnText);
      const allMoves = tempChess.history();
      tempChess.reset();
      
      allMoves.forEach((move, index) => {
        tempChess.move(move);
        positions.push({
          moveNumber: Math.floor(index / 2) + 1,
          halfMove: index + 1,
          fen: tempChess.fen(),
          turn: tempChess.turn(),
          lastMove: move,
          position: `after_${move}`,
          inCheck: tempChess.inCheck(),
          isCheckmate: tempChess.isCheckmate(),
          isStalemate: tempChess.isStalemate(),
          isDraw: tempChess.isDraw()
        });
      });

    } catch (error) {
      throw new Error(`Failed to extract positions: ${error.message}`);
    }

    return positions;
  }

  /**
   * Extract comprehensive game information
   * @returns {Object} Game information object
   */
  extractGameInfo() {
    const header = this.chess.header();
    const currentFen = this.chess.fen();
    
    return {
      players: {
        white: header.White || 'Unknown',
        black: header.Black || 'Unknown',
        whiteElo: header.WhiteElo || null,
        blackElo: header.BlackElo || null
      },
      event: {
        name: header.Event || 'Unknown',
        site: header.Site || 'Unknown',
        date: header.Date || 'Unknown',
        round: header.Round || 'Unknown'
      },
      gameState: {
        currentFen: currentFen,
        turn: this.chess.turn(),
        moveNumber: Math.floor(this.chess.history().length / 2) + 1,
        halfMoves: this.chess.history().length,
        isGameOver: this.chess.isGameOver(),
        inCheck: this.chess.inCheck(),
        isCheckmate: this.chess.isCheckmate(),
        isStalemate: this.chess.isStalemate(),
        isDraw: this.chess.isDraw(),
        isThreefoldRepetition: this.chess.isThreefoldRepetition(),
        isInsufficientMaterial: this.chess.isInsufficientMaterial()
      },
      timeControl: header.TimeControl || null,
      opening: {
        eco: header.ECO || null,
        name: header.Opening || null,
        variation: header.Variation || null
      }
    };
  }

  /**
   * Calculate game statistics
   * @returns {Object} Statistics object
   */
  calculateStatistics() {
    const moves = this.chess.history({ verbose: true });
    const stats = {
      totalMoves: moves.length,
      totalPlyCount: moves.length,
      capturesCount: 0,
      checksCount: 0,
      castlingCount: { white: 0, black: 0 },
      promotionsCount: 0,
      pieceActivity: {
        white: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 },
        black: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }
      }
    };

    moves.forEach(move => {
      // Count captures
      if (move.captured) {
        stats.capturesCount++;
      }

      // Count checks
      if (move.san.includes('+')) {
        stats.checksCount++;
      }

      // Count castling
      if (move.flags.includes('k') || move.flags.includes('q')) {
        stats.castlingCount[move.color === 'w' ? 'white' : 'black']++;
      }

      // Count promotions
      if (move.promotion) {
        stats.promotionsCount++;
      }

      // Track piece activity
      const color = move.color === 'w' ? 'white' : 'black';
      if (stats.pieceActivity[color][move.piece]) {
        stats.pieceActivity[color][move.piece]++;
      }
    });

    return stats;
  }

  /**
   * Determine the reason for game over
   * @returns {string|null} Game over reason
   */
  getGameOverReason() {
    if (!this.chess.isGameOver()) {
      return null;
    }

    if (this.chess.isCheckmate()) {
      return 'checkmate';
    }

    if (this.chess.isStalemate()) {
      return 'stalemate';
    }

    if (this.chess.isThreefoldRepetition()) {
      return 'threefold_repetition';
    }

    if (this.chess.isInsufficientMaterial()) {
      return 'insufficient_material';
    }

    if (this.chess.isDraw()) {
      return 'draw';
    }

    return 'unknown';
  }

  /**
   * Diagnose parsing errors for better error messages
   * @param {string} pgnText - Original PGN text
   * @param {Error} error - The error that occurred
   * @returns {Object} Diagnostic information
   */
  diagnoseError(pgnText, error) {
    const diagnosis = {
      errorType: error.name,
      possibleCauses: [],
      suggestions: []
    };

    const errorMessage = error.message.toLowerCase();

    // Common error patterns and suggestions
    if (errorMessage.includes('invalid move')) {
      diagnosis.possibleCauses.push('Invalid chess move notation');
      diagnosis.suggestions.push('Check move notation (e.g., e4, Nf3, O-O)');
      diagnosis.suggestions.push('Ensure moves are legal in the given position');
    }

    if (errorMessage.includes('invalid fen')) {
      diagnosis.possibleCauses.push('Invalid FEN string in PGN');
      diagnosis.suggestions.push('Check FEN tag format if present');
    }

    if (errorMessage.includes('header')) {
      diagnosis.possibleCauses.push('Malformed PGN headers');
      diagnosis.suggestions.push('Ensure headers are in [Tag "Value"] format');
    }

    if (pgnText.length < 50) {
      diagnosis.possibleCauses.push('PGN appears to be incomplete');
      diagnosis.suggestions.push('Ensure complete PGN with headers and moves');
    }

    return diagnosis;
  }

  /**
   * Get a specific position by move number
   * @param {string} pgnText - PGN text
   * @param {number} moveNumber - Move number to get position after
   * @returns {Object} Position data
   */
  getPositionAtMove(pgnText, moveNumber) {
    try {
      const tempChess = new Chess();
      tempChess.loadPgn(pgnText);
      
      const moves = tempChess.history();
      tempChess.reset();
      
      // Play moves up to the specified move number
      const targetMoveIndex = Math.min(moveNumber * 2 - 1, moves.length - 1);
      
      for (let i = 0; i <= targetMoveIndex; i++) {
        tempChess.move(moves[i]);
      }
      
      return {
        fen: tempChess.fen(),
        turn: tempChess.turn(),
        moveNumber: Math.floor(targetMoveIndex / 2) + 1,
        lastMove: moves[targetMoveIndex],
        inCheck: tempChess.inCheck(),
        possibleMoves: tempChess.moves()
      };
      
    } catch (error) {
      throw new Error(`Failed to get position at move ${moveNumber}: ${error.message}`);
    }
  }
}

module.exports = PGNParser;