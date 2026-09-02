alter table "finance-app"."Account"
  add column if not exists color text,
  add column if not exists icon text;

alter table "finance-app"."Account"
  add constraint account_icon_allowed
  check (icon is null or icon in ('heroicons-solid:building-library', 'heroicons-solid:credit-card'));
