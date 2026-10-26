# Ships the version named in fastlane/release_request.txt (e.g. 1.0.1) to
# App Review through the App Store Connect API. Two phases, run around
# asc_prepare.rb (which fills the listing and attaches the build):
#
#   ruby fastlane/asc_release.rb prepare
#     - never-released app whose version is waiting for review: withdraw it
#       and rename it to the requested version (allowed before the first
#       release), so the new build can go on it
#     - app already approved or live: create the requested version
#     - version in review right now: stop and say so (Apple won't allow it)
#   With fastlane/release_hold.txt present, prepare instead withdraws the
#   version from review and submit does nothing: the app is being changed
#   and a new build goes on before it's resubmitted.
#   ruby fastlane/asc_release.rb submit
#     - adds the Pro subscriptions to the submission (they ride along with
#       the version the first time), then submits the version for review
require "spaceship"
require "net/http"
require "json"
require "uri"

BUNDLE_ID = "com.stevennelson.orsync"
MODE = ARGV[0] || "prepare"
REQUEST = File.expand_path("release_request.txt", __dir__)
abort("No fastlane/release_request.txt: nothing to release.") unless File.exist?(REQUEST)
TARGET = File.read(REQUEST).strip
HOLD = File.exist?(File.expand_path("release_hold.txt", __dir__))
NOTES = (File.read(File.expand_path("metadata/en-US/release_notes.txt", __dir__)).strip rescue "")

Spaceship::ConnectAPI.token = Spaceship::ConnectAPI::Token.create(
  key_id: ENV.fetch("APP_STORE_CONNECT_API_KEY_ID"),
  issuer_id: ENV.fetch("APP_STORE_CONNECT_API_ISSUER_ID"),
  filepath: ENV.fetch("APP_STORE_CONNECT_API_KEY_PATH"),
)

def api(method, path, body = nil)
  uri = URI(path.start_with?("http") ? path : "https://api.appstoreconnect.apple.com#{path}")
  req = { get: Net::HTTP::Get, post: Net::HTTP::Post, patch: Net::HTTP::Patch }[method].new(uri)
  req["Authorization"] = "Bearer #{Spaceship::ConnectAPI.token.text}"
  req["Content-Type"] = "application/json"
  req.body = JSON.generate(body) if body
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
  data = res.body.to_s.empty? ? {} : JSON.parse(res.body)
  unless res.code.to_i.between?(200, 299)
    errs = (data["errors"] || []).map { |e| "#{e['title']}: #{e['detail']}" }.join(" | ")
    raise "#{method.upcase} #{uri.path} -> #{res.code} #{errs}"
  end
  data
end

app = api(:get, "/v1/apps?filter[bundleId]=#{BUNDLE_ID}")["data"].first or abort("app not found")
APP_ID = app["id"]

def versions
  api(:get, "/v1/apps/#{APP_ID}/appStoreVersions?filter[platform]=IOS&limit=20")["data"].map do |v|
    { id: v["id"], version: v.dig("attributes", "versionString"), state: v.dig("attributes", "appStoreState") }
  end
end

def open_submissions
  api(:get, "/v1/reviewSubmissions?filter[app]=#{APP_ID}&filter[platform]=IOS&limit=20")["data"]
    .reject { |s| %w[COMPLETE CANCELING COMPLETING].include?(s.dig("attributes", "state")) }
end

EDITABLE = %w[PREPARE_FOR_SUBMISSION DEVELOPER_REJECTED REJECTED METADATA_REJECTED INVALID_BINARY].freeze
RELEASED = %w[READY_FOR_SALE PENDING_DEVELOPER_RELEASE PENDING_APPLE_RELEASE PROCESSING_FOR_APP_STORE REPLACED_WITH_NEW_VERSION].freeze

list = versions
puts "Requested version: #{TARGET}"
list.each { |v| puts "  version #{v[:version]}: #{v[:state]}" }
open_submissions.each { |s| puts "  review submission #{s['id']}: #{s.dig('attributes', 'state')}" }

if HOLD
  target = list.find { |v| v[:version] == TARGET }
  if MODE == "prepare" && target && %w[WAITING_FOR_REVIEW IN_REVIEW].include?(target[:state])
    open_submissions.each do |s|
      api(:patch, "/v1/reviewSubmissions/#{s['id']}", { data: { type: "reviewSubmissions", id: s["id"], attributes: { canceled: true } } })
      puts "Withdrew review submission #{s['id']} (#{TARGET})."
    end
    30.times do
      sleep 6
      target = versions.find { |v| v[:id] == target[:id] }
      break if EDITABLE.include?(target[:state])
    end
    puts "Version #{TARGET} is now #{target[:state]}."
  end
  puts "Release on hold (fastlane/release_hold.txt): not submitting."
  exit 0
end

if MODE == "prepare"
  target = list.find { |v| v[:version] == TARGET }
  if target
    puts "Version #{TARGET} already exists (#{target[:state]})."
    exit 0
  end
  released = list.any? { |v| RELEASED.include?(v[:state]) }
  pending = list.find { |v| !RELEASED.include?(v[:state]) }
  if pending && %w[IN_REVIEW].include?(pending[:state])
    abort("Version #{pending[:version]} is IN REVIEW right now; Apple doesn't allow changing it. Wait for the result, then run again.")
  end
  if pending && pending[:state] == "WAITING_FOR_REVIEW"
    open_submissions.each do |s|
      api(:patch, "/v1/reviewSubmissions/#{s['id']}", { data: { type: "reviewSubmissions", id: s["id"], attributes: { canceled: true } } })
      puts "Withdrew review submission #{s['id']} (#{pending[:version]})."
    end
    30.times do
      sleep 6
      pending = versions.find { |v| v[:id] == pending[:id] }
      break if EDITABLE.include?(pending[:state])
    end
    puts "Version #{pending[:version]} is now #{pending[:state]}."
  end
  if pending && !released && EDITABLE.include?(pending[:state])
    # Never released: the draft itself becomes the new version.
    api(:patch, "/v1/appStoreVersions/#{pending[:id]}", { data: { type: "appStoreVersions", id: pending[:id], attributes: { versionString: TARGET } } })
    puts "Renamed version #{pending[:version]} to #{TARGET} (the app hasn't been released yet)."
  elsif pending
    abort("Version #{pending[:version]} is #{pending[:state]}; finish or release it before #{TARGET}.")
  else
    made = api(:post, "/v1/appStoreVersions", { data: { type: "appStoreVersions",
      attributes: { platform: "IOS", versionString: TARGET, releaseType: "MANUAL" },
      relationships: { app: { data: { type: "apps", id: APP_ID } } } } })["data"]
    puts "Created version #{TARGET} (#{made['id']})."
    unless NOTES.empty?
      locs = api(:get, "/v1/appStoreVersions/#{made['id']}/appStoreVersionLocalizations")["data"]
      locs.each do |l|
        api(:patch, "/v1/appStoreVersionLocalizations/#{l['id']}", { data: { type: "appStoreVersionLocalizations", id: l["id"], attributes: { whatsNew: NOTES } } })
      end
      puts "Set What's New."
    end
  end
  exit 0
end

# ---- submit ----
target = list.find { |v| v[:version] == TARGET } or abort("No version #{TARGET} to submit.")
unless EDITABLE.include?(target[:state])
  puts "Version #{TARGET} is #{target[:state]}: nothing to submit."
  exit 0
end
build = api(:get, "/v1/appStoreVersions/#{target[:id]}/build")["data"] rescue nil
abort("No build attached to #{TARGET} yet (is it processed?).") unless build
puts "Build #{build.dig('attributes', 'version')} is attached to #{TARGET}."

# Release notes for an update (the first release has none).
if list.any? { |v| RELEASED.include?(v[:state]) } && !NOTES.empty?
  api(:get, "/v1/appStoreVersions/#{target[:id]}/appStoreVersionLocalizations")["data"].each do |l|
    next unless l.dig("attributes", "whatsNew").to_s.strip.empty?
    api(:patch, "/v1/appStoreVersionLocalizations/#{l['id']}", { data: { type: "appStoreVersionLocalizations", id: l["id"], attributes: { whatsNew: NOTES } } })
  end
end

# The first subscriptions go to review together with the version.
groups = api(:get, "/v1/apps/#{APP_ID}/subscriptionGroups")["data"]
groups.each do |g|
  api(:get, "/v1/subscriptionGroups/#{g['id']}/subscriptions")["data"].each do |s|
    state = s.dig("attributes", "state")
    name = s.dig("attributes", "productId")
    next puts("  #{name}: #{state}") unless state == "READY_TO_SUBMIT"
    begin
      api(:post, "/v1/subscriptionSubmissions", { data: { type: "subscriptionSubmissions",
        relationships: { subscription: { data: { type: "subscriptions", id: s["id"] } } } } })
      puts "  #{name}: added to the review"
    rescue StandardError => e
      puts "  #{name}: #{e.message[0, 300]}"
    end
  end
end

sub = open_submissions.find { |s| %w[READY_FOR_REVIEW UNRESOLVED_ISSUES].include?(s.dig("attributes", "state")) }
sub ||= api(:post, "/v1/reviewSubmissions", { data: { type: "reviewSubmissions", attributes: { platform: "IOS" },
  relationships: { app: { data: { type: "apps", id: APP_ID } } } } })["data"]
begin
  api(:post, "/v1/reviewSubmissionItems", { data: { type: "reviewSubmissionItems",
    relationships: { reviewSubmission: { data: { type: "reviewSubmissions", id: sub["id"] } },
                     appStoreVersion: { data: { type: "appStoreVersions", id: target[:id] } } } } })
  puts "Added version #{TARGET} to review submission #{sub['id']}."
rescue StandardError => e
  puts "Version item: #{e.message[0, 300]}"
end
api(:patch, "/v1/reviewSubmissions/#{sub['id']}", { data: { type: "reviewSubmissions", id: sub["id"], attributes: { submitted: true } } })
puts "SUBMITTED version #{TARGET} for App Review."
