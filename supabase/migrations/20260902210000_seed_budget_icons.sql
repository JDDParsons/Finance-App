update "finance-app"."Budgets"
set "icon" = case
  when lower("name") ~ '(grocer|food|supermarket|market)' then 'heroicons:shopping-cart-solid'
  when lower("name") ~ '(rent|mortgage|housing|home|house|apartment)' then 'heroicons:home-solid'
  when lower("name") ~ '(car|gas|fuel|transport|transit|parking|auto|vehicle|uber|lyft)' then 'streamline-ultimate:car-3-bold'
  when lower("name") ~ '(restaurant|dining|eat|takeout|takeaway|lunch|dinner|breakfast|cafe|coffee)' then 'heroicons:cake-solid'
  when lower("name") ~ '(utility|utilities|electric|hydro|internet|phone|bill|water|heat)' then 'heroicons:bolt-solid'
  when lower("name") ~ '(health|medical|doctor|pharmacy|dental|vision|clinic|hospital)' then 'heroicons:heart-solid'
  when lower("name") ~ '(cloth|fashion|apparel|shoes|shopping|wardrobe)' then 'heroicons:shopping-bag-solid'
  when lower("name") ~ '(saving|invest|rrsp|tfsa|emergency|retirement|fund)' then 'heroicons:banknotes-solid'
  when lower("name") ~ '(travel|vacation|holiday|flight|hotel|trip|air)' then 'heroicons:paper-airplane-solid'
  when lower("name") ~ '(gym|fitness|sport|workout|exercise|yoga|swim)' then 'heroicons:trophy-solid'
  when lower("name") ~ '(pet|dog|cat|vet|animal)' then 'heroicons:face-smile-solid'
  when lower("name") ~ '(educat|school|tuition|book|course|university|college|learn)' then 'heroicons:academic-cap-solid'
  when lower("name") ~ '(subscript|stream|netflix|spotify|membership|tv|media)' then 'heroicons:tv-solid'
  when lower("name") ~ '(insur|coverage|policy|protect)' then 'heroicons:shield-check-solid'
  when lower("name") ~ '(personal|beauty|hair|salon|spa|care|cosmetic)' then 'heroicons:sparkles-solid'
  when lower("name") ~ '(gift|present|donation|charity)' then 'heroicons:gift-solid'
  when lower("name") ~ '(child|kid|baby|daycare|school supply)' then 'heroicons:user-group-solid'
  when lower("name") ~ '(entertainment|fun|movie|concert|event|game|hobby)' then 'heroicons:film-solid'
  when lower("name") ~ '(tithe|offering|church|donate)' then 'teenyicons:church-solid'
  when lower("name") ~ '(misc|other|general|extra)' then 'heroicons:ellipsis-horizontal-circle-solid'
  else 'heroicons:wallet-solid'
end
where "icon" is null
  or btrim("icon") = ''
  or "icon" !~ '^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*$';
