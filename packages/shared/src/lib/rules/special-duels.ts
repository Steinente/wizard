export type DuelCardClass = 'dragon' | 'fairy' | 'witch' | 'other'

const toDuelCardClass = (className: string): DuelCardClass => {
  if (className === 'dragon') {
    return 'dragon'
  }

  if (className === 'fairy') {
    return 'fairy'
  }

  if (className === 'witch') {
    return 'witch'
  }

  return 'other'
}

export const compareDragonFairyDuel = (
  leftClassName: string,
  rightClassName: string,
): number | null => {
  const left = toDuelCardClass(leftClassName)
  const right = toDuelCardClass(rightClassName)

  // Fairy beats Dragon and Witch.
  if (left === 'fairy' && right === 'dragon') {
    return 1
  }

  if (left === 'fairy' && right === 'witch') {
    return 1
  }

  // Dragon loses only to Fairy.
  if (left === 'dragon' && right === 'fairy') {
    return -1
  }

  // Witch loses to Fairy.
  if (left === 'witch' && right === 'fairy') {
    return -1
  }

  // Witch loses against everything.
  if (left === 'witch' && right !== 'witch') {
    return -1
  }

  if (right === 'witch' && left !== 'witch') {
    return 1
  }

  // Fairy loses against everything except Dragon and Witch.
  if (left === 'fairy' && right !== 'dragon' && right !== 'witch') {
    return -1
  }

  // Everything except Dragon and Witch beats Fairy.
  if (right === 'fairy' && left !== 'dragon' && left !== 'witch') {
    return 1
  }

  return null
}
