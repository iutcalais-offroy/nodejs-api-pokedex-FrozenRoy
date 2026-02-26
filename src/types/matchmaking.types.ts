/**
 * Représente un joueur dans une room
 */
export interface Player {
  userId: number
  username: string
  email: string
  socketId: string
  deckId: number
}

/**
 * Représente une room de matchmaking
 */
export interface Room {
  id: string
  host: Player
  guest: Player | null
  status: 'waiting' | 'ready' | 'playing'
  createdAt: Date
}

/**
 * Représente une carte dans une main de joueur
 */
export interface GameCard {
  id: number
  name: string
  hp: number
  attack: number
  type: string
  pokedexNumber: number
  imgUrl: string | null
}

/**
 * Représente une carte active sur le terrain avec ses HP actuels
 */
export interface ActiveCard extends GameCard {
  currentHp: number // HP actuels de la carte (diminuent lors des attaques)
}

/**
 * Représente l'état d'un joueur dans une partie
 */
export interface PlayerGameState {
  userId: number
  username: string
  hand: GameCard[]
  handSize?: number // Pour l'adversaire, on ne montre que la taille de la main
  deckSize: number // Nombre de cartes restantes dans le deck
  activeCard: ActiveCard | null // Carte active sur le terrain
  score: number // Nombre de cartes adverses vaincues
}

/**
 * Représente l'état complet d'une partie
 */
export interface GameState {
  roomId: string
  player: PlayerGameState
  opponent: PlayerGameState
  currentPlayerSocketId: string // Socket ID du joueur dont c'est le tour
  isMyTurn?: boolean // Calculé côté serveur pour le joueur actuel
}

/**
 * Représente les données de jeu internes côté serveur
 */
export interface GameData {
  roomId: string
  hostSocketId: string
  guestSocketId: string
  hostUserId: number
  guestUserId: number
  hostUsername: string
  guestUsername: string
  hostHand: GameCard[]
  guestHand: GameCard[]
  hostDeck: GameCard[] // Cartes restantes dans le deck
  guestDeck: GameCard[] // Cartes restantes dans le deck
  hostActiveCard: ActiveCard | null
  guestActiveCard: ActiveCard | null
  hostScore: number
  guestScore: number
  currentPlayerSocketId: string // Socket ID du joueur dont c'est le tour
  status: 'playing' | 'finished'
}

/**
 * Paramètres pour créer une room
 */
export interface CreateRoomParams {
  deckId: number
}

/**
 * Paramètres pour rejoindre une room
 */
export interface JoinRoomParams {
  roomId: string
  deckId: number
}

/**
 * Informations publiques d'une room pour la liste
 */
export interface RoomInfo {
  id: string
  host: {
    username: string
    userId: number
  }
  status: 'waiting' | 'ready'
  createdAt: Date
}
