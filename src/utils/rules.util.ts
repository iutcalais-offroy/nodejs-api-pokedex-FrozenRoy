import { PokemonType } from '../generated/prisma/client'

/**
 * Règles du jeu Pokemon TCG
 * Contient les fonctions pures pour le calcul des dégâts et le système de types
 */

/**
 * Retourne la faiblesse principale d'un type Pokemon
 */
export function getWeakness(defenderType: PokemonType): PokemonType | null {
  switch (defenderType) {
    case PokemonType.Normal:
      return PokemonType.Fighting
    case PokemonType.Fire:
      return PokemonType.Water
    case PokemonType.Water:
      return PokemonType.Electric
    case PokemonType.Electric:
      return PokemonType.Ground
    case PokemonType.Grass:
      return PokemonType.Fire
    case PokemonType.Ice:
      return PokemonType.Fire
    case PokemonType.Fighting:
      return PokemonType.Psychic
    case PokemonType.Poison:
      return PokemonType.Psychic
    case PokemonType.Ground:
      return PokemonType.Water
    case PokemonType.Flying:
      return PokemonType.Electric
    case PokemonType.Psychic:
      return PokemonType.Dark
    case PokemonType.Bug:
      return PokemonType.Fire
    case PokemonType.Rock:
      return PokemonType.Water
    case PokemonType.Ghost:
      return PokemonType.Dark
    case PokemonType.Dragon:
      return PokemonType.Ice
    case PokemonType.Dark:
      return PokemonType.Fighting
    case PokemonType.Steel:
      return PokemonType.Fire
    case PokemonType.Fairy:
      return PokemonType.Poison
    default:
      return null
  }
}

/**
 * Calcule le multiplicateur de dégâts selon les types
 */
export function getDamageMultiplier(
  attackerType: PokemonType,
  defenderType: PokemonType,
): number {
  const weakness = getWeakness(defenderType)

  // Si le type de l'attaquant correspond à la faiblesse du défenseur
  if (weakness === attackerType) {
    return 2.0 // Super efficace (x2 dégâts)
  }

  return 1.0 // Dégâts normaux
}

/**
 * Calcule les dégâts infligés lors d'une attaque
 */
export function calculateDamage(
  attackerAttack: number,
  attackerType: PokemonType,
  defenderType: PokemonType,
): number {
  const multiplier = getDamageMultiplier(attackerType, defenderType)

  const damage = Math.floor(attackerAttack * multiplier)

  return Math.max(1, damage)
}
