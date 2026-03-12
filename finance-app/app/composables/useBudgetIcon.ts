const iconMap: { keywords: string[]; icon: string }[] = [
    { keywords: ['grocer', 'food', 'supermarket', 'market'], icon: 'heroicons:shopping-cart-solid' },
    { keywords: ['rent', 'mortgage', 'housing', 'home', 'house', 'apartment'], icon: 'heroicons:home-solid' },
    { keywords: ['car', 'gas', 'fuel', 'transport', 'transit', 'parking', 'auto', 'vehicle', 'uber', 'lyft'], icon: 'streamline-ultimate:car-3-bold' },
    { keywords: ['restaurant', 'dining', 'eat', 'takeout', 'takeaway', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee'], icon: 'heroicons:cake-solid' },
    { keywords: ['utility', 'utilities', 'electric', 'hydro', 'internet', 'phone', 'bill', 'water', 'heat', 'gas bill'], icon: 'heroicons:bolt-solid' },
    { keywords: ['health', 'medical', 'doctor', 'pharmacy', 'dental', 'vision', 'clinic', 'hospital'], icon: 'heroicons:heart-solid' },
    { keywords: ['cloth', 'fashion', 'apparel', 'shoes', 'shopping', 'wardrobe'], icon: 'heroicons:shopping-bag-solid' },
    { keywords: ['saving', 'invest', 'rrsp', 'tfsa', 'emergency', 'retirement', 'fund'], icon: 'heroicons:banknotes-solid' },
    { keywords: ['travel', 'vacation', 'holiday', 'flight', 'hotel', 'trip', 'air'], icon: 'heroicons:paper-airplane-solid' },
    { keywords: ['gym', 'fitness', 'sport', 'workout', 'exercise', 'yoga', 'swim'], icon: 'heroicons:trophy-solid' },
    { keywords: ['pet', 'dog', 'cat', 'vet', 'animal'], icon: 'heroicons:face-smile-solid' },
    { keywords: ['educat', 'school', 'tuition', 'book', 'course', 'university', 'college', 'learn'], icon: 'heroicons:academic-cap-solid' },
    { keywords: ['subscript', 'stream', 'netflix', 'spotify', 'membership', 'tv', 'media'], icon: 'heroicons:tv-solid' },
    { keywords: ['insur', 'coverage', 'policy', 'protect'], icon: 'heroicons:shield-check-solid' },
    { keywords: ['personal', 'beauty', 'hair', 'salon', 'spa', 'care', 'cosmetic'], icon: 'heroicons:sparkles-solid' },
    { keywords: ['gift', 'present', 'donation', 'charity'], icon: 'heroicons:gift-solid' },
    { keywords: ['child', 'kid', 'baby', 'daycare', 'school supply'], icon: 'heroicons:user-group-solid' },
    { keywords: ['entertainment', 'fun', 'movie', 'concert', 'event', 'game', 'hobby'], icon: 'heroicons:film-solid' },
    { keywords: ['misc', 'other', 'general', 'extra'], icon: 'heroicons:ellipsis-horizontal-circle-solid' },
    { keywords: ['tithe', 'offering', 'church', 'donate'], icon: 'teenyicons:church-solid' },
]

export function useBudgetIcon() {
    function budgetIcon(name: string): string {
        const lower = name.toLowerCase()
        for (const { keywords, icon } of iconMap) {
            if (keywords.some(k => lower.includes(k))) return icon
        }
        return 'heroicons:wallet-solid'
    }

    return { budgetIcon }
}
