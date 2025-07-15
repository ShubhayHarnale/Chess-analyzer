class ChessAnalyzer {
    constructor() {
        this.board = null;
        this.game = null;
        this.currentGameData = null;
        this.currentPositionIndex = 0;
        this.gamePositions = [];
        this.gameAnalysis = [];
        this.isAnalyzing = false;
        this.showingBestMove = false;
        this.originalPositionIndex = null; // Store original position when showing best move
        this.isInteractiveMode = false; // Track if user is exploring alternatives
        this.originalGameFen = null; // Store original position FEN for reset
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeBoard();
        this.showWelcomeState();
        this.initializeAIChat();
    }

    initializeElements() {
        // Header buttons
        this.uploadFileBtn = document.getElementById('uploadFileBtn');
        this.pasteTextBtn = document.getElementById('pasteTextBtn');
        this.loadSampleBtn = document.getElementById('loadSampleBtn');

        // Modals
        this.uploadModal = document.getElementById('uploadModal');
        this.pasteModal = document.getElementById('pasteModal');
        this.closeUploadModal = document.getElementById('closeUploadModal');
        this.closePasteModal = document.getElementById('closePasteModal');

        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');

        // Paste elements
        this.pgnTextInput = document.getElementById('pgnTextInput');
        this.validatePgnBtn = document.getElementById('validatePgnBtn');
        this.parsePgnBtn = document.getElementById('parsePgnBtn');

        // Game info
        this.gameInfoContent = document.getElementById('gameInfoContent');
        this.blackPlayerName = document.getElementById('blackPlayerName');
        this.blackPlayerElo = document.getElementById('blackPlayerElo');
        this.whitePlayerName = document.getElementById('whitePlayerName');
        this.whitePlayerElo = document.getElementById('whitePlayerElo');

        // Analysis elements
        this.evalBar = document.getElementById('evalBar');
        this.evalScore = document.getElementById('evalScore');
        this.actualMoveDisplay = document.getElementById('actualMoveDisplay');
        this.bestMoveDisplay = document.getElementById('bestMoveDisplay');
        this.toggleMoveBtn = document.getElementById('toggleMoveBtn');
        this.bestMoveHighlight = document.getElementById('bestMoveHighlight');
        this.bestMoveNotation = document.getElementById('bestMoveNotation');
        this.bestMoveDescription = document.getElementById('bestMoveDescription');
        this.positionExplanation = document.getElementById('positionExplanation');
        this.moveClassification = document.getElementById('moveClassification');

        // Navigation
        this.firstMoveBtn = document.getElementById('firstMoveBtn');
        this.prevMoveBtn = document.getElementById('prevMoveBtn');
        this.nextMoveBtn = document.getElementById('nextMoveBtn');
        this.lastMoveBtn = document.getElementById('lastMoveBtn');
        this.currentPositionInfo = document.getElementById('currentPositionInfo');

        // Move list
        this.movesList = document.getElementById('movesList');

        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.chatSendBtn = document.getElementById('chatSendBtn');
        this.chatStatus = document.getElementById('chatStatus');
        this.chatStatusText = document.getElementById('chatStatusText');

        // Interactive board elements
        this.resetBoardBtn = document.getElementById('resetBoardBtn');
        this.interactiveStatus = document.getElementById('interactiveStatus');
        this.interactiveStatusText = document.getElementById('interactiveStatusText');

        // Loading and messages
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = document.getElementById('loadingText');
        this.messageContainer = document.getElementById('messageContainer');
    }

    attachEventListeners() {
        // Header buttons
        this.uploadFileBtn.addEventListener('click', () => this.showUploadModal());
        this.pasteTextBtn.addEventListener('click', () => this.showPasteModal());
        this.loadSampleBtn.addEventListener('click', () => this.loadSampleGame());

        // Modal close buttons
        this.closeUploadModal.addEventListener('click', () => this.hideUploadModal());
        this.closePasteModal.addEventListener('click', () => this.hidePasteModal());

        // Click outside modal to close
        this.uploadModal.addEventListener('click', (e) => {
            if (e.target === this.uploadModal) this.hideUploadModal();
        });
        this.pasteModal.addEventListener('click', (e) => {
            if (e.target === this.pasteModal) this.hidePasteModal();
        });

        // Upload area events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Paste modal buttons
        this.validatePgnBtn.addEventListener('click', () => this.validatePGNText());
        this.parsePgnBtn.addEventListener('click', () => this.parsePGNText());

        // Navigation buttons
        this.firstMoveBtn.addEventListener('click', () => this.navigateToPosition(0));
        this.prevMoveBtn.addEventListener('click', () => this.navigateToPosition(this.currentPositionIndex - 1));
        this.nextMoveBtn.addEventListener('click', () => this.navigateToPosition(this.currentPositionIndex + 1));
        this.lastMoveBtn.addEventListener('click', () => this.navigateToPosition(this.gamePositions.length - 1));

        // Move toggle button
        this.toggleMoveBtn.addEventListener('click', () => this.toggleMoveView());

        // Chat functionality
        this.chatSendBtn.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });

        // Interactive board functionality
        this.resetBoardBtn.addEventListener('click', () => this.resetToGamePosition());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    initializeBoard() {
        try {
            console.log('Initializing chess board...');
            console.log('Chessboard available:', typeof Chessboard !== 'undefined');
            console.log('Chess available:', typeof Chess !== 'undefined');
            console.log('jQuery available:', typeof $ !== 'undefined');
            
            const config = {
                pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
                position: 'start',
                showNotation: true,
                moveSpeed: 'fast',
                snapbackSpeed: 500,
                snapSpeed: 100,
                draggable: true,
                onDragStart: (source, piece, position, orientation) => this.onDragStart(source, piece, position, orientation),
                onDrop: (source, target) => this.onDrop(source, target),
                onSnapEnd: () => this.onSnapEnd()
            };

            // Check if required libraries are available
            if (typeof Chessboard === 'undefined') {
                console.error('Chessboard.js library not loaded');
                this.showMessage('Chessboard library not loaded. Please refresh the page.', 'error');
                return;
            }

            if (typeof Chess === 'undefined') {
                console.error('Chess.js library not loaded');
                this.showMessage('Chess library not loaded. Please refresh the page.', 'error');
                return;
            }

            this.board = Chessboard('chessBoard', config);
            console.log('Chessboard initialized:', this.board);
            
            this.game = new Chess();
            console.log('Chess game initialized:', this.game);
            
            // Make board responsive
            window.addEventListener('resize', () => {
                if (this.board) {
                    this.board.resize();
                }
            });
            
            console.log('Chess board initialized successfully');
            
        } catch (error) {
            console.error('Error initializing chess board:', error);
            this.showMessage('Failed to initialize chess board: ' + error.message, 'error');
        }
    }

    showWelcomeState() {
        this.board.position('start');
        this.updateNavigationButtons();
    }

    // Modal management
    showUploadModal() {
        this.uploadModal.classList.remove('hidden');
    }

    hideUploadModal() {
        this.uploadModal.classList.add('hidden');
    }

    showPasteModal() {
        this.pasteModal.classList.remove('hidden');
    }

    hidePasteModal() {
        this.pasteModal.classList.add('hidden');
    }

    // File upload handling
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.style.borderColor = '#764ba2';
        this.uploadArea.style.backgroundColor = '#2d3748';
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.style.borderColor = '#667eea';
        this.uploadArea.style.backgroundColor = '#1a202c';
    }

    handleDrop(e) {
        e.preventDefault();
        this.handleDragLeave(e);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        if (!file.name.toLowerCase().endsWith('.pgn')) {
            this.showMessage('Please select a valid PGN file.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showMessage('File size must be less than 5MB.', 'error');
            return;
        }

        this.hideUploadModal();
        this.showLoading('Processing PGN file...');

        const formData = new FormData();
        formData.append('pgnFile', file);

        try {
            const response = await fetch('/api/upload-pgn', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                await this.loadGameData(result.data);
                this.showMessage('PGN file loaded successfully!', 'success');
            } else {
                this.showMessage(result.error || 'Failed to upload file.', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('Network error. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // PGN text handling
    async validatePGNText() {
        const pgnText = this.pgnTextInput.value.trim();
        
        if (!pgnText) {
            this.showMessage('Please enter PGN text to validate.', 'error');
            return;
        }

        this.validatePgnBtn.disabled = true;
        this.validatePgnBtn.textContent = 'Validating...';

        try {
            const response = await fetch('/api/validate-pgn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pgnText })
            });

            const result = await response.json();

            if (result.valid) {
                this.showMessage('PGN format is valid!', 'success');
            } else {
                this.showMessage(`Invalid PGN: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showMessage('Failed to validate PGN text.', 'error');
        } finally {
            this.validatePgnBtn.disabled = false;
            this.validatePgnBtn.textContent = 'Validate PGN';
        }
    }

    async parsePGNText() {
        const pgnText = this.pgnTextInput.value.trim();
        
        if (!pgnText) {
            this.showMessage('Please enter PGN text to parse.', 'error');
            return;
        }

        this.hidePasteModal();
        this.showLoading('Parsing PGN text...');

        try {
            console.log('Sending PGN parse request:', { pgnText: pgnText.substring(0, 100) + '...' });
            
            const response = await fetch('/api/parse-pgn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pgnText })
            });

            console.log('Response received:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Parse result:', result);

            if (result.success) {
                await this.loadGameData(result.data);
                this.showMessage('PGN parsed successfully!', 'success');
            } else {
                console.error('Parse failed:', result.error);
                this.showMessage(result.error || 'Failed to parse PGN text.', 'error');
            }
        } catch (error) {
            console.error('Parse error details:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showMessage('Network connection error. Check server is running.', 'error');
            } else {
                this.showMessage(`Network error: ${error.message}`, 'error');
            }
        } finally {
            this.hideLoading();
        }
    }

    loadSampleGame() {
        const samplePGN = `[Event "World Championship Match"]
[Site "Reykjavik ISL"]
[Date "1972.07.23"]
[Round "6"]
[White "Fischer, Robert James"]
[Black "Spassky, Boris V"]
[Result "1-0"]
[WhiteElo "2785"]
[BlackElo "2660"]
[ECO "D59"]
[Opening "Queen's Gambit Declined: Tartakower Defense"]

1.c4 e6 2.Nf3 d5 3.d4 Nf6 4.Nc3 Be7 5.Bg5 O-O 6.e3 h6 7.Bh4 b6 8.cxd5 Nxd5 
9.Bxe7 Qxe7 10.Nxd5 exd5 11.Rc1 Be6 12.Qa4 c5 13.Qa3 Rc8 14.Bb5 a6 15.dxc5 bxc5 
16.O-O Ra7 17.Be2 Nd7 18.Nd4 Qf8 19.Nxe6 fxe6 20.e4 d4 21.f4 Qe7 22.e5 Rb8 
23.Bc4 Kh8 24.Qh3 Nf8 25.b3 a5 26.f5 exf5 27.Rxf5 Nh7 28.Rcf1 Qd8 29.Qg3 Re7 
30.h4 Rbb7 31.e6 Rbc7 32.Qe5 Qe8 33.a4 Qd8 34.R1f2 Qe8 35.R2f3 Qd8 36.Bd3 Qe8 
37.Qe4 Nf6 38.Rxf6 gxf6 39.Rxf6 Kg8 40.Bc4 Kh8 41.Qf4 1-0`;

        this.pgnTextInput.value = samplePGN;
        this.showPasteModal();
        this.showMessage('Sample game loaded! Click "Parse Game" to analyze.', 'success');
    }

    // Game data management
    async loadGameData(gameData) {
        try {
            console.log('Loading game data:', gameData);
            
            this.currentGameData = gameData;
            this.gamePositions = gameData.positions || [];
            this.currentPositionIndex = 0; // Start at beginning position

            // Display game information
            this.displayGameInfo(gameData.gameInfo);
            
            // Display move list
            this.displayMoveList(gameData.moves);
            
            // Set up board to starting position
            if (this.gamePositions.length > 0 && this.board && this.game) {
                const startingPosition = this.gamePositions[0];
                console.log('Setting board to starting position:', startingPosition.fen);
                this.board.position(startingPosition.fen);
                this.game.load(startingPosition.fen);
            }

            // Update UI
            this.updateNavigationButtons();
            this.updatePositionInfo();
            
            // Start analyzing the game
            this.startGameAnalysis();
            
        } catch (error) {
            console.error('Error loading game data:', error);
            this.showMessage('Failed to load game data: ' + error.message, 'error');
        }
    }

    displayGameInfo(gameInfo) {
        if (!gameInfo) return;

        const { players, event, gameState } = gameInfo;

        // Update player names and ELOs
        this.whitePlayerName.textContent = players?.white || 'White Player';
        this.blackPlayerName.textContent = players?.black || 'Black Player';
        
        if (players?.whiteElo) {
            this.whitePlayerElo.textContent = `(${players.whiteElo})`;
        } else {
            this.whitePlayerElo.textContent = '';
        }
        
        if (players?.blackElo) {
            this.blackPlayerElo.textContent = `(${players.blackElo})`;
        } else {
            this.blackPlayerElo.textContent = '';
        }

        // Update game info panel
        this.gameInfoContent.innerHTML = '';
        
        const infoItems = [
            { label: 'Event', value: event?.name || 'Unknown' },
            { label: 'Site', value: event?.site || 'Unknown' },
            { label: 'Date', value: event?.date || 'Unknown' },
            { label: 'Round', value: event?.round || 'Unknown' },
            { label: 'Result', value: gameInfo.header?.Result || 'Unknown' },
            { label: 'Total Moves', value: Math.floor((this.gamePositions.length - 1) / 2) + 1 }
        ];

        infoItems.forEach(item => {
            const infoItem = document.createElement('div');
            infoItem.className = 'game-info-item';
            infoItem.innerHTML = `
                <span class="game-info-label">${item.label}</span>
                <span class="game-info-value">${item.value}</span>
            `;
            this.gameInfoContent.appendChild(infoItem);
        });
    }

    displayMoveList(moves) {
        this.movesList.innerHTML = '';

        if (!moves || moves.length === 0) {
            this.movesList.innerHTML = '<p class="no-moves-msg">No moves to display</p>';
            return;
        }

        // Add starting position
        const startRow = document.createElement('div');
        startRow.className = 'move-row';
        startRow.dataset.positionIndex = '0';
        startRow.innerHTML = `
            <span class="move-number">Start</span>
            <span class="move-notation">Starting Position</span>
            <span class="move-evaluation">0.00</span>
        `;
        startRow.addEventListener('click', () => this.navigateToPosition(0));
        this.movesList.appendChild(startRow);

        // Add moves
        for (let i = 0; i < moves.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = moves[i];
            const blackMove = moves[i + 1];

            const moveRow = document.createElement('div');
            moveRow.className = 'move-row';
            moveRow.innerHTML = `
                <span class="move-number">${moveNumber}.</span>
                <span class="move-notation">
                    <span class="white-move" data-position-index="${i + 1}">${whiteMove?.san || ''}</span>
                    ${blackMove ? `<span class="black-move" data-position-index="${i + 2}">${blackMove.san}</span>` : ''}
                </span>
                <span class="move-evaluation" id="eval-${i + 1}">-</span>
            `;

            // Add click handlers for individual moves
            const whiteMoveSpan = moveRow.querySelector('.white-move');
            if (whiteMoveSpan) {
                whiteMoveSpan.addEventListener('click', () => this.navigateToPosition(i + 1));
            }

            const blackMoveSpan = moveRow.querySelector('.black-move');
            if (blackMoveSpan) {
                blackMoveSpan.addEventListener('click', () => this.navigateToPosition(i + 2));
            }

            this.movesList.appendChild(moveRow);
        }
    }

    // Navigation
    navigateToPosition(positionIndex) {
        if (positionIndex < 0 || positionIndex >= this.gamePositions.length) {
            return;
        }

        this.currentPositionIndex = positionIndex;
        const position = this.gamePositions[positionIndex];

        // Reset toggle state when navigating and clear highlights
        this.showingBestMove = false;
        this.hideBestMoveHighlight(); // This clears both the blue box and green arrow

        // Update board
        this.board.position(position.fen, true); // true for animation
        this.game.load(position.fen);

        // Update UI
        this.updateNavigationButtons();
        this.updatePositionInfo();
        this.highlightCurrentMove();
        this.updateAnalysisDisplay();
    }

    // Quiet navigation that doesn't reset best move state
    navigateToPositionQuiet(positionIndex) {
        if (positionIndex < 0 || positionIndex >= this.gamePositions.length) {
            return;
        }

        this.currentPositionIndex = positionIndex;
        const position = this.gamePositions[positionIndex];

        // Update board without resetting best move state
        this.board.position(position.fen, true); // true for animation
        this.game.load(position.fen);

        // Update UI (but don't reset toggle state)
        this.updateNavigationButtons();
        this.updatePositionInfo();
        // Don't call this.updateAnalysisDisplay() to avoid resetting the state
    }

    updateNavigationButtons() {
        this.firstMoveBtn.disabled = this.currentPositionIndex === 0;
        this.prevMoveBtn.disabled = this.currentPositionIndex === 0;
        this.nextMoveBtn.disabled = this.currentPositionIndex === this.gamePositions.length - 1;
        this.lastMoveBtn.disabled = this.currentPositionIndex === this.gamePositions.length - 1;
    }

    updatePositionInfo() {
        if (this.gamePositions.length === 0) {
            this.currentPositionInfo.textContent = 'No game loaded';
            return;
        }

        const position = this.gamePositions[this.currentPositionIndex];
        
        if (this.currentPositionIndex === 0) {
            this.currentPositionInfo.textContent = 'Starting Position';
        } else {
            const moveNumber = Math.floor(this.currentPositionIndex / 2) + 1;
            const isWhiteMove = this.currentPositionIndex % 2 === 1;
            const lastMove = position.lastMove || '';
            
            this.currentPositionInfo.textContent = 
                `Move ${moveNumber}${isWhiteMove ? '.' : '...'} ${lastMove}`;
        }
    }

    highlightCurrentMove() {
        // Remove previous highlights
        document.querySelectorAll('.move-row').forEach(row => {
            row.classList.remove('current');
        });

        document.querySelectorAll('.white-move, .black-move').forEach(move => {
            move.classList.remove('current');
        });

        // Highlight current move
        const currentElement = document.querySelector(`[data-position-index="${this.currentPositionIndex}"]`);
        if (currentElement) {
            if (currentElement.classList.contains('move-row')) {
                currentElement.classList.add('current');
            } else {
                currentElement.classList.add('current');
                currentElement.closest('.move-row').classList.add('current');
            }
        }
    }

    // Stockfish Analysis
    async startGameAnalysis() {
        if (this.isAnalyzing || !this.currentGameData) return;

        this.isAnalyzing = true;
        this.showLoading('Analyzing game with Stockfish...');

        try {
            // Get PGN text from current game data
            const pgnText = this.reconstructPGN();
            console.log('Reconstructed PGN for analysis:', pgnText);
            
            if (!pgnText.trim()) {
                throw new Error('No PGN text to analyze');
            }
            
            const response = await fetch('/api/analyze-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pgnText })
            });

            console.log('Analysis response status:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Analysis result:', result);

            if (result.success) {
                this.gameAnalysis = result.analysis;
                this.updateAnalysisDisplay();
                this.updateMoveEvaluations();
                // Navigate to starting position after analysis completes
                this.navigateToPosition(0);
                this.showMessage('Game analysis completed!', 'success');
            } else {
                console.error('Analysis failed:', result.error);
                this.showMessage(`Analysis failed: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showMessage('Network connection error during analysis.', 'error');
            } else {
                this.showMessage(`Analysis failed: ${error.message}`, 'error');
            }
        } finally {
            this.isAnalyzing = false;
            this.hideLoading();
        }
    }

    updateAnalysisDisplay() {
        console.log('Updating analysis display for position:', this.currentPositionIndex);
        console.log('Game analysis length:', this.gameAnalysis?.length || 0);
        
        // Starting position (index 0) has no analysis
        if (this.currentPositionIndex === 0) {
            this.resetAnalysisDisplay();
            this.positionExplanation.textContent = 'Starting position - no analysis available';
            return;
        }

        if (!this.gameAnalysis || this.gameAnalysis.length === 0) {
            this.resetAnalysisDisplay();
            return;
        }

        // Analysis is indexed by move number (currentPositionIndex - 1)
        const analysisIndex = this.currentPositionIndex - 1;
        const currentAnalysis = this.gameAnalysis[analysisIndex];
        
        console.log('Looking for analysis at index:', analysisIndex);
        console.log('Found analysis:', currentAnalysis);
        
        if (!currentAnalysis) {
            this.resetAnalysisDisplay();
            this.positionExplanation.textContent = 'Analysis not available for this position';
            return;
        }

        // Update evaluation bar and score
        this.updateEvaluationBar(currentAnalysis.evaluation?.after);
        
        // Update move displays
        this.actualMoveDisplay.textContent = currentAnalysis.move?.san || '-';
        this.bestMoveDisplay.textContent = currentAnalysis.bestMove || '-';
        
        // Update toggle button state
        this.updateMoveToggleButton(currentAnalysis);
        
        // Update explanation
        this.positionExplanation.textContent = currentAnalysis.explanation || 'No analysis available';
        
        // Update move classification
        this.updateMoveClassification(currentAnalysis.moveQuality);
    }

    updateEvaluationBar(evaluation) {
        if (!evaluation) {
            this.evalScore.textContent = '0.00';
            this.evalBar.style.width = '50%';
            return;
        }

        let evalText = '0.00';
        let percentage = 50;

        if (evaluation.type === 'mate') {
            evalText = evaluation.value > 0 ? `+M${Math.abs(evaluation.value)}` : `-M${Math.abs(evaluation.value)}`;
            percentage = evaluation.value > 0 ? 95 : 5;
        } else {
            const centipawns = evaluation.value;
            evalText = (centipawns / 100).toFixed(2);
            
            // Convert centipawns to percentage (clamped between 5% and 95%)
            const evalScore = Math.max(-1000, Math.min(1000, centipawns));
            percentage = Math.max(5, Math.min(95, 50 + (evalScore / 1000) * 45));
        }

        this.evalScore.textContent = evalText;
        this.evalBar.style.width = `${percentage}%`;
    }

    updateMoveClassification(moveQuality) {
        if (!moveQuality) {
            this.moveClassification.textContent = '-';
            this.moveClassification.className = 'classification-badge';
            return;
        }

        const classification = moveQuality.classification;
        let displayText = '';
        let badgeClass = 'classification-badge';

        switch(classification) {
            case 'brilliant':
                displayText = '⭐ BRILLIANT';
                badgeClass += ' classification-brilliant';
                break;
            case 'best':
            case 'excellent':
                displayText = '✅ EXCELLENT';
                badgeClass += ' classification-excellent';
                break;
            case 'good':
                displayText = '👍 GOOD';
                badgeClass += ' classification-good';
                break;
            case 'inaccuracy':
                displayText = '❓ INACCURACY';
                badgeClass += ' classification-inaccuracy';
                break;
            case 'mistake':
                displayText = '❌ MISTAKE';
                badgeClass += ' classification-mistake';
                break;
            case 'blunder':
                displayText = '💥 BLUNDER';
                badgeClass += ' classification-blunder';
                break;
            default:
                displayText = classification.toUpperCase();
                badgeClass += ' classification-neutral';
        }

        this.moveClassification.textContent = displayText;
        this.moveClassification.className = badgeClass;
    }

    updateMoveEvaluations() {
        if (!this.gameAnalysis) return;

        this.gameAnalysis.forEach((analysis, index) => {
            const evalElement = document.getElementById(`eval-${index + 1}`);
            if (evalElement && analysis.evaluation?.after) {
                const evaluation = analysis.evaluation.after;
                let evalText = '0.00';
                
                if (evaluation.type === 'mate') {
                    evalText = evaluation.value > 0 ? `+M${Math.abs(evaluation.value)}` : `-M${Math.abs(evaluation.value)}`;
                } else {
                    evalText = (evaluation.value / 100).toFixed(2);
                }
                
                evalElement.textContent = evalText;
            }
        });
    }

    updateMoveToggleButton(analysis) {
        const actualMove = analysis.move?.san || '';
        const bestMove = analysis.bestMove || '';
        
        // Enable button only if there's a difference between actual and best moves
        const movesAreDifferent = actualMove !== bestMove && bestMove !== '' && actualMove !== '';
        
        this.toggleMoveBtn.disabled = !movesAreDifferent;
        
        if (movesAreDifferent) {
            if (this.showingBestMove) {
                this.toggleMoveBtn.textContent = '🎯 Hide Best Move';
                this.toggleMoveBtn.classList.add('showing-best');
            } else {
                this.toggleMoveBtn.textContent = '💡 Show Best Move';
                this.toggleMoveBtn.classList.remove('showing-best');
            }
        } else {
            this.toggleMoveBtn.textContent = '✅ Perfect Move';
            this.toggleMoveBtn.classList.remove('showing-best');
            this.showingBestMove = false;
        }
    }

    async toggleMoveView() {
        if (this.toggleMoveBtn.disabled) return;
        
        const currentAnalysis = this.gameAnalysis[this.currentPositionIndex - 1];
        if (!currentAnalysis) return;
        
        if (!this.showingBestMove) {
            // Show best move: go back to previous position
            this.showingBestMove = true;
            this.originalPositionIndex = this.currentPositionIndex; // Store current position
            
            // Go to the position BEFORE the current move (previous position)
            const previousPositionIndex = this.currentPositionIndex - 1;
            if (previousPositionIndex >= 0) {
                this.navigateToPositionQuiet(previousPositionIndex);
                this.showBestMoveHighlight(currentAnalysis);
            }
        } else {
            // Hide best move, return to original position
            this.showingBestMove = false;
            this.hideBestMoveHighlight();
            
            // Go back to the original position
            if (this.originalPositionIndex !== undefined) {
                this.navigateToPositionQuiet(this.originalPositionIndex);
            }
        }
        
        // Update button appearance
        this.updateMoveToggleButton(currentAnalysis);
    }

    showBestMoveHighlight(analysis) {
        const bestMove = analysis.bestMove;
        if (!bestMove || bestMove.length < 4) return;
        
        // Parse move notation (e.g., "e2e4")
        const fromSquare = bestMove.substring(0, 2);
        const toSquare = bestMove.substring(2, 4);
        
        // Get move information
        const bestMoveSAN = this.convertMoveToSAN(bestMove, this.currentPositionIndex - 1);
        const moveDescription = this.generateMoveDescription(bestMove, analysis, fromSquare, toSquare);
        
        // Show the highlighted panel
        this.bestMoveHighlight.classList.remove('hidden');
        this.bestMoveNotation.textContent = bestMoveSAN;
        this.bestMoveDescription.textContent = moveDescription;
        
        // Highlight squares on board
        this.highlightSquares(fromSquare, toSquare, bestMove);
        
        // Add arrow between squares
        this.drawMoveArrow(fromSquare, toSquare);
    }

    hideBestMoveHighlight() {
        // Hide the highlighted panel
        this.bestMoveHighlight.classList.add('hidden');
        
        // Clear all board highlights
        this.clearAllHighlights();
    }

    highlightSquares(fromSquare, toSquare, bestMove) {
        const boardElement = document.getElementById('chessBoard');
        if (!boardElement) return;
        
        // Clear previous highlights
        this.clearAllHighlights();
        
        // Find squares and add highlight classes
        const fromElement = boardElement.querySelector(`[data-square="${fromSquare}"]`);
        const toElement = boardElement.querySelector(`[data-square="${toSquare}"]`);
        
        if (fromElement) {
            fromElement.classList.add('highlight-from');
        }
        
        if (toElement) {
            // Check if it's a capture by looking at current position
            const isCapture = this.isCapture(toSquare);
            toElement.classList.add(isCapture ? 'highlight-capture' : 'highlight-to');
        }
    }

    isCapture(toSquare) {
        // Check if there's a piece on the destination square
        if (this.game) {
            const piece = this.game.get(toSquare);
            return piece !== null;
        }
        return false;
    }

    generateMoveDescription(bestMove, analysis, fromSquare, toSquare) {
        const pieceOnFromSquare = this.game ? this.game.get(fromSquare) : null;
        const pieceOnToSquare = this.game ? this.game.get(toSquare) : null;
        
        let description = '';
        
        // Piece name
        const pieceName = this.getPieceName(pieceOnFromSquare);
        
        // Move type
        if (pieceOnToSquare) {
            const capturedPiece = this.getPieceName(pieceOnToSquare);
            description = `${pieceName} captures ${capturedPiece} on ${toSquare}`;
        } else {
            description = `${pieceName} moves to ${toSquare}`;
        }
        
        // Add evaluation context
        const evalChange = this.getEvaluationChange(analysis);
        if (evalChange) {
            description += ` ${evalChange}`;
        }
        
        // Add tactical and strategic explanation
        const explanation = this.generateTacticalExplanation(bestMove, analysis, fromSquare, toSquare, pieceOnFromSquare, pieceOnToSquare);
        if (explanation) {
            description += `\n\n${explanation}`;
        }
        
        return description;
    }

    generateTacticalExplanation(bestMove, analysis, fromSquare, toSquare, piece, capturedPiece) {
        const explanations = [];
        
        // Material advantage
        if (capturedPiece) {
            const materialGain = this.getMaterialValue(capturedPiece) - this.getMaterialValue(piece);
            if (materialGain > 0) {
                explanations.push("Wins material advantage");
            } else if (materialGain === 0) {
                explanations.push("Trades equal material");
            }
        }
        
        // Check patterns
        if (bestMove.includes('+') || this.wouldGiveCheck(bestMove)) {
            explanations.push("Gives check, forcing opponent's king to move");
        }
        
        // Central control
        const centralSquares = ['d4', 'd5', 'e4', 'e5'];
        if (centralSquares.includes(toSquare)) {
            explanations.push("Controls the center of the board");
        }
        
        // Development patterns
        if (piece && piece.type === 'n' && ['c3', 'f3', 'c6', 'f6'].includes(toSquare)) {
            explanations.push("Develops piece toward the center");
        }
        
        if (piece && piece.type === 'b' && this.isDiagonalDevelopment(fromSquare, toSquare)) {
            explanations.push("Develops bishop on active diagonal");
        }
        
        // King safety
        if (this.improvesKingSafety(bestMove, fromSquare, toSquare, piece)) {
            explanations.push("Improves king safety");
        }
        
        // Attack patterns
        if (this.createsAttackThreats(bestMove, toSquare, piece)) {
            explanations.push("Creates immediate threats against opponent");
        }
        
        // Pawn structure
        if (piece && piece.type === 'p') {
            if (this.createsPawnChain(toSquare)) {
                explanations.push("Strengthens pawn structure");
            }
            if (this.advancesTowardsPromotion(toSquare, piece.color)) {
                explanations.push("Advances toward promotion");
            }
        }
        
        // Tactical motifs
        if (this.createsFork(bestMove, toSquare, piece)) {
            explanations.push("Creates a fork, attacking multiple pieces");
        }
        
        if (this.createsPinOrSkewer(bestMove, toSquare)) {
            explanations.push("Pins or skewers opponent's pieces");
        }
        
        // Evaluation-based reasoning
        const evalChange = this.getEvaluationChangeValue(analysis);
        if (evalChange > 100) {
            explanations.push("Significantly improves position evaluation");
        } else if (evalChange > 50) {
            explanations.push("Improves overall position");
        }
        
        // Default explanation if none found
        if (explanations.length === 0) {
            if (capturedPiece) {
                explanations.push("Removes opponent's piece from the board");
            } else {
                explanations.push("Improves piece activity and position");
            }
        }
        
        return explanations.join(", ") + ".";
    }

    getMaterialValue(piece) {
        if (!piece) return 0;
        const values = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
        return values[piece.type.toLowerCase()] || 0;
    }

    wouldGiveCheck(move) {
        // Simple heuristic - in real implementation this would check if move gives check
        return move.includes('+') || move.includes('#');
    }

    isDiagonalDevelopment(fromSquare, toSquare) {
        const goodDiagonals = ['c4', 'f4', 'g3', 'h3', 'c5', 'f5', 'g6', 'h6', 'b3', 'g3'];
        return goodDiagonals.includes(toSquare);
    }

    improvesKingSafety(move, fromSquare, toSquare, piece) {
        // Castling or moving king to safety
        return move.includes('O-O') || (piece && piece.type === 'k' && ['g1', 'c1', 'g8', 'c8'].includes(toSquare));
    }

    createsAttackThreats(move, toSquare, piece) {
        // Check if move attacks opponent's pieces or key squares
        const attackSquares = ['f7', 'f2', 'h7', 'h2']; // Common attack targets
        return attackSquares.includes(toSquare) || (piece && piece.type === 'q');
    }

    createsPawnChain(toSquare) {
        const chainSquares = ['d4', 'e4', 'd5', 'e5', 'c3', 'f3', 'c6', 'f6'];
        return chainSquares.includes(toSquare);
    }

    advancesTowardsPromotion(toSquare, color) {
        const rank = parseInt(toSquare[1]);
        return (color === 'w' && rank >= 6) || (color === 'b' && rank <= 3);
    }

    createsFork(move, toSquare, piece) {
        // Knight forks are most common
        return piece && piece.type === 'n' && ['c7', 'f7', 'c2', 'f2'].includes(toSquare);
    }

    createsPinOrSkewer(move, toSquare) {
        // Simplified heuristic for pins/skewers
        return ['d1', 'd8', 'e1', 'e8', 'a1', 'h1', 'a8', 'h8'].includes(toSquare);
    }

    getEvaluationChangeValue(analysis) {
        if (!analysis.evaluation || !analysis.evaluation.before || !analysis.evaluation.after) {
            return 0;
        }
        const before = analysis.evaluation.before.value || 0;
        const after = analysis.evaluation.after.value || 0;
        return Math.abs(after - before);
    }

    getPieceName(piece) {
        if (!piece) return 'piece';
        
        const names = {
            'p': 'pawn', 'n': 'knight', 'b': 'bishop', 
            'r': 'rook', 'q': 'queen', 'k': 'king'
        };
        
        return names[piece.type.toLowerCase()] || 'piece';
    }

    getEvaluationChange(analysis) {
        if (!analysis.evaluation || !analysis.evaluation.before || !analysis.evaluation.after) {
            return '';
        }
        
        const before = analysis.evaluation.before.value || 0;
        const after = analysis.evaluation.after.value || 0;
        const change = after - before;
        
        if (Math.abs(change) < 20) return ''; // Ignore small changes
        
        if (change > 0) {
            return `(+${(change/100).toFixed(1)} advantage)`;
        } else {
            return `(${(change/100).toFixed(1)} disadvantage)`;
        }
    }

    convertMoveToSAN(move, positionIndex) {
        // Convert UCI notation (e.g., "e2e4") to SAN notation (e.g., "e4")
        try {
            const tempGame = new Chess();
            if (positionIndex >= 0 && this.gamePositions[positionIndex]) {
                tempGame.load(this.gamePositions[positionIndex].fen);
                const moveObj = tempGame.move(move);
                return moveObj ? moveObj.san : move;
            }
        } catch (error) {
            console.log('Could not convert move to SAN:', error);
        }
        return move;
    }

    drawMoveArrow(fromSquare, toSquare) {
        // Remove existing arrows
        document.querySelectorAll('.move-arrow').forEach(arrow => arrow.remove());
        
        const boardElement = document.getElementById('chessBoard');
        if (!boardElement) return;
        
        const fromElement = boardElement.querySelector(`[data-square="${fromSquare}"]`);
        const toElement = boardElement.querySelector(`[data-square="${toSquare}"]`);
        
        if (!fromElement || !toElement) return;
        
        // Get positions relative to board
        const boardRect = boardElement.getBoundingClientRect();
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // Calculate arrow position
        const fromX = fromRect.left - boardRect.left + fromRect.width / 2;
        const fromY = fromRect.top - boardRect.top + fromRect.height / 2;
        const toX = toRect.left - boardRect.left + toRect.width / 2;
        const toY = toRect.top - boardRect.top + toRect.height / 2;
        
        // Create SVG arrow
        const arrow = document.createElement('div');
        arrow.className = 'move-arrow';
        arrow.innerHTML = `
            <svg width="100%" height="100%">
                <defs>
                    <marker id="arrowhead-${Date.now()}" markerWidth="12" markerHeight="8" 
                     refX="11" refY="4" orient="auto" markerUnits="strokeWidth">
                        <polygon points="0 0, 12 4, 0 8" fill="#fbbf24" />
                    </marker>
                </defs>
                <line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" 
                      marker-end="url(#arrowhead-${Date.now()})" />
            </svg>
        `;
        
        arrow.style.position = 'absolute';
        arrow.style.left = '0';
        arrow.style.top = '0';
        arrow.style.width = '100%';
        arrow.style.height = '100%';
        arrow.style.pointerEvents = 'none';
        arrow.style.zIndex = '15';
        
        boardElement.style.position = 'relative';
        boardElement.appendChild(arrow);
    }

    clearAllHighlights() {
        // Clear all highlight classes
        document.querySelectorAll('.highlight-from, .highlight-to, .highlight-square, .highlight-best-move, .highlight-capture').forEach(square => {
            square.classList.remove('highlight-from', 'highlight-to', 'highlight-square', 'highlight-best-move', 'highlight-capture');
        });
        
        // Remove arrows
        document.querySelectorAll('.move-arrow').forEach(arrow => arrow.remove());
    }

    resetAnalysisDisplay() {
        this.evalScore.textContent = '0.00';
        this.evalBar.style.width = '50%';
        this.actualMoveDisplay.textContent = '-';
        this.bestMoveDisplay.textContent = '-';
        this.toggleMoveBtn.disabled = true;
        this.toggleMoveBtn.textContent = '👁️ Show Best Move';
        this.toggleMoveBtn.classList.remove('showing-best');
        this.showingBestMove = false;
        this.positionExplanation.textContent = 'Select a position to see analysis';
        this.moveClassification.textContent = '-';
        this.moveClassification.className = 'classification-badge';
    }

    // Utility functions
    reconstructPGN() {
        if (!this.currentGameData) return '';
        
        // Create PGN from game data
        const header = this.currentGameData.header || {};
        const moves = this.currentGameData.moves || [];
        
        let pgn = '';
        
        // Add headers (only include non-null values)
        Object.entries(header).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                pgn += `[${key} "${value}"]\n`;
            }
        });
        
        // Ensure minimum required headers
        if (!header.Event) pgn += `[Event "Analyzed Game"]\n`;
        if (!header.Site) pgn += `[Site "Chess Analyzer"]\n`;
        if (!header.Date) pgn += `[Date "????.??.??"]\n`;
        if (!header.Round) pgn += `[Round "?"]\n`;
        if (!header.White) pgn += `[White "White"]\n`;
        if (!header.Black) pgn += `[Black "Black"]\n`;
        if (!header.Result) pgn += `[Result "*"]\n`;
        
        pgn += '\n';
        
        // Add moves
        for (let i = 0; i < moves.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = moves[i]?.san || '';
            const blackMove = moves[i + 1]?.san || '';
            
            if (whiteMove) {
                pgn += `${moveNumber}.${whiteMove} `;
                if (blackMove) {
                    pgn += `${blackMove} `;
                }
            }
        }
        
        pgn += header.Result || '*';
        
        console.log('Reconstructed PGN:', pgn);
        return pgn;
    }

    handleKeyPress(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; // Don't handle keyboard shortcuts when typing
        }

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.navigateToPosition(this.currentPositionIndex - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigateToPosition(this.currentPositionIndex + 1);
                break;
            case 'Home':
                e.preventDefault();
                this.navigateToPosition(0);
                break;
            case 'End':
                e.preventDefault();
                this.navigateToPosition(this.gamePositions.length - 1);
                break;
        }
    }

    // UI helpers
    showLoading(text = 'Loading...') {
        this.loadingText.textContent = text;
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    showMessage(text, type = 'success') {
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        
        this.messageContainer.appendChild(message);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
    }

    // Interactive Board functionality
    onDragStart(source, piece, position, orientation) {
        // Only allow moves if we have a game loaded
        if (!this.currentGameData || !this.game) return false;
        
        // Only allow moves for the current player to move
        if ((this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        
        return true;
    }

    onDrop(source, target) {
        // See if the move is legal
        const move = this.game.move({
            from: source,
            to: target,
            promotion: 'q' // Always promote to queen for simplicity
        });

        // Illegal move
        if (move === null) return 'snapback';

        // Legal move made
        this.enterInteractiveMode();
        this.analyzeAlternativeMove(move);
        return true;
    }

    onSnapEnd() {
        this.board.position(this.game.fen());
    }

    enterInteractiveMode() {
        if (!this.isInteractiveMode) {
            this.isInteractiveMode = true;
            this.originalGameFen = this.gamePositions[this.currentPositionIndex].fen;
            this.resetBoardBtn.disabled = false;
            this.interactiveStatus.classList.add('modified');
            this.interactiveStatusText.textContent = 'Exploring alternative move - click Reset to return';
        }
    }

    resetToGamePosition() {
        if (this.originalGameFen && this.game) {
            this.game.load(this.originalGameFen);
            this.board.position(this.originalGameFen);
            this.isInteractiveMode = false;
            this.resetBoardBtn.disabled = true;
            this.interactiveStatus.classList.remove('modified');
            this.interactiveStatusText.textContent = 'Try alternative moves by dragging pieces!';
            
            // Restore original analysis
            this.updateAnalysisDisplay();
        }
    }

    async analyzeAlternativeMove(move) {
        try {
            // Show loading state
            this.interactiveStatusText.textContent = 'Analyzing alternative move...';
            
            // Get current position after the move
            const currentFen = this.game.fen();
            
            // Analyze the new position
            const response = await fetch('/api/analyze-position', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: currentFen,
                    depth: 12
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Update analysis display with alternative move analysis
                this.displayAlternativeAnalysis(move, result);
                this.interactiveStatusText.textContent = `Alternative move: ${move.san} analyzed`;
            } else {
                this.interactiveStatusText.textContent = 'Analysis failed - try another move';
            }
            
        } catch (error) {
            console.error('Alternative move analysis failed:', error);
            this.interactiveStatusText.textContent = 'Analysis error - try another move';
        }
    }

    displayAlternativeAnalysis(move, analysis) {
        // Update evaluation display
        const evalScore = analysis.evaluation || '0.00';
        this.evalScore.textContent = evalScore;
        
        // Update evaluation bar
        this.updateEvaluationBar(evalScore);
        
        // Update move displays
        this.actualMoveDisplay.textContent = move.san;
        this.bestMoveDisplay.textContent = analysis.bestMove || '-';
        
        // Update explanation
        const explanation = this.generateAlternativeExplanation(move, analysis);
        this.positionExplanation.textContent = explanation;
        
        // Update move classification
        this.updateMoveClassification({ classification: 'alternative', score: 0 });
    }

    generateAlternativeExplanation(move, analysis) {
        let explanation = `You played ${move.san}. `;
        
        if (analysis.bestMove && analysis.bestMove !== move.san) {
            explanation += `Engine suggests ${analysis.bestMove} instead. `;
        } else {
            explanation += `This matches the engine's top choice! `;
        }
        
        explanation += `Position evaluation: ${analysis.evaluation || '0.00'}. `;
        
        if (move.captured) {
            explanation += `This move captures material. `;
        }
        
        if (move.san.includes('+')) {
            explanation += `This move gives check. `;
        }
        
        explanation += `Try different moves to explore other possibilities, or click Reset to return to the game.`;
        
        return explanation;
    }

    // AI Chat functionality
    async initializeAIChat() {
        try {
            const response = await fetch('/api/chat/status');
            const status = await response.json();
            
            if (status.available) {
                this.enableChat();
                this.hideChatStatus(); // Hide status immediately if available
            } else {
                this.showChatStatus(status.message, 'error');
                this.disableChat();
            }
            
        } catch (error) {
            console.error('Failed to initialize AI chat:', error);
            this.showChatStatus('AI unavailable - check your connection', 'error');
            this.disableChat();
        }
    }

    enableChat() {
        this.chatInput.disabled = false;
        this.chatSendBtn.disabled = false;
        this.chatInput.placeholder = "Ask about your game...";
    }

    disableChat() {
        this.chatInput.disabled = true;
        this.chatSendBtn.disabled = true;
        this.chatInput.placeholder = "AI chat unavailable";
    }

    showChatStatus(message, type = 'info') {
        this.chatStatusText.textContent = message;
        this.chatStatus.className = `chat-status ${type}`;
        this.chatStatus.classList.remove('hidden');
    }

    hideChatStatus() {
        this.chatStatus.classList.add('hidden');
    }

    async sendChatMessage() {
        const question = this.chatInput.value.trim();
        if (!question) return;

        // Add user message to chat
        this.addChatMessage(question, 'user');
        
        // Clear input and disable while processing
        this.chatInput.value = '';
        this.setChatLoading(true);
        
        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Prepare game context
            const gameData = {
                gameInfo: this.currentGameData?.gameInfo || null,
                moves: this.currentGameData?.moves || [],
                analysis: this.gameAnalysis || []
            };

            const response = await fetch('/api/chat/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: question,
                    gameData: gameData,
                    currentMove: this.currentPositionIndex
                })
            });

            const result = await response.json();
            
            // Remove typing indicator
            this.hideTypingIndicator();

            if (result.success) {
                this.addChatMessage(result.response, 'ai');
            } else {
                this.addChatMessage(`Sorry, I couldn't process your question: ${result.error}`, 'ai');
            }

        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addChatMessage('Sorry, I encountered an error while processing your question. Please try again.', 'ai');
        } finally {
            this.setChatLoading(false);
        }
    }

    addChatMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Handle HTML content safely (convert newlines to breaks)
        const formattedContent = content.replace(/\n/g, '<br>');
        contentDiv.innerHTML = formattedContent;
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span>AI is thinking...</span>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    setChatLoading(loading) {
        if (loading) {
            this.chatSendBtn.classList.add('loading');
            this.chatSendBtn.disabled = true;
            this.chatInput.disabled = true;
        } else {
            this.chatSendBtn.classList.remove('loading');
            this.chatSendBtn.disabled = false;
            this.chatInput.disabled = false;
        }
    }
}

// Initialize the chess analyzer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessAnalyzer();
});