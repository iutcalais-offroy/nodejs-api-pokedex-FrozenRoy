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
 * Représente l'état d'un joueur dans une partie
 */
export interface PlayerGameState {
  userId: number
  username: string
  hand: GameCard[]
  handSize?: number // Pour l'adversaire, on ne montre que la taille de la main
}

/**
 * Représente l'état initial d'une partie
 */
export interface GameState {
  roomId: string
  player: PlayerGameState
  opponent: PlayerGameState
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
