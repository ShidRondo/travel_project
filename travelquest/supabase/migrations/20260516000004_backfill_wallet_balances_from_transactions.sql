insert into wallets (user_id, available_balance, updated_at)
select
  user_id,
  greatest(
    coalesce(
      sum(
        case
          when direction = 'credit' then amount
          when direction = 'debit' then -amount
          else 0
        end
      ),
      0
    ),
    0
  ) as available_balance,
  now() as updated_at
from wallet_transactions
group by user_id
on conflict (user_id) do update
set
  available_balance = excluded.available_balance,
  updated_at = excluded.updated_at;
