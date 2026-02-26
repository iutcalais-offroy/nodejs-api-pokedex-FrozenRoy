let socket = null
let currentGameState = null

// Sign in and auto-connect
async function signIn() {
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value

  if (!email || !password) {
    alert('Email and password required')
    return
  }

  try {
    log(`Signing in as ${email}...`, 'sent')

    const response = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    // Check content type before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(
        'Server error: Expected JSON response but got HTML. Is the server running?',
      )
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Sign in failed')
    }

    log(`✅ Signed in successfully! Token received.`, 'received')

    // Set token and connect
    document.getElementById('token').value = data.token
    connectWithToken(data.token)
  } catch (error) {
    log(`❌ Sign in error: ${error.message}`, 'error')
    alert('Sign in failed: ' + error.message)
  }
}

// Connection handlers
function connectWithToken(token) {
  if (!token) {
    alert('Please enter a JWT token')
    return
  }

  socket = io({
    auth: { token },
  })

  socket.on('connect', () => {
    log('Connected', 'received')
    document.getElementById('status').textContent = 'Connected'
    document.getElementById('status').className = 'status connected'
    document.getElementById('connectBtn').disabled = true
    document.getElementById('disconnectBtn').disabled = false
  })

  socket.on('disconnect', () => {
    log('Disconnected', 'error')
    document.getElementById('status').textContent = 'Disconnected'
    document.getElementById('status').className = 'status disconnected'
    document.getElementById('connectBtn').disabled = false
    document.getElementById('disconnectBtn').disabled = true
  })

  socket.on('connect_error', (error) => {
    log('Connection error: ' + error.message, 'error')
  })

  // Game events handlers
  socket.on('gameStarted', (gameState) => {
    log('⬅️ Game Started!', 'received')
    currentGameState = gameState
    updateGameDisplay(gameState)
    fillRoomIdFields(gameState.roomId)
  })

  socket.on('gameStateUpdated', (gameState) => {
    log('⬅️ Game State Updated', 'received')
    currentGameState = gameState
    updateGameDisplay(gameState)
  })

  socket.on('gameEnded', (data) => {
    log('⬅️ Game Ended!', 'received')
    currentGameState = data.finalState
    updateGameDisplay(data.finalState)
    showVictoryMessage(data.winner)
  })

  // Listen to all server events
  socket.onAny((eventName, ...args) => {
    log(`⬅️ ${eventName}: ${JSON.stringify(args, null, 2)}`, 'received')
  })
}

document.getElementById('connectBtn').addEventListener('click', () => {
  const token = document.getElementById('token').value
  connectWithToken(token)
})

document.getElementById('disconnectBtn').addEventListener('click', () => {
  if (socket) {
    socket.disconnect()
  }
})

// Deck management
async function getMyDecks() {
  const token = document.getElementById('token').value
  if (!token) return alert('Please sign in first')

  try {
    log('⬆️ GET /api/decks/mine', 'sent')

    const response = await fetch('/api/decks/mine', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get decks')
    }

    log(`⬇️ Decks received: ${JSON.stringify(data, null, 2)}`, 'received')

    // Display decks in UI
    const myDecksDiv = document.getElementById('myDecks')
    if (data.length === 0) {
      myDecksDiv.innerHTML =
        '<p style="color: orange;">No decks found. Create one first!</p>'
    } else {
      myDecksDiv.innerHTML = data
        .map(
          (deck) => `
        <div style="padding: 8px; margin: 4px 0; background: #2a2a2a; border-radius: 4px;">
          <strong>ID: ${deck.id}</strong> - ${deck.name} (${deck.deckcard?.length || 0} cards)
        </div>
      `,
        )
        .join('')
    }
  } catch (error) {
    log(`❌ Error getting decks: ${error.message}`, 'error')
    alert('Failed to get decks: ' + error.message)
  }
}

// Room events
function getRooms() {
  if (!socket) return alert('Not connected')
  log('➡️ getRooms', 'sent')
  socket.emit('getRooms', (response) => {
    if (response.error) {
      log(`❌ getRooms error: ${response.error}`, 'error')
    } else {
      log(`⬅️ Rooms: ${JSON.stringify(response.rooms, null, 2)}`, 'received')
    }
  })
}

function createRoom() {
  if (!socket) return alert('Not connected')
  const deckId = document.getElementById('createRoomDeckId').value
  if (!deckId) return alert('Deck ID required')

  const data = { deckId }
  log(`➡️ createRoom: ${JSON.stringify(data)}`, 'sent')
  socket.emit('createRoom', data, (response) => {
    if (response.error) {
      log(`❌ createRoom error: ${response.error}`, 'error')
      alert('Failed to create room: ' + response.error)
    } else {
      log(`✅ Room created: ${JSON.stringify(response, null, 2)}`, 'received')
      alert('Room created successfully!')
    }
  })
}

function joinRoom() {
  if (!socket) return alert('Not connected')
  const roomId = document.getElementById('joinRoomId').value
  const deckId = document.getElementById('joinRoomDeckId').value
  if (!roomId || !deckId) return alert('Room ID and Deck ID required')

  const data = { roomId, deckId }
  log(`➡️ joinRoom: ${JSON.stringify(data)}`, 'sent')
  socket.emit('joinRoom', data, (response) => {
    if (response.error) {
      log(`❌ joinRoom error: ${response.error}`, 'error')
      alert('Failed to join room: ' + response.error)
    } else {
      log(`✅ Joined room: ${JSON.stringify(response, null, 2)}`, 'received')
      alert('Successfully joined room!')
    }
  })
}

// Game events
function drawCards() {
  if (!socket) return alert('Not connected')
  const roomId = document.getElementById('drawCardsRoomId').value
  if (!roomId) return alert('Room ID required')

  const data = { roomId }
  log(`➡️ drawCards: ${JSON.stringify(data)}`, 'sent')
  socket.emit('drawCards', data)
}

function playCard() {
  if (!socket) return alert('Not connected')
  const roomId = document.getElementById('playCardRoomId').value
  const cardIndex = parseInt(document.getElementById('playCardIndex').value)
  if (!roomId || isNaN(cardIndex))
    return alert('Room ID and Card Index required')

  const data = { roomId, cardIndex }
  log(`➡️ playCard: ${JSON.stringify(data)}`, 'sent')
  socket.emit('playCard', data)
}

function attack() {
  if (!socket) return alert('Not connected')
  const roomId = document.getElementById('attackRoomId').value
  if (!roomId) return alert('Room ID required')

  const data = { roomId }
  log(`➡️ attack: ${JSON.stringify(data)}`, 'sent')
  socket.emit('attack', data)
}

function endTurn() {
  if (!socket) return alert('Not connected')
  const roomId = document.getElementById('endTurnRoomId').value
  if (!roomId) return alert('Room ID required')

  const data = { roomId }
  log(`➡️ endTurn: ${JSON.stringify(data)}`, 'sent')
  socket.emit('endTurn', data)
}

// Logging
function log(message, type = 'info') {
  const logs = document.getElementById('logs')
  const entry = document.createElement('div')
  entry.className = `log-entry ${type}`
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
  logs.appendChild(entry)
  logs.scrollTop = logs.scrollHeight
}

function clearLogs() {
  document.getElementById('logs').innerHTML = ''
}

// Game Display Functions
function updateGameDisplay(gameState) {
  if (!gameState) return

  // Show game state section
  document.getElementById('gameStateSection').style.display = 'block'

  // Update player info
  document.getElementById('playerName').textContent = `Vous (${gameState.player.username})`
  document.getElementById('playerScore').textContent = gameState.player.score
  document.getElementById('playerHandSize').textContent = gameState.player.hand.length
  document.getElementById('playerDeckSize').textContent = gameState.player.deckSize

  // Update opponent info
  document.getElementById('opponentName').textContent = gameState.opponent.username
  document.getElementById('opponentScore').textContent = gameState.opponent.score
  document.getElementById('opponentHandSize').textContent = gameState.opponent.handSize
  document.getElementById('opponentDeckSize').textContent = gameState.opponent.deckSize

  // Update active cards
  updateActiveCard('playerActiveCard', gameState.player.activeCard)
  updateActiveCard('opponentActiveCard', gameState.opponent.activeCard)

  // Update hand display
  updateHandDisplay(gameState.player.hand)

  // Update turn indicator
  updateTurnIndicator(gameState.isMyTurn, gameState.player.username)
}

function updateActiveCard(containerId, card) {
  const container = document.getElementById(containerId)
  if (!card) {
    container.className = 'card-placeholder'
    container.innerHTML = 'Aucune carte active'
    return
  }

  container.className = 'pokemon-card'
  const hpPercent = (card.currentHp / card.hp) * 100
  
  container.innerHTML = `
    ${card.imgUrl ? `<img src="${card.imgUrl}" alt="${card.name}" onerror="this.style.display='none'">` : ''}
    <div class="card-name">${card.name}</div>
    <div class="card-type">${card.type}</div>
    <div class="card-stats">
      <span class="hp">❤️ HP: ${card.currentHp}/${card.hp}</span>
      <span class="attack">⚔️ ATK: ${card.attack}</span>
    </div>
    <div class="hp-bar">
      <div class="hp-bar-fill" style="width: ${hpPercent}%"></div>
    </div>
  `
}

function updateHandDisplay(hand) {
  const container = document.getElementById('playerHand')
  if (!hand || hand.length === 0) {
    container.innerHTML = '<h4>Main vide</h4>'
    return
  }

  let html = '<h4>Votre main:</h4><div class="hand-cards">'
  hand.forEach((card, index) => {
    html += `
      <div class="hand-card" title="Cliquez pour jouer cette carte (index ${index})">
        <div class="card-name">${card.name}</div>
        <div class="card-type">${card.type}</div>
        <div class="card-stats">
          <span>❤️ ${card.hp}</span>
          <span>⚔️ ${card.attack}</span>
        </div>
        <div style="font-size: 10px; color: #858585; margin-top: 4px;">Index: ${index}</div>
      </div>
    `
  })
  html += '</div>'
  container.innerHTML = html
}

function updateTurnIndicator(isMyTurn, playerName) {
  const indicator = document.getElementById('turnIndicator')
  if (isMyTurn) {
    indicator.className = 'turn-indicator your-turn'
    indicator.textContent = `🎮 C'est votre tour, ${playerName}!`
  } else {
    indicator.className = 'turn-indicator opponent-turn'
    indicator.textContent = '⏳ Tour de l\'adversaire...'
  }
}

function showVictoryMessage(winner) {
  const messageDiv = document.getElementById('victoryMessage')
  const myUsername = currentGameState?.player?.username
  
  if (winner.username === myUsername) {
    messageDiv.innerHTML = '🎉 VICTOIRE ! Vous avez gagné ! 🎉'
    messageDiv.style.background = 'linear-gradient(135deg, #4ec9b0 0%, #569cd6 100%)'
  } else {
    messageDiv.innerHTML = `😢 Défaite ! ${winner.username} a gagné.`
    messageDiv.style.background = 'linear-gradient(135deg, #f48771 0%, #ce9178 100%)'
  }
  
  messageDiv.style.display = 'block'
}

function fillRoomIdFields(roomId) {
  // Auto-fill all room ID fields
  document.getElementById('drawCardsRoomId').value = roomId
  document.getElementById('playCardRoomId').value = roomId
  document.getElementById('attackRoomId').value = roomId
  document.getElementById('endTurnRoomId').value = roomId
}
