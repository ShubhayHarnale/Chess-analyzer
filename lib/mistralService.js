const https = require('https');

class MistralService {
    constructor() {
        this.apiKey = process.env.MISTRAL_API_KEY;
        this.apiUrl = 'https://api.mistral.ai/v1/chat/completions';
        this.model = 'mistral-small'; // More accessible model that works with all tiers
        this.maxTokens = 1000;
        this.isAvailable = !!this.apiKey;
    }

    async sendChatMessage(messages) {
        if (!this.isAvailable) {
            throw new Error('Mistral AI is not configured. Please add MISTRAL_API_KEY to your environment variables.');
        }

        const requestData = {
            model: this.model,
            messages: messages,
            max_tokens: this.maxTokens,
            temperature: 0.7,
            stream: false
        };

        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(requestData);
            
            const options = {
                hostname: 'api.mistral.ai',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        if (res.statusCode !== 200) {
                            console.error('Mistral API Error Details:', {
                                statusCode: res.statusCode,
                                statusMessage: res.statusMessage,
                                responseData: data,
                                parsedResponse: response
                            });
                            reject(new Error(`Mistral API error (${res.statusCode}): ${response.error?.message || response.message || 'Unknown error'}`));
                            return;
                        }

                        if (response.choices && response.choices.length > 0) {
                            resolve(response.choices[0].message.content);
                        } else {
                            reject(new Error('No response from Mistral AI'));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse Mistral response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.write(postData);
            req.end();
        });
    }

    createGameContextPrompt(gameData, userQuestion, currentMove = null) {
        const { gameInfo, moves, analysis } = gameData;
        
        let contextPrompt = `You are a chess analysis assistant. Analyze this chess game and answer the user's question.\n\n`;
        
        // Game Information
        if (gameInfo) {
            contextPrompt += `GAME INFO:\n`;
            contextPrompt += `White: ${gameInfo.players?.white || 'Unknown'}`;
            if (gameInfo.players?.whiteElo) {
                contextPrompt += ` (${gameInfo.players.whiteElo})`;
            }
            contextPrompt += `\n`;
            contextPrompt += `Black: ${gameInfo.players?.black || 'Unknown'}`;
            if (gameInfo.players?.blackElo) {
                contextPrompt += ` (${gameInfo.players.blackElo})`;
            }
            contextPrompt += `\n`;
            if (gameInfo.header?.Result) {
                contextPrompt += `Result: ${gameInfo.header.Result}\n`;
            }
            contextPrompt += `\n`;
        }

        // PGN Moves
        if (moves && moves.length > 0) {
            contextPrompt += `GAME MOVES:\n`;
            let pgnMoves = '';
            for (let i = 0; i < moves.length; i += 2) {
                const moveNumber = Math.floor(i / 2) + 1;
                const whiteMove = moves[i]?.san || '';
                const blackMove = moves[i + 1]?.san || '';
                pgnMoves += `${moveNumber}.${whiteMove}`;
                if (blackMove) {
                    pgnMoves += ` ${blackMove} `;
                }
            }
            contextPrompt += pgnMoves + `\n\n`;
        }

        // Analysis Summary
        if (analysis && analysis.length > 0) {
            contextPrompt += `MOVE ANALYSIS:\n`;
            const significantMoves = analysis.filter(a => 
                a.moveQuality && ['blunder', 'mistake', 'brilliant', 'excellent'].includes(a.moveQuality.classification)
            );
            
            significantMoves.forEach(moveAnalysis => {
                const moveNum = Math.floor(moveAnalysis.moveIndex / 2) + 1;
                const isWhite = moveAnalysis.moveIndex % 2 === 0;
                const player = isWhite ? 'White' : 'Black';
                
                contextPrompt += `Move ${moveNum}${isWhite ? '.' : '...'} ${moveAnalysis.actualMove} (${player}): `;
                contextPrompt += `${moveAnalysis.moveQuality.classification.toUpperCase()}`;
                if (moveAnalysis.moveQuality.score) {
                    contextPrompt += ` (${moveAnalysis.moveQuality.score > 0 ? '+' : ''}${(moveAnalysis.moveQuality.score/100).toFixed(1)})`;
                }
                contextPrompt += `\n`;
                
                if (moveAnalysis.bestMove && moveAnalysis.bestMove !== moveAnalysis.actualMove) {
                    contextPrompt += `  Better: ${moveAnalysis.bestMove}\n`;
                }
            });
            contextPrompt += `\n`;
        }

        // Current Position Context
        if (currentMove !== null && currentMove > 0) {
            contextPrompt += `USER IS CURRENTLY VIEWING: Move ${Math.floor(currentMove / 2) + 1}`;
            contextPrompt += currentMove % 2 === 1 ? ` (White)\n\n` : ` (Black)\n\n`;
        }

        // User Question
        contextPrompt += `USER QUESTION: ${userQuestion}\n\n`;
        
        // Instructions
        contextPrompt += `Please provide a helpful, educational answer focusing on:\n`;
        contextPrompt += `- Chess principles and strategy\n`;
        contextPrompt += `- Specific move analysis if relevant\n`;
        contextPrompt += `- Practical improvement suggestions\n`;
        contextPrompt += `- Use chess notation when referencing moves\n`;
        contextPrompt += `Keep the response concise but informative (under 500 words).`;

        return contextPrompt;
    }

    async analyzeGameQuestion(gameData, userQuestion, currentMove = null) {
        try {
            const systemPrompt = {
                role: 'system',
                content: `You are an expert chess coach and analyst. You help players improve by analyzing their games and answering questions about chess strategy, tactics, and specific moves. Always be encouraging and educational in your responses.`
            };

            const userPrompt = {
                role: 'user',
                content: this.createGameContextPrompt(gameData, userQuestion, currentMove)
            };

            const response = await this.sendChatMessage([systemPrompt, userPrompt]);
            return response;
        } catch (error) {
            throw new Error(`Chess analysis failed: ${error.message}`);
        }
    }

    async testConnection() {
        try {
            const testMessage = [{
                role: 'user',
                content: 'Say "Hello" if you can respond to chess questions.'
            }];
            
            const response = await this.sendChatMessage(testMessage);
            return { 
                available: true, 
                message: 'Mistral AI is working correctly',
                testResponse: response 
            };
        } catch (error) {
            return { 
                available: false, 
                message: error.message 
            };
        }
    }
}

module.exports = MistralService;