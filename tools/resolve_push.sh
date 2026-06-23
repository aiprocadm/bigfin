cd "D:/Кодинг/Bigfin"
KNOWN="packages/server/src/common/types/Features.ts packages/server/src/modules/App/App.module.ts packages/webapp/src/constants/features.tsx packages/webapp/src/constants/sidebarMenu.tsx packages/webapp/src/routes/dashboard.tsx packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json"
echo "BRANCH | RESULT" > /tmp/resolve_results.txt
for b in feat/onec-export feat/zenmoney-integration feat/bank-api-tinkoff feat/acquiring-yookassa feat/marketplaces-integration feat/moysklad-integration; do
  git checkout -q "$b" 2>/dev/null
  if git merge origin/develop --no-edit > /tmp/mo 2>&1; then echo "$b | CLEAN-MERGE(pushing)"; echo "$b | CLEAN" >> /tmp/resolve_results.txt; git push -q 2>/dev/null; continue; fi
  conf=$(git diff --name-only --diff-filter=U)
  unknown=""
  for f in $conf; do echo "$KNOWN" | grep -qw "$f" || unknown="$unknown $f"; done
  if [ -n "$unknown" ]; then echo "$b | SKIP-unknown-conflict:$unknown"; echo "$b | SKIP (unknown:$unknown)" >> /tmp/resolve_results.txt; git merge --abort; continue; fi
  for f in $conf; do node tools/resolve_conflict.js "$f" 2>/dev/null; done
  if grep -rlq "^<<<<<<<\|^>>>>>>>" $conf 2>/dev/null; then echo "$b | FAIL-markers"; echo "$b | FAIL-markers" >> /tmp/resolve_results.txt; git merge --abort; continue; fi
  if ! node packages/webapp/scripts/lang-check.js > /tmp/lc 2>&1; then echo "$b | FAIL-langcheck"; echo "$b | FAIL-langcheck" >> /tmp/resolve_results.txt; git merge --abort; continue; fi
  if ! pnpm typecheck > "/tmp/tc_$(echo $b|tr / _).log" 2>&1; then echo "$b | FAIL-typecheck(left for manual)"; echo "$b | FAIL-typecheck" >> /tmp/resolve_results.txt; git merge --abort; continue; fi
  git add $KNOWN 2>/dev/null
  git commit --no-edit -q
  git push -q 2>/dev/null
  echo "$b | OK-resolved-pushed"; echo "$b | OK (resolved+pushed, NOT merged)" >> /tmp/resolve_results.txt
done
git checkout -q develop 2>/dev/null
echo "=== RESULTS ==="; cat /tmp/resolve_results.txt
