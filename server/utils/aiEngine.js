
/**
 * Hand Cricket AI Engine
 * Difficulty Levels: BASIC, MEDIUM, HIGH, ULTRA
 */

export const BotDifficulty = {
  BASIC: 'BASIC',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  ULTRA: 'ULTRA'
};

export const getBotMove = (difficulty, gameState, playerHistory, botRole) => {
  const possibleMoves = [1, 2, 3, 4, 5, 6];

  switch (difficulty) {
    case BotDifficulty.ULTRA:
      return moveUltra(gameState, playerHistory, botRole);
    case BotDifficulty.HIGH:
      return moveHigh(gameState, playerHistory, botRole);
    case BotDifficulty.MEDIUM:
      return moveMedium(gameState, botRole);
    case BotDifficulty.BASIC:
    default:
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  }
};

/**
 * BASIC: Purely random
 */
const moveBasic = () => {
  return Math.floor(Math.random() * 6) + 1;
};

/**
 * MEDIUM: Slightly smarter random
 * - Doesn't repeat same move 70% of the time
 * - Favors 4s and 6s slightly when batting (20% more likely)
 * - Favors 1s and 2s slightly when bowling (20% more likely)
 */
const moveMedium = (gameState, botRole) => {
  const lastBotMove = gameState.lastBotMove; // We'd need to store this or get it from history
  let moves = [1, 2, 3, 4, 5, 6];
  
  // Weights
  let weights = [1, 1, 1, 1, 1, 1];
  
  if (botRole === 'batsman') {
    weights[3] = 1.5; // Favor 4
    weights[5] = 1.5; // Favor 6
  } else {
    weights[0] = 1.5; // Favor 1
    weights[1] = 1.5; // Favor 2
  }

  // Avoid repetition
  if (lastBotMove) {
    weights[lastBotMove - 1] *= 0.3;
  }

  return weightedRandom(moves, weights);
};

/**
 * HIGH: Frequency analysis
 * - Tracks player's most frequent moves
 * - 40% chance to pick player's "favorite" number when bowling
 * - Avoids player's "favorite" bowling number when batting
 */
const moveHigh = (gameState, playerHistory, botRole) => {
  if (!playerHistory || playerHistory.length < 3) return moveMedium(gameState, botRole);

  const freq = {};
  playerHistory.forEach(move => {
    freq[move] = (freq[move] || 0) + 1;
  });

  const sortedMoves = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).map(Number);
  const favorite = sortedMoves[0];

  if (botRole === 'bowler') {
    // 40% chance to pick their favorite to get them out
    if (Math.random() < 0.4) return favorite;
  } else {
    // When batting, avoid their favorite bowling number if we have that data
    // For now, just a general "smart" move
    if (Math.random() < 0.3) {
        const leastUsedByPlayer = [1, 2, 3, 4, 5, 6].filter(m => !playerHistory.slice(-3).includes(m));
        if (leastUsedByPlayer.length > 0) return leastUsedByPlayer[Math.floor(Math.random() * leastUsedByPlayer.length)];
    }
  }

  return moveMedium(gameState, botRole);
};

/**
 * ULTRA: Markov Chain / Sequence Prediction
 * - Looks for patterns like 1, 2, 1, ? -> 2
 * - Or 6, 6, ? -> 6
 * - More aggressive frequency analysis
 */
const moveUltra = (gameState, playerHistory, botRole) => {
  if (!playerHistory || playerHistory.length < 5) return moveHigh(gameState, playerHistory, botRole);

  // Pattern recognition (Order-1 Markov)
  const lastMove = playerHistory[playerHistory.length - 1];
  const transitions = {};
  
  for (let i = 0; i < playerHistory.length - 1; i++) {
    const current = playerHistory[i];
    const next = playerHistory[i + 1];
    if (!transitions[current]) transitions[current] = {};
    transitions[current][next] = (transitions[current][next] || 0) + 1;
  }

  if (transitions[lastMove]) {
    const predictedNext = Object.keys(transitions[lastMove]).sort((a, b) => transitions[lastMove][b] - transitions[lastMove][a])[0];
    if (botRole === 'bowler') {
        // 60% chance to use prediction
        if (Math.random() < 0.6) return Number(predictedNext);
    } else {
        // Avoid the predicted bowler move
        const badMove = Number(predictedNext);
        const options = [1, 2, 3, 4, 5, 6].filter(m => m !== badMove);
        if (Math.random() < 0.7) return options[Math.floor(Math.random() * options.length)];
    }
  }

  // Situation awareness
  if (botRole === 'batsman' && gameState.target) {
    const runsNeeded = gameState.target - gameState.botScore;
    if (runsNeeded <= 6 && runsNeeded > 0) {
        // High stakes, try to get exactly what's needed or safe
        if (runsNeeded === 6 && Math.random() < 0.5) return 6;
        if (runsNeeded === 1) return 1;
    }
  }

  return moveHigh(gameState, playerHistory, botRole);
};

const weightedRandom = (items, weights) => {
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    if (random < weights[i]) return items[i];
    random -= weights[i];
  }
  return items[0];
};
