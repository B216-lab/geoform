#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ci-integration-compose.yml"
PROJECT_NAME="${PROJECT_NAME:-geoform-integration}"
DB_NAME="${DB_NAME:-geoform_integration}"
DB_USER="${DB_USER:-geoform}"
MARKER="${INTEGRATION_TEST_MARKER:-integration-test-comment}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-$ROOT_DIR/.artifacts/integration}"
BACKEND_IMAGE_REF="${BACKEND_IMAGE_REF:-ghcr.io/b216-lab/backend:${BACKEND_IMAGE_TAG:-main}}"
BACKEND_BOOTSTRAP_IMAGE_REF="${BACKEND_BOOTSTRAP_IMAGE_REF:-ghcr.io/b216-lab/backend-bootstrap:${BACKEND_IMAGE_TAG:-main}}"

compose() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
}

collect_failure_artifacts() {
  mkdir -p "$ARTIFACTS_DIR"
  compose logs --no-color >"$ARTIFACTS_DIR/compose.log" 2>&1 || true
  compose ps >"$ARTIFACTS_DIR/compose-ps.log" 2>&1 || true
}

cleanup() {
  local status=$?
  if [[ $status -ne 0 ]]; then
    collect_failure_artifacts
  fi
  compose down -v --remove-orphans >/dev/null 2>&1 || true
}

psql_query() {
  local sql="$1"
  compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -F '|' -c "$sql"
}

trap cleanup EXIT

docker run --rm -v "$ROOT_DIR:/work" alpine:3.22 sh -lc 'rm -rf /work/.artifacts && mkdir -p /work/.artifacts/integration' >/dev/null
mkdir -p "$ARTIFACTS_DIR"

export BACKEND_IMAGE_REF
export BACKEND_BOOTSTRAP_IMAGE_REF
export INTEGRATION_TEST_MARKER="$MARKER"

compose up --build --wait --wait-timeout 240 postgres bootstrap backend frontend

compose run --rm --no-deps --build -e INTEGRATION_TEST_MARKER="$MARKER" playwright

submission_summary="$(psql_query "
  SELECT
    s.id,
    COALESCE(s.home_readable_address, ''),
    COALESCE(ss.code, ''),
    COALESCE(s.gender, ''),
    COALESCE(s.birthday::text, ''),
    COALESCE(s.movements_date::text, ''),
    COUNT(m.id),
    COUNT(m.departure_place),
    COUNT(m.destination_place),
    CASE WHEN s.home_address IS NULL THEN 0 ELSE 1 END
  FROM movements_form_submissions s
  LEFT JOIN social_statuses ss ON ss.id = s.social_status_id
  LEFT JOIN movements m ON m.movements_form_submission_id = s.id
  WHERE EXISTS (
    SELECT 1
    FROM movements flagged
    WHERE flagged.movements_form_submission_id = s.id
      AND flagged.comment = '$MARKER'
  )
  GROUP BY s.id, ss.code
  ORDER BY s.id DESC
  LIMIT 1;
")"

if [[ -z "$submission_summary" ]]; then
  echo "No persisted submission found for marker '$MARKER'." >&2
  exit 1
fi

IFS='|' read -r submission_id home_address social_status gender birthday movements_date movement_count departure_geo_count destination_geo_count home_geo_present <<<"$submission_summary"

[[ "$home_address" == "Russia, Irkutsk, Lenina street, 1" ]] || {
  echo "Unexpected home address: '$home_address'" >&2
  exit 1
}

[[ "$social_status" == "WORKING" ]] || {
  echo "Unexpected social status: '$social_status'" >&2
  exit 1
}

[[ "$gender" == "MALE" ]] || {
  echo "Unexpected gender: '$gender'" >&2
  exit 1
}

[[ "$birthday" == "1990-01-01" ]] || {
  echo "Unexpected birthday: '$birthday'" >&2
  exit 1
}

[[ "$movements_date" == "2026-03-20" ]] || {
  echo "Unexpected movements date: '$movements_date'" >&2
  exit 1
}

[[ "$movement_count" == "2" ]] || {
  echo "Expected 2 movements, got '$movement_count'" >&2
  exit 1
}

[[ "$departure_geo_count" == "2" ]] || {
  echo "Expected 2 persisted departure geographies, got '$departure_geo_count'" >&2
  exit 1
}

[[ "$destination_geo_count" == "2" ]] || {
  echo "Expected 2 persisted destination geographies, got '$destination_geo_count'" >&2
  exit 1
}

[[ "$home_geo_present" == "1" ]] || {
  echo "Expected submission home geography to be persisted." >&2
  exit 1
}

karl_arrival_count="$(psql_query "
  SELECT COUNT(*)
  FROM movements
  WHERE movements_form_submission_id = $submission_id
    AND destination_place_address = 'Russia, Irkutsk, Karl Marx street, 10';
")"

[[ "$karl_arrival_count" == "1" ]] || {
  echo "Expected one stored arrival at Karl Marx street, got '$karl_arrival_count'" >&2
  exit 1
}

home_arrival_count="$(psql_query "
  SELECT COUNT(*)
  FROM movements
  WHERE movements_form_submission_id = $submission_id
    AND destination_place_address = 'Russia, Irkutsk, Lenina street, 1';
")"

[[ "$home_arrival_count" == "1" ]] || {
  echo "Expected one stored arrival at home address, got '$home_arrival_count'" >&2
  exit 1
}

echo "Integration test passed: frontend submit reached backend and data was stored in Postgres."
