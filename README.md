# Chess Game Analyzer

A professional chess game analysis tool with a visual board interface, powered entirely by Stockfish engine analysis with intelligent move explanations.

## ✨ Key Features

### 🎯 **Visual Chess Board Interface**
- **Interactive Chessboard**: Professional chessboard.js integration with piece animations
- **Real-time Position Display**: See every position as you navigate through the game
- **Move Highlighting**: Visual indicators for current move and position
- **Responsive Design**: Works perfectly on desktop and mobile devices

### 📊 **Comprehensive Analysis**
- **Stockfish Engine Integration**: Deep position analysis with best move suggestions
- **Intelligent Move Classification**: Categorizes moves as brilliant, good, inaccuracy, mistake, or blunder
- **Evaluation Bar**: Visual representation of position advantage
- **Move Quality Scoring**: Precise evaluation of each move's impact

### 🧠 **Smart Explanations (No AI Required)**
- **Stockfish-Powered Analysis**: Human-readable explanations generated from engine data
- **Move Context**: Explains captures, checks, castling, and tactical themes
- **Strategic Insights**: Piece activity, king safety, and positional considerations
- **Alternative Suggestions**: Shows better moves when mistakes are made

### 🎮 **Advanced Navigation**
- **Click-to-Navigate**: Click any move to jump to that position
- **Keyboard Shortcuts**: Arrow keys, Home/End for quick navigation
- **Position Browser**: Previous/Next controls with disabled state indicators
- **Move List Integration**: Synchronized highlighting between board and move list

### 📁 **Flexible Input Options**
- **Drag & Drop Upload**: Simple PGN file uploading
- **Text Input Modal**: Paste PGN text directly with validation
- **Sample Games**: Built-in famous games for testing
- **Format Validation**: Comprehensive PGN format checking with error details

### 🎨 **Professional UI/UX**
- **Dark Theme**: Modern, eye-friendly interface design
- **Sidebar Analysis**: Dedicated analysis panel with evaluation metrics
- **Player Information**: ELO ratings, game metadata display
- **Responsive Layout**: Adapts to different screen sizes seamlessly

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** or yarn
- **Stockfish chess engine** (required for analysis)

### Installing Stockfish

**macOS:**
```bash
brew install stockfish
```

**Ubuntu/Debian:**
```bash
sudo apt-get install stockfish
```

**Windows:**
Download from [Stockfish website](https://stockfishchess.org/download/) and add to PATH.

## Quick Start

1. **Clone and setup:**
   ```bash
   cd chess-analyzer
   npm install
   ```

2. **Ready to use:**
   ```bash
   # No additional configuration needed!
   # Stockfish analysis works out of the box
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`

## 🚀 How to Use

### 1️⃣ **Load a Game**
- **Drag & Drop**: Drop a `.pgn` file onto the upload area
- **Browse Files**: Click "📁 Upload PGN" to select a file
- **Paste Text**: Click "📝 Paste PGN" to enter PGN text directly
- **Try Sample**: Click "🎯 Load Sample" for a Fischer vs Spassky game

### 2️⃣ **Navigate the Game**
- **Click Moves**: Click any move in the move list to jump to that position
- **Use Controls**: Previous ◀️ / Next ▶️ buttons to step through moves
- **Keyboard**: Use arrow keys, Home/End for quick navigation
- **Visual Board**: Watch pieces animate as you navigate positions

### 3️⃣ **Analyze Positions**
- **Automatic Analysis**: Stockfish analyzes the entire game automatically
- **Evaluation Bar**: See position advantage with visual evaluation bar
- **Best Moves**: View engine's suggested best move for each position
- **Move Quality**: See if moves are brilliant, good, inaccurate, or blunders
- **Explanations**: Read detailed explanations of each move's impact

### 4️⃣ **Understand the Interface**
- **Left Sidebar**: Game info, position analysis, navigation, and move list
- **Center Board**: Interactive chess board showing current position
- **Player Names**: See player names and ELO ratings above/below board
- **Evaluation**: Green bar = good for White, Red = good for Black

## 🔧 API Endpoints

### Game Analysis
```bash
# Analyze entire game
POST /api/analyze-game
Content-Type: application/json
{
  "pgnText": "[Event \"Sample\"] ... 1.e4 e5 2.Nf3 1-0"
}

# Analyze single position  
POST /api/analyze-position
Content-Type: application/json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "depth": 12
}
```

### File Operations
```bash
# Upload PGN file
POST /api/upload-pgn
Content-Type: multipart/form-data

# Parse PGN text
POST /api/parse-pgn
Content-Type: application/json
{
  "pgnText": "..."
}

# Validate PGN format
POST /api/validate-pgn
Content-Type: application/json
{
  "pgnText": "..."
}
```

### System Status
```bash
# Check Stockfish availability
GET /api/test-stockfish

# Health check
GET /api/health
```

## ⚙️ Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Move Quality Classifications

- 🟣 **Brilliant**: Spectacular sacrifices or tactical shots
- 🟢 **Best/Great**: Optimal or near-optimal moves  
- 🔵 **Good**: Solid moves that maintain position
- 🟡 **Inaccuracy**: Minor mistakes (loses 0.1-0.5 pawns)
- 🟠 **Mistake**: Clear errors (loses 0.5-1.0 pawns)
- 🔴 **Blunder**: Major mistakes (loses 1.0+ pawns)

### Technical Specifications

- **File Size Limit**: 5MB for PGN uploads
- **Supported Formats**: `.pgn` files and text input
- **Analysis Depth**: 12-15 moves deep per position
- **Engine Timeout**: 5 seconds per position analysis
- **Supported Browsers**: Chrome, Firefox, Safari, Edge (latest versions)

## Development

### Hot Reload
```bash
npm run dev
```

### Production
```bash
npm start
```

### Project Structure
```
chess-analyzer/
├── server.js              # Express server and API endpoints
├── package.json           # Dependencies and scripts
├── public/                # Frontend files
│   ├── index.html         # Main HTML page
│   ├── styles.css         # CSS styles
│   └── script.js          # Frontend JavaScript
├── logs/                  # Log files (auto-created)
├── uploads/               # Temporary file uploads (auto-created)
└── .env                   # Environment variables
```

## Troubleshooting

### Stockfish Issues
```bash
# Test if Stockfish is available
stockfish
# Should start the Stockfish engine

# On macOS with Homebrew
brew install stockfish

# On Ubuntu/Debian  
sudo apt-get install stockfish

# Check via API
curl http://localhost:3000/api/test-stockfish
```

### Analysis Problems
- **Slow Analysis**: Reduce depth in analysis settings
- **No Analysis**: Ensure Stockfish is installed and in PATH
- **Memory Issues**: Restart server between large game analyses

### File Upload Issues
- **Format Errors**: Ensure valid PGN format with proper headers
- **Size Limits**: Keep files under 5MB
- **Parsing Errors**: Check for special characters in PGN text

## License

MIT License - see LICENSE file for details.