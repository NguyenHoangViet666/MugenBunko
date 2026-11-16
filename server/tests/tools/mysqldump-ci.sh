#!/usr/bin/env bash
# Use the service image's own client, without putting credentials in argv/logs.
set -euo pipefail

if [[ ${1-} != --defaults-extra-file=* ]]; then
    printf '%s\n' 'Expected the fixture client option file as the first argument.' >&2
    exit 64
fi
option_file=${1#--defaults-extra-file=}
shift
if [[ ! -f $option_file || ! ${MYSQL_TEST_CONTAINER-} =~ ^[a-f0-9]{12,64}$ ]]; then
    printf '%s\n' 'Invalid fixture option file or CI service container.' >&2
    exit 64
fi

container_script=$(cat <<'SH'
set -eu
umask 077
config_file=$(mktemp /tmp/mugenbunko-dump.XXXXXX)
trap 'rm -f -- "$config_file"' EXIT HUP INT TERM
cat > "$config_file"
# The original fixture file addresses the runner's mapped port. Inside the
# service container, connect to its own loopback listener instead.
mysqldump --defaults-extra-file="$config_file" --host=127.0.0.1 --port=3306 "$@"
SH
)
docker exec -i "$MYSQL_TEST_CONTAINER" sh -c "$container_script" dump-ci "$@" < "$option_file"
