import bmoLogo from '@/assets/images/BMO.png'
import questradeLogo from '@/assets/images/Questrade.png'
import scotiabankLogo from '@/assets/images/Scotiabank.png'

export function useInstitutionBranding() {
  function normalizedInstitution(institution: string | null | undefined, fallbackName?: string | null) {
    return (institution || fallbackName || '').toLowerCase()
  }

  function institutionLogo(institution: string | null | undefined, fallbackName?: string | null) {
    const name = normalizedInstitution(institution, fallbackName)
    if (name.includes('bmo')) return { src: bmoLogo, alt: 'BMO' }
    if (name.includes('questrade')) return { src: questradeLogo, alt: 'Questrade' }
    if (name.includes('scotia')) return { src: scotiabankLogo, alt: 'Scotiabank' }
    return null
  }

  function institutionIcon(institution: string | null | undefined, fallbackName?: string | null) {
    const name = normalizedInstitution(institution, fallbackName)
    if (!name) return 'heroicons-solid:credit-card'
    if (name.includes('bmo')) return 'heroicons-solid:building-library'
    if (name.includes('scotia') || name.includes('bank')) return 'heroicons-solid:building-library'
    if (name.includes('quest') || name.includes('invest')) return 'heroicons-solid:chart-bar'
    if (name.includes('visa') || name.includes('mastercard') || name.includes('card')) return 'heroicons-solid:credit-card'
    return 'heroicons-solid:banknotes'
  }

  function institutionBgClass(institution: string | null | undefined, fallbackName?: string | null) {
    const name = normalizedInstitution(institution, fallbackName)
    if (!name) return 'bg-primary-100 dark:bg-primary-900'
    if (name.includes('bmo')) return 'bg-secondary-100 dark:bg-secondary-900'
    if (name.includes('scotia')) return 'bg-error-100 dark:bg-error-900'
    return 'bg-primary-100 dark:bg-primary-900'
  }

  return {
    normalizedInstitution,
    institutionLogo,
    institutionIcon,
    institutionBgClass,
  }
}
