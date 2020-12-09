#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

set -eo pipefail

npm install

npm run build:qt
qt_size=$(wc -c ./dist/glean.js | awk '{print $1}')
qt_size_pretty=$(wc -c ./dist/glean.js | awk '{printf "%0.2f\n",$1/1024"."substr($2,1,2)}')

npm run build:webext
webext_size=$(wc -c ./dist/glean.js | awk '{print $1}')
webext_size_pretty=$(wc -c ./dist/glean.js | awk '{printf "%0.2f\n",$1/1024"."substr($2,1,2)}')

git branch -f original-main origin/main
# TODO: This is done in case there were changes to the package.json,
# we should find a better way to deal with that though.
# See: [Bug 1681484](https://bugzilla.mozilla.org/show_bug.cgi?id=1681484)
git reset --hard HEAD
git checkout original-main

npm install

npm run build:qt
qt_size_main=$(wc -c ./dist/glean.js | awk '{print $1}')
qt_size_main_pretty=$(wc -c ./dist/glean.js | awk '{printf "%0.2f\n",$1/1024"."substr($2,1,2)}')

npm run build:webext
webext_size_main=$(wc -c ./dist/glean.js | awk '{print $1}')
webext_size_main_pretty=$(wc -c ./dist/glean.js | awk '{printf "%0.2f\n",$1/1024"."substr($2,1,2)}')

qt_diff=$(((($qt_size-$qt_size_main)%$qt_size_main)*100))
webext_diff=$(((($webext_size-$webext_size_main)%$webext_size_main)*100))

[[ $qt_diff -ge 0 ]] && qt_emoji="📈" || qt_emoji="📉"
[[ $qt_diff -ge 0 ]] && qt_result="Increase" || qt_result="Decrease"

[[ $webext_diff -ge 0 ]] && webext_emoji="📈" || webext_emoji="📉"
[[ $webext_diff -ge 0 ]] && webext_result="Increase" || webext_result="Decrease"

content="
  # Build size report

  Merging $CIRCLE_PULL_REQUEST into [main](https://github.com/brizental/glean.js) will:

  * **$webext_result** the size of the webext build (\`npm run build:webext\`) by \`${webext_diff}%\`.
  * **$qt_result** the size of the Qt build (\`npm run build:qt\`) by \`${qt_diff}%\`.

  ---

  | Build | Current size | New size | Size increase |
  |--:|:---:|:---:|:---:|
  | webext | ${webext_size_main_pretty}K | ${webext_size_pretty}K | $webext_emoji ${webext_diff}% |
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
