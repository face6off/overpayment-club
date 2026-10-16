# Overpayment Club

A mortgage calculator built with HTML, CSS, and JavaScript. It compares a regular payment schedule with one that includes extra monthly payments.

## Features

- Calculate monthly payments, total interest, and payoff time
- Compare remaining balances on a chart
- Save up to six scenarios in the browser
- Export a monthly payment schedule as CSV
- Supports desktop and mobile layouts

## Run locally

Requires [Node.js](https://nodejs.org/) 20 or newer.

```sh
git clone https://github.com/face6off/overpayment-club.git
cd overpayment-club
node server.js
```

Open [localhost:3000](http://127.0.0.1:3000). On Windows, you can also run `start.cmd`. No packages need to be installed.

## Tests

```sh
node --test
```

Nine tests cover payment calculations, zero interest, extra payments, final-payment limits, invalid inputs, and CSV output. GitHub Actions runs the tests on pushes and pull requests.

## Calculation

```text
r = annual percentage rate / 1200
n = years × 12
payment = principal × r / (1 − (1 + r)^−n)
```

Interest is calculated from the remaining balance each month. Extra payments reduce principal. The final payment is capped at the amount owed. At 0% interest, payment is principal divided by the number of months.

## Limitations

The model uses a fixed rate, monthly compounding, and month-end payments. Amounts are in USD. It excludes taxes, insurance, fees, prepayment penalties, rate changes, and lender-specific rounding. Canadian semiannual compounding is not supported.

## Project structure

```text
index.html              Page structure and dialogs
src/app.js              Inputs, chart, scenarios, and CSV export
src/finance.js          Mortgage calculations
src/style.css           Layout and styling
test/finance.test.js    Calculation tests
server.js               Local server
```

## Data storage

Inputs and scenarios are stored in browser local storage. Clearing site data removes them. There are no bank connections or analytics. Fonts load from Google Fonts, with system fonts as a fallback.

## License

[MIT](LICENSE).
