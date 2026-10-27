# Nation State baseline provenance and model boundary

The `src/state-sim/baselines.json` file preserves 2023 nominal GDP (current US dollars) and population observations for USA, India, Nepal, Germany and Saudi Arabia. Retrieved on 2026-10-27 from the public datasets mirrors of World Bank World Development Indicators:

- https://github.com/datasets/gdp/blob/main/data/gdp.csv — World Bank NY.GDP.MKTP.CD
- https://github.com/datasets/population/blob/main/data/population.csv — World Bank SP.POP.TOTL
- Original indicator pages: https://data.worldbank.org/indicator/NY.GDP.MKTP.CD and https://data.worldbank.org/indicator/SP.POP.TOTL
- World Bank data terms: https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets (attribution: World Bank, World Development Indicators; no endorsement).

Mirror observations can differ from later World Bank revisions. These are historical baselines, not current statistics or a full reproduction of the 2023 national accounts. Country boundaries are Natural Earth public-domain polygons, hosted at `/data/countries.geojson` with separate attribution.

Initial policy, exchange-rate levels, reserves, debt ratios, exposures and behavioural coefficients are explicitly illustrative calibration. In particular, initial NPR/USD is scenario INR/USD × 1.6, not a claimed observed annual average. Country income labels are descriptive scenario roles rather than a replacement for World Bank income classifications.

No live news, current leaders, military data, real negotiation endpoints or language-model service is connected. Diplomacy uses local utility/rule-based agents. An IMF-style facility is a game approximation, not an official financing programme. See the in-game Model tab and README for equations and limitations.
