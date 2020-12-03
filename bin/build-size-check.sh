#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

set -eo pipefail

npm install

npm run build:qt
qt_size=$(wc -c ./dist/glean.js | awk '{print $1}')
qt_size_pretty=$(wc -c ./dist/glean.js | awk '{printf "%0.2f\n",$1/1024"."substr($2,1,2)}')

npm run build:browser
browser_size=$(wc -c ./dist/glean.js | awk '{print $1}')
browser_size_pretty=$(wc -c ./dist/glean.js | awk '{printf "%0.2f\n",$1/1024"."substr($2,1,2)}')

git checkout -t origin/main

npm install

npm run build:qt
qt_size_main=$(wc -c ./dist/glean.js | awk '{print $1}')
qt_size_main_pretty=$(wc -c ./dist/glean.js | awk '{printf "%0.2f\n",$1/1024"."substr($2,1,2)}')

npm run build:browser
browser_size_main=$(wc -c ./dist/glean.js | awk '{print $1}')
browser_size_main_pretty=$(wc -c ./dist/glean.js | awk '{printf "%0.2f\n",$1/1024"."substr($2,1,2)}')

qt_diff=$(((($qt_size-$qt_size_main)%$qt_size_main)*100))
browser_diff=$(((($browser_size-$browser_size_main)%$browser_size_main)*100))

[[ $qt_diff -ge 0 ]] && qt_emoji="📈" || qt_emoji="📉"
[[ $qt_diff -ge 0 ]] && qt_result="Increase" || qt_result="Decrease"

[[ $browser_diff -ge 0 ]] && browser_emoji="📈" || browser_emoji="📉"
[[ $browser_diff -ge 0 ]] && browser_result="Increase" || browser_result="Decrease"

content="
  # Build size report

  Merging $CIRCLE_PULL_REQUEST into [main](https://github.com/brizental/glean.js) will:

  * **$browser_result** the size of the browser build (\`npm run build:browser\`) by \`${browser_diff}%\`.
  * **$qt_result** the size of the Qt build (\`npm run build:qt\`) by \`${qt_diff}%\`.

  ---

  | Build | Current size | New size | Size increase |
  |--:|:---:|:---:|:---:|
  | browser | ${browser_size_main_pretty}K | ${browser_size_pretty}K | $browser_emoji ${browser_diff}% |
  | qt | ${qt_size_main_pretty}K | ${qt_size_pretty}K | $qt_emoji ${qt_diff}% |
"

# The following is copied over from
# https://support.circleci.com/hc/en-us/articles/360048170573-Auto-comment-on-GitHub-Pull-Requests

sudo apt-get install jq

pr_response=$(curl --location --request GET "https://api.github.com/repos/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/pulls?head=$CIRCLE_PROJECT_USERNAME:$CIRCLE_BRANCH&state=open" \
-u $GH_USER:$GH_TOKEN)

if [ $(echo $pr_response | jq length) -eq 0 ]; then
  echo "No PR found to update"
else
  pr_comment_url=$(echo $pr_response | jq -r ".[]._links.comments.href")
fi

request=$(jq -n "{
  \"body\":  \"$content\"
}")

curl --location --request POST "$pr_comment_url" \
-u $GH_USER:$GH_TOKEN \
--header 'Content-Type: application/json' \
--data-raw "$request"
