require('dotenv').config();
const PGNParser = require('./lib/pgnParser');

// Test PGN parsing
const testPGN = `[Event "Test Game"]
[Site "Online"]
[Date "2023.01.01"]
[Round "1"]
[White "Player 1"]
[Black "Player 2"]
[Result "1-0"]

1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O 9.h3 1-0`;

console.log('Testing PGN Parser...');

const parser = new PGNParser();
const result = parser.parsePGN(testPGN);

if (result.success) {
    console.log('✅ PGN parsing successful');
    console.log(`   - Moves: ${result.data.moves.length}`);
    console.log(`   - Positions: ${result.data.positions.length}`);
    console.log(`   - Game over: ${result.data.isGameOver}`);
    console.log(`   - Result: ${result.data.result}`);
    
    // Test position navigation
    console.log('\nTesting position navigation...');
    const position5 = parser.getPositionAtMove(testPGN, 5);
    console.log(`   - Position after move 5: ${position5.fen.substring(0, 20)}...`);
    console.log(`   - Last move: ${position5.lastMove}`);
    
    console.log('\n✅ All tests passed!');
} else {
    console.log('❌ PGN parsing failed:', result.error);
}

// Test OpenAI configuration
console.log('\nTesting OpenAI configuration...');
if (process.env.OPENAI_API_KEY) {
    if (process.env.OPENAI_API_KEY.startsWith('sk-')) {
        console.log('✅ OpenAI API key configured correctly');
    } else {
        console.log('❌ OpenAI API key format invalid');
    }
} else {
    console.log('⚠️  OpenAI API key not configured');
}