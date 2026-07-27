# Google Sheet → GYM-APP demo data

The demo reads its content (café menu, trainers, classes, shop) from a Google
Sheet so you can edit data without touching code.

## Setup (one time)

1. Create a Google Sheet (any name, e.g. **GYM-APP Data**).
2. Create **4 tabs** named exactly: `Menu`, `Trainers`, `Classes`, `Shop`.
3. Row 1 of each tab = the column headers below (exact names, any order).
4. Share → **Anyone with the link: Viewer**.
5. Copy the sheet ID from the URL
   (`https://docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`)
   and paste it into `SHEET_ID` at the top of `app.js`. Redeploy.

The app fetches each tab as CSV on load. If the sheet is unreachable or
`SHEET_ID` is empty, it falls back to built-in mock data — the demo never breaks.

## Tab: Menu

| category | name | price | calories | protein | carbs | fat | allergens |
|---|---|---|---|---|---|---|---|
| Shakes | Whey Protein Shake | 6 | 220 | 32 | 12 | 4 | milk |
| Meals | Grilled Chicken Bowl | 12 | 540 | 45 | 52 | 14 | |
| Drinks | Iced Matcha | 5 | 90 | 2 | 18 | 1 | |

## Tab: Trainers

`availability` must be one of: `available`, `busy`, `off`.
`status` is the label shown (optional — a default is derived from availability).

| name | specialty | languages | price | rating | availability | status |
|---|---|---|---|---|---|---|
| Karim H. | Strength · Powerlifting | AR EN | 35 | 4.9 | available | Available now |
| Maya R. | Functional · Mobility | AR EN FR | 30 | 4.8 | busy | With a client · free 4:30 PM |
| Rita S. | Pilates · Core | AR FR | 32 | 5.0 | off | Not working today |

## Tab: Classes

`spots` = places left (0 shows "Full" + waitlist button).

| name | when | instructor | spots |
|---|---|---|---|
| HIIT Burn | Today · 7:00 PM | Tony A. | 4 |
| Reformer Pilates | Tomorrow · 9:00 AM | Rita S. | 0 |

## Tab: Shop

| category | name | price | note |
|---|---|---|---|
| Supplements | Whey Isolate 2 kg | 55 | Chocolate · vanilla · member price |
| Gear | GYM Shaker 700 ml | 9 | Club green |

## Notes

- Prices are USD numbers only (no `$`).
- The sheet is **content only**. Check-ins, wallet, lockers and visits stay in
  the app (and later in the real backend) — a spreadsheet can't safely handle
  concurrent access control or payments.
