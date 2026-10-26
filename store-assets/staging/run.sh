#!/bin/zsh
# Starts the staging proxy for the wallets the capture flows onboard. Only their
# two public addresses leave the e2e env file; the seeds stay behind.
#
#   store-assets/staging/run.sh                    # global set
#   STAGING_REGION=uk store-assets/staging/run.sh  # App Store U.K. set
here=${0:A:h}
envfile=$here/../../apps/mobile/.maestro/.env.test
[[ -f $envfile ]] || { print -u2 "missing $envfile (copy .env.test.example)"; exit 1; }
export SALMON_TEST_WALLET_A_ADDR=$(zsh -c 'set -a; . "$1"; print -r -- $SALMON_TEST_WALLET_A_ADDR' _ $envfile)
export SALMON_SEED_VAULT_ADDR=$(zsh -c 'set -a; . "$1"; print -r -- $SALMON_SEED_VAULT_ADDR' _ $envfile)
exec node $here/proxy.mjs
