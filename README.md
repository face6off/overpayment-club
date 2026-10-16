# Overpayment Club

A small mortgage calculator for a question that's hard to picture: what would an extra $250 a month actually change?

Enter a balance, rate, and remaining term, then try an extra monthly payment. The app compares the two payoff schedules and shows how much interest and time the extra payment could save. You can keep a few scenarios and export the full payment schedule to CSV.

Built with HTML, CSS, and plain JavaScript. No accounts, API keys, or dependencies to install.

## Run locally

You'll need [Node.js](https://nodejs.org/) 20 or newer.

```sh
git clone https://github.com/face6off/overpayment-club.git
cd overpayment-club
node server.js
```

Open [localhost:3000](http://127.0.0.1:3000). Stop the server with Ctrl+C. On Windows, `start.cmd` does the same thing.

Use the server rather than opening `index.html` directly; the JavaScript modules need to be served over HTTP.

## What's in v1

- Original vs. extra-payment balance curves
- Interest saved, earlier payoff, and monthly payment totals
- Optional spending changes you can add to the extra payment
- Up to six named scenarios, saved in your browser
- CSV export with every payment, its principal and interest, and the remaining balance
- A layout that works on phones as well as desktop

The example starts with a $320,000 balance at 5.25% over 25 years. Try changing the extra payment to zero to see the original plan.

## The calculation

The monthly payment uses the standard amortization formula:

```text
r = annual percentage rate / 1200
n = years × 12
payment = principal × r / (1 − (1 + r)^−n)
```

Each month, interest is calculated from the remaining balance. The rest of the payment, plus any extra, pays down principal. The final payment is capped at the amount still owed. At 0% interest, the regular payment is simply principal divided by the number of months.

The calculation lives in `src/finance.js`, separate from the interface. Both plans use the same loan inputs, and the app compares their total interest and number of payments. It keeps full precision during calculation and rounds the displayed amounts.

### What it leaves out

This version assumes a fixed rate, monthly compounding, and payments at the end of each month. All amounts are shown in USD. Taxes, insurance, fees, prepayment penalties, rate changes, and lender-specific rounding aren't included. Canadian semiannual compounding isn't supported yet.

It's useful for exploring a what-if, but an actual lender's schedule may differ. Check your mortgage's prepayment rules before using the results to plan a payment.

## Tests

```sh
node --test
```

There are nine calculation tests covering a known mortgage payment, zero interest, zero extra payments, early payoff, principal conservation, the final payment, invalid inputs, and CSV output. GitHub Actions runs them on pushes and pull requests.

## Files

```text
index.html              Page structure and dialogs
src/app.js              Inputs, chart, scenarios, and downloads
src/finance.js          Mortgage calculations
src/style.css           Layout and styling
test/finance.test.js    Calculation tests
server.js               Local development server
```

The chart is SVG, so there's no charting library. Scenario names are inserted as text, and stored scenarios are validated before loading.

## Saved data

Your inputs and scenarios stay in this browser's local storage. There are no bank connections or analytics. Clearing site data removes your scenarios, and blocked storage means they only last for the current session. The page loads fonts from Google Fonts, with system fonts as a fallback.

## Next up

- One-time lump-sum payments
- More compounding conventions
- Import and export for saved scenarios

## License

[MIT](LICENSE).
