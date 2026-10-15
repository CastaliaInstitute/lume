(() => {
  const annotation = /^(?:graf|comte|count|earl|baron|lord|lady|emperor|empress|king|queen|pharaoh|pope|sultan|caliph|of\b|b\.?\s*\d{3,4}|d\.?\s*\d{3,4}|\d{3,4}(?:\s*[-–]\s*\d{2,4})?)/i

  function displayFacultyName(person = {}) {
    const raw = String(person.name || '').trim()
    const surname = String(person.surname || '').trim()
    if (!raw) return surname

    const parts = raw.split(/\s*,\s*/).filter(Boolean)
    if (parts.length > 1) {
      const family = parts[0]
      const tail = parts.slice(1)
      if (tail.some(part => /^(?:emperor|empress|king|queen|pharaoh|pope)\b/i.test(part))) return family

      const given = tail.filter(part => !annotation.test(part)).join(' ').trim()
      if (!given) return family
      const familyTokens = family.toLocaleLowerCase().split(/\s+/)
      const givenTokens = given.split(/\s+/)
      while (givenTokens.length && familyTokens.includes(givenTokens[givenTokens.length - 1].toLocaleLowerCase())) givenTokens.pop()
      const cleanGiven = givenTokens.join(' ').trim()
      return [cleanGiven, family].filter(Boolean).join(' ')
    }

    if (!surname || raw.toLocaleLowerCase().endsWith(surname.toLocaleLowerCase())) return raw
    return `${raw} ${surname}`.trim()
  }

  window.castaliaFacultyName = displayFacultyName
})()
