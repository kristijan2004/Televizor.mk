# Display.mk — AI Agent Instructions

## Project

This is Display.mk (public domain: display.mk, registered 2026-10-06), a Macedonian TV comparison website.

The goal is to build a useful website where users in North Macedonia can:

* Browse TV models
* Compare up to 3 TVs
* Open detailed specifications for each TV
* Filter TVs by size and other specifications
* Understand TV technologies such as OLED, QLED, Mini LED, HDR, VRR, ALLM, etc.
* Eventually see TVs available from Macedonian retailers

The visible website interface should use **Macedonian Cyrillic**.

## Project location

The project is located at:

`/projects/DisplayMk-master`

The host path is:

`/run/media/kiko/Kingston 120/DisplayMk-master`

When working inside OpenHands, always verify the current working directory and project location before making changes.

## Important working rule

Before modifying files:

1. Inspect the existing implementation.
2. Understand how the relevant feature currently works.
3. Make the smallest sensible change.
4. Do not unnecessarily rewrite working code.
5. Preserve existing functionality.
6. After changes, test the affected functionality.

Do not delete or replace large parts of the project without first explaining why.

## Technology

The project currently uses:

* React
* React Router
* styled-components
* React Context
* JSON data files
* react-scripts

Do not introduce a new framework or completely change the architecture unless explicitly requested.

## TV data

TV information is stored in JSON files.

The project has retailer scraping scripts and a master TV data-building pipeline.

Important scripts include:

* `scripts/scrapeAnhoch.js`
* `scripts/scrapeDDStore.js`
* `scripts/scrapeNeptun.js`
* `scripts/scrapeSetec.js`
* `scripts/buildMasterTvs.js`
* `scripts/mergeTvLists.js`

The main application data is currently generated into:

`src/data/masterTvs.json`

The application Context currently uses the master TV data.

Before changing the data pipeline, inspect the actual current files because filenames and paths may have changed.

## Retailers

The project is intended to work with Macedonian retailers including:

* Anhoch
* Neptun
* DDStore
* Setec

When scraping or comparing retailer data:

* Do not invent TV models or specifications.
* Preserve the original retailer information where possible.
* Normalize data consistently.
* Avoid duplicate TV models.
* Be careful with model numbers.
* Distinguish different screen sizes as different models/variants when appropriate.
* Do not assume that similarly named models are identical.

## TV specification consistency

Keep specification values consistent across all TVs.

Important fields may include:

* id
* brand
* model
* size
* technology
* resolution
* refreshRate
* year
* os
* hdr
* dolbyVision
* hdmi
* usb
* vrr
* allm
* pictureProcessor
* hdrFormats
* brightness
* audioPower
* audioChannels
* dolbyAtmos
* freeSync
* gSync

Before adding a new field, check whether an equivalent field already exists.

Do not mix different representations unnecessarily. For example, if a field uses boolean values, do not introduce `"DA"` for some TVs and `true` for others unless the application explicitly requires it.

## Current UI preferences

The user prefers a clean, modern TV comparison interface.

Current preferences include:

* Macedonian Cyrillic for visible UI text
* No prices displayed on TV tiles for now
* Up to 3 TVs can be compared
* Floating comparison bar when TVs are selected
* TV tiles should open the TV details page
* Detail pages should have useful explanations/tooltips for technical terms
* The website should work well on desktop and mobile
* Avoid unnecessary navigation buttons
* The logo should provide a way back to the TV listing/home page
* Avoid horizontal overflow
* Keep the design polished and simple

Do not add prices to TV cards unless explicitly requested.

## Navigation

The desired TV details route is based on brand/model rather than only a numeric ID.

Preferred pattern:

`/tv/:brand/:model`

When navigating back from TV details, the user wants to return directly to the main TV listing/home page.

## Comparison

Users should be able to select up to 3 TVs.

The comparison UI should:

* Clearly show selected TVs
* Allow removing a selected TV
* Prevent accidental duplicate selections
* Remain usable on smaller screens
* Not break the normal TV listing

When changing comparison logic, test:

* Selecting one TV
* Selecting multiple TVs
* Selecting the same TV twice
* Removing a TV
* Selecting a fourth TV
* Applying filters while TVs are selected

## Filters

The TV listing has size filtering.

Currently relevant sizes include:

* 43"
* 55"
* 65"
* 85"

Do not add a 32" filter unless explicitly requested.

When changing filters, make sure filtering does not accidentally remove or corrupt the underlying TV data.

## Images

TV models should eventually have appropriate images.

For now, a shared/reusable placeholder image is acceptable if necessary.

Do not spend time replacing every image unless explicitly requested.

## Retailer scraping

When working on retailer scraping:

1. Inspect the current website structure.
2. Check whether data is loaded in HTML, JSON, API/XHR, or another method.
3. Reuse existing scraper patterns where possible.
4. Do not modify working scrapers unnecessarily.
5. Save output in the format expected by the existing pipeline.
6. Test the scraper with a small amount of data before doing a full scrape.

Do not assume a website's API endpoint without inspecting the actual site/network behavior.

## Browser research

The eventual goal is for the AI agent to help inspect Macedonian retailer websites and compare their TV inventories with the project's existing TV list.

When doing this:

* First inspect the existing project data.
* Then inspect the retailer.
* Identify models already present.
* Identify genuinely new models.
* Check model numbers carefully.
* Report uncertainty instead of guessing.

Do not automatically add data to the project until the user asks for the modification, unless the user explicitly authorizes automatic updating.

## Commands

Before running potentially destructive commands, explain what they will do.

Safe examples:

```bash
pwd
ls
ls -la
find
cat
grep
npm test
npm run build
```

Be careful with:

* `rm`
* recursive deletion
* `git reset`
* disk operations
* package removal
* overwriting large files

Never delete user data or unrelated files.

## Git

The project contains a Git repository.

Before making a large change, inspect:

```bash
git status
```

Do not perform destructive Git operations unless explicitly instructed.

Do not discard existing user changes.

## Testing

After modifying code:

* Run the relevant test/build command when practical.
* Check for JavaScript/React errors.
* Verify imports and filenames, including capitalization.
* Check that routes still work.
* Check that the application builds.

A previous issue occurred because `InfoToolTip` and `InfoTooltip` capitalization differed. Linux filesystems are case-sensitive, so always verify exact filenames.

## Existing architecture

Important application pieces include:

* `src/App.js`
* `src/Context.js`
* `src/components/Navigation`
* `src/components/SubNavigation`
* `src/components/TileCont`
* `src/components/CompareBar`
* `src/components/Compare`
* `src/components/TvDetails`
* `src/components/InfoToolTip`
* `src/pages/Home`
* `src/data/masterTvs.json`

These names are based on the current project state. Always inspect the filesystem before assuming a file still exists at the exact path.

## Development philosophy

The user is not trying to become a programmer and prefers practical, step-by-step help.

When working autonomously:

* Explain what you are doing in simple terms.
* Prefer small, verifiable changes.
* Do not overwhelm the user with unnecessary technical details.
* If something is unclear, inspect the project before asking the user.
* If an operation could cause data loss, ask before doing it.
* When finished, clearly state what changed and how it was tested.

## Main long-term goal

Build a reliable Macedonian TV comparison website with automated retailer data collection.

The eventual workflow should be approximately:

Macedonian retailers
→ scrape/inspect TV listings
→ normalize TV information
→ detect new/changed models
→ update master TV data
→ website displays the updated TVs
→ users compare TVs

The agent should help develop and maintain this workflow while preserving the existing application.
