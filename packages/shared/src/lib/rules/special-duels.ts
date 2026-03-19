export type DuelCardClass = 'dragon' | 'fairy' | 'other'

const toDuelCardClass = (className: string): DuelCardClass => {
  if (className === 'dragon') {
    return 'dragon'
  }

  if (className === 'fairy') {
    return 'fairy'
  }

  return 'other'
}

export const compareDragonFairyDuel = (
  leftClassName: string,
  rightClassName: string,
): number | null => {
  const left = toDuelCardClass(leftClassName)
  const right = toDuelCardClass(rightClassName)

  // Fairy beats Dragon only.
  if (left === 'fairy' && right === 'dragon') {
    return 1
  }

  // Dragon loses only to Fairy.
  if (left === 'dragon' && right === 'fairy') {
    return -1
  }

  // Fairy loses against everything except Dragon.
  if (left === 'fairy' && right !== 'dragon') {
    return -1
  }

  // Everything except Dragon beats Fairy.
  if (right === 'fairy' && left !== 'dragon') {
    return 1
  }

  return null
}
