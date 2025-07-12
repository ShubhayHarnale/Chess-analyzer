const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Chess } = require('chess.js');
const winston = require('winston');
const PGNParser = require('./lib/pgnParser');
const StockfishAnalyzer = require('./lib/stockfishAnalyzer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const pgnParser = new PGNParser();
const stockfishAnalyzer = new StockfishAnalyzer();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'chess-analyzer' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/octet-stream' || 
        file.originalname.toLowerCase().endsWith('.pgn')) {
      cb(null, true);
    } else {
      cb(new Error('Only PGN files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/upload-pgn', upload.single('pgnFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const pgnContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse PGN using enhanced parser
    const parseResult = pgnParser.parsePGN(pgnContent);
    
    if (!parseResult.success) {
      logger.error('PGN parsing error:', parseResult.error);
      return res.status(400).json({
        error: parseResult.error,
        details: parseResult.details
      });
    }

    logger.info(`PGN file uploaded and parsed successfully: ${req.file.originalname}`);
    
    res.json({
      success: true,
      message: 'PGN file uploaded and parsed successfully',
      filename: req.file.originalname,
      data: parseResult.data
    });
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// New endpoint for comprehensive game analysis
app.post('/api/analyze-game', async (req, res) => {
  try {
    const { pgnText } = req.body;
    
    if (!pgnText) {
      return res.status(400).json({ error: 'PGN text is required' });
    }

    logger.info('Starting comprehensive game analysis');
    
    try {
      const analysis = await stockfishAnalyzer.analyzeGame(pgnText);
      
      res.json({
        success: true,
        analysis: analysis,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Game analysis failed:', error);
      res.status(500).json({ 
        success: false,
        error: 'Stockfish analysis failed. Please ensure Stockfish is installed and accessible.' 
      });
    }

  } catch (error) {
    logger.error('Analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Analysis failed' 
    });
  }
});

// Single position analysis endpoint
app.post('/api/analyze-position', async (req, res) => {
  try {
    const { fen, depth = 12 } = req.body;
    
    if (!fen) {
      return res.status(400).json({ error: 'FEN position required' });
    }

    logger.info('Starting position analysis');
    
    try {
      const analysis = await stockfishAnalyzer.analyzePosition(fen, depth, 5000);
      
      res.json({
        success: true,
        bestMove: analysis.bestMove,
        evaluation: stockfishAnalyzer.formatEvaluation(analysis.evaluation),
        depth: analysis.depth,
        nodes: analysis.nodes,
        nps: analysis.nps,
        principalVariation: analysis.principalVariation,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Position analysis failed:', error);
      res.status(500).json({ 
        success: false,
        error: 'Stockfish analysis failed. Please ensure Stockfish is installed and accessible.' 
      });
    }

  } catch (error) {
    logger.error('Analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Analysis failed' 
    });
  }
});

// New endpoint for parsing PGN text directly
app.post('/api/parse-pgn', (req, res) => {
  try {
    const { pgnText } = req.body;
    
    if (!pgnText) {
      return res.status(400).json({ error: 'PGN text is required' });
    }

    logger.info('Parsing PGN text directly');
    
    // Parse PGN using enhanced parser
    const parseResult = pgnParser.parsePGN(pgnText);
    
    if (!parseResult.success) {
      logger.error('PGN text parsing error:', parseResult.error);
      return res.status(400).json({
        error: parseResult.error,
        details: parseResult.details
      });
    }

    logger.info('PGN text parsed successfully');
    
    res.json({
      success: true,
      message: 'PGN text parsed successfully',
      data: parseResult.data
    });
    
  } catch (error) {
    logger.error('PGN text parsing error:', error);
    res.status(500).json({ error: 'Failed to parse PGN text' });
  }
});

// Endpoint to get position at specific move
app.post('/api/position-at-move', (req, res) => {
  try {
    const { pgnText, moveNumber } = req.body;
    
    if (!pgnText) {
      return res.status(400).json({ error: 'PGN text is required' });
    }
    
    if (typeof moveNumber !== 'number' || moveNumber < 0) {
      return res.status(400).json({ error: 'Valid move number is required' });
    }

    logger.info(`Getting position at move ${moveNumber}`);
    
    const position = pgnParser.getPositionAtMove(pgnText, moveNumber);
    
    res.json({
      success: true,
      position: position
    });
    
  } catch (error) {
    logger.error('Position extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to validate PGN without full parsing
app.post('/api/validate-pgn', (req, res) => {
  try {
    const { pgnText } = req.body;
    
    if (!pgnText) {
      return res.status(400).json({ error: 'PGN text is required' });
    }

    logger.info('Validating PGN text');
    
    const validation = pgnParser.validatePGN(pgnText);
    
    res.json({
      valid: validation.valid,
      error: validation.error || null
    });
    
  } catch (error) {
    logger.error('PGN validation error:', error);
    res.status(500).json({ error: 'Failed to validate PGN' });
  }
});

// Test Stockfish availability
app.get('/api/test-stockfish', async (req, res) => {
  try {
    logger.info('Testing Stockfish availability...');
    
    const testAnalysis = await stockfishAnalyzer.analyzePosition(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
      5, 
      1000
    );
    
    res.json({
      available: true,
      message: 'Stockfish is working correctly',
      testResult: {
        bestMove: testAnalysis.bestMove,
        evaluation: stockfishAnalyzer.formatEvaluation(testAnalysis.evaluation),
        depth: testAnalysis.depth
      }
    });

  } catch (error) {
    logger.error('Stockfish test error:', error);
    res.json({
      available: false,
      message: error.message,
      suggestion: 'Please install Stockfish and ensure it\'s available in your system PATH'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  // Stop Stockfish analyzer
  stockfishAnalyzer.stop();
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  logger.info(`Chess analyzer server running on port ${PORT}`);
  console.log(`Server running at http://localhost:${PORT}`);
});