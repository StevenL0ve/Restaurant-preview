# Rerun: withdraw build 117 from review and attach build 119.
# Prepares the ORSync App Store version for review through the App Store
# Connect API: verifies the draft and builds, then fills in everything the
# API allows. Each step is independent; a failure is reported and the rest
# continue. Never submits for review (that stays a button press).
#
#   APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_API_ISSUER_ID,
#   APP_STORE_CONNECT_API_KEY_PATH, ASC_CONTACT_PHONE (optional)
require "spaceship"

BUNDLE_ID = "com.stevennelson.orsync"
META = File.expand_path("metadata", __dir__)

def read(path)
  f = File.join(META, path)
  File.exist?(f) ? File.read(f).strip : nil
end

$report = []
def step(name)
  yield
  $report << "OK    #{name}"
rescue StandardError => e
  $report << "FAIL  #{name}: #{e.class}: #{e.message.to_s[0, 300]}"
end

Spaceship::ConnectAPI.token = Spaceship::ConnectAPI::Token.create(
  key_id: ENV.fetch("APP_STORE_CONNECT_API_KEY_ID"),
  issuer_id: ENV.fetch("APP_STORE_CONNECT_API_ISSUER_ID"),
  filepath: ENV.fetch("APP_STORE_CONNECT_API_KEY_PATH"),
)

app = Spaceship::ConnectAPI::App.find(BUNDLE_ID)
abort("App #{BUNDLE_ID} not found in App Store Connect") unless app
puts "App: #{app.name} (#{app.id}) #{app.bundle_id}"

version = app.get_edit_app_store_version(platform: Spaceship::ConnectAPI::Platform::IOS)
abort("No editable iOS version (draft) found. Create version 1.0 in App Store Connect first.") unless version
puts "Draft version: #{version.version_string}, state: #{version.app_store_state}"

require "net/http"
require "json"
def rest(method, path, body = nil)
  uri = URI("https://api.appstoreconnect.apple.com#{path}")
  req = { get: Net::HTTP::Get, post: Net::HTTP::Post, patch: Net::HTTP::Patch }[method].new(uri)
  req["Authorization"] = "Bearer #{Spaceship::ConnectAPI.token.text}"
  req["Content-Type"] = "application/json"
  req.body = JSON.generate(body) if body
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
  data = res.body.to_s.empty? ? {} : JSON.parse(res.body)
  return [res.code.to_i, data] if res.code.to_i.between?(200, 299) || res.code.to_i == 404
  raise "#{method.upcase} #{uri.path} -> #{res.code} " + (data["errors"] || []).map { |e| e["detail"] }.join(" | ")
end

# ---- Swap in a newer build while waiting for review ----
# fastlane/resubmit_with_build.txt names a build (e.g. 119). If the version
# is waiting for review with an older build, the review submission is
# withdrawn so that build can be attached; Submit is pressed again in App
# Store Connect (the subscriptions go with it there).
want = (File.read(File.expand_path("resubmit_with_build.txt", __dir__)).strip rescue "")
step("withdraw from review for build #{want}") do
  attached = (version.build.version rescue nil)
  if want.empty? || version.app_store_state != "WAITING_FOR_REVIEW" || attached.to_i >= want.to_i
    puts "  nothing to withdraw (state #{version.app_store_state}, attached #{attached || 'none'})"
    next
  end
  _, subs = rest(:get, "/v1/reviewSubmissions?filter[app]=#{app.id}&filter[state]=WAITING_FOR_REVIEW,READY_FOR_REVIEW")
  (subs["data"] || []).each do |sub|
    rest(:patch, "/v1/reviewSubmissions/#{sub['id']}", { data: { type: "reviewSubmissions", id: sub["id"], attributes: { canceled: true } } })
    puts "  withdrew review submission #{sub['id']}"
  end
  20.times do
    sleep 6
    version = app.get_edit_app_store_version(platform: Spaceship::ConnectAPI::Platform::IOS) || version
    break unless %w[WAITING_FOR_REVIEW].include?(version.app_store_state)
  end
  puts "  version state now: #{version.app_store_state}"
end

# ---- Builds: what's uploaded, and attach the newest valid 1.0 build ----
builds = []
step("list builds") do
  builds = Spaceship::ConnectAPI::Build.all(app_id: app.id, sort: "-uploadedDate", limit: 10)
  builds.each do |b|
    pre = (b.pre_release_version.version rescue "?")
    puts "  build #{b.version} (#{pre}) #{b.processing_state} uploaded #{b.uploaded_date}"
  end
end
step("current build on the draft") do
  attached = (version.build rescue nil)
  puts attached ? "  attached: build #{attached.version}" : "  attached: none"
end
step("attach newest valid build") do
  # Only builds made for this version (a 1.0.1 build can't go on 1.0).
  pick = builds.find { |b| b.processing_state == "VALID" && !b.expired && (b.pre_release_version.version rescue nil) == version.version_string }
  raise "no VALID #{version.version_string} build yet" unless pick
  version.select_build(build_id: pick.id)
  puts "  now attached: build #{pick.version}"
end

# ---- Version: copyright, manual release ----
step("version copyright + manual release") do
  version.update(attributes: { "copyright" => read("copyright.txt"), "releaseType" => "MANUAL" })
end

# ---- Version localization (en-US): description, keywords, promo, URLs ----
step("version text (description, keywords, promo, URLs)") do
  locs = version.get_app_store_version_localizations
  loc = locs.find { |l| l.locale == "en-US" } || locs.first
  raise "no version localization" unless loc
  attrs = {
    "description" => read("en-US/description.txt"),
    "keywords" => read("en-US/keywords.txt"),
    "promotionalText" => read("en-US/promotional_text.txt"),
    "supportUrl" => read("en-US/support_url.txt"),
  }
  m = read("en-US/marketing_url.txt")
  attrs["marketingUrl"] = m unless m.nil? || m.empty?
  loc.update(attributes: attrs)
end

# ---- App info: name, subtitle, privacy URL, categories, age rating ----
info = nil
step("fetch app info") { info = app.fetch_edit_app_info || app.fetch_live_app_info }
step("name, subtitle, privacy policy URL") do
  loc = info.get_app_info_localizations.find { |l| l.locale == "en-US" } || info.get_app_info_localizations.first
  loc.update(attributes: {
    "name" => read("en-US/name.txt"),
    "subtitle" => read("en-US/subtitle.txt"),
    "privacyPolicyUrl" => read("en-US/privacy_url.txt"),
  })
end
step("categories (Medical, Productivity)") do
  info.update_categories(category_id_map: { primary_category_id: "MEDICAL", secondary_category_id: "PRODUCTIVITY" })
end
step("age rating") do
  dec = info.fetch_age_rating_declaration
  dec.update(attributes: {
    "alcoholTobaccoOrDrugUseOrReferences" => "NONE",
    "contests" => "NONE",
    "gamblingSimulated" => "NONE",
    "horrorOrFearThemes" => "NONE",
    "matureOrSuggestiveThemes" => "NONE",
    "medicalOrTreatmentInformation" => "INFREQUENT_OR_MILD",
    "profanityOrCrudeHumor" => "NONE",
    "sexualContentGraphicAndNudity" => "NONE",
    "sexualContentOrNudity" => "NONE",
    "violenceCartoonOrFantasy" => "NONE",
    "violenceRealistic" => "NONE",
    "violenceRealisticProlongedGraphicOrSadistic" => "NONE",
    "gambling" => false,
    "unrestrictedWebAccess" => false,
  })
end

# ---- Content rights ----
step("content rights (no third-party content)") do
  app.update(attributes: { "contentRightsDeclaration" => "DOES_NOT_USE_THIRD_PARTY_CONTENT" })
end

# ---- App Review information: contact + demo account + notes ----
step("App Review information") do
  attrs = {
    "contactFirstName" => read("review_information/first_name.txt"),
    "contactLastName" => read("review_information/last_name.txt"),
    "contactEmail" => read("review_information/email_address.txt"),
    "demoAccountName" => read("review_information/demo_user.txt"),
    "demoAccountPassword" => read("review_information/demo_password.txt"),
    "demoAccountRequired" => true,
    "notes" => read("review_information/notes.txt"),
  }
  phone = ENV["ASC_CONTACT_PHONE"].to_s.strip
  attrs["contactPhone"] = phone unless phone.empty?
  detail = (version.fetch_app_store_review_detail rescue nil)
  if detail
    detail.update(attributes: attrs)
  else
    version.create_app_store_review_detail(attributes: attrs)
  end
  puts "  contact phone: #{phone.empty? ? 'NOT SET (add it in App Store Connect, or the ASC_CONTACT_PHONE secret)' : 'set'}"
end

# ---- Screenshots: 6.9" and 6.3" iPhone, 13" iPad (plain app captures) ----
SHOTS = {
  "APP_IPHONE_67" => "docs/store/raw",           # 1320 x 2868
  "APP_IPHONE_61" => "docs/store/iphone63",      # 1206 x 2622
  "APP_IPAD_PRO_3GEN_129" => "docs/store/ipad",  # 2064 x 2752
}
step("screenshots (iPhone 6.9\", iPhone 6.3\", iPad 13\")") do
  loc = version.get_app_store_version_localizations.find { |l| l.locale == "en-US" }
  sets = loc.get_app_screenshot_sets
  SHOTS.each do |type, dir|
    files = Dir[File.expand_path("../#{dir}/*.png", __dir__)].sort
    set = sets.find { |s| s.screenshot_display_type == type } ||
          loc.create_app_screenshot_set(attributes: { screenshotDisplayType: type })
    have = (set.app_screenshots || []).size
    if have >= files.size
      puts "  #{type}: #{have} already there"
      next
    end
    (set.app_screenshots || []).each(&:delete!)
    files.each { |f| set.upload_screenshot(path: f, wait_for_processing: false) }
    puts "  #{type}: uploaded #{files.size}"
  end
end

# ---- Price (Free) and availability (every storefront) ----
step("price: Free") do
  code, _ = rest(:get, "/v1/apps/#{app.id}/appPriceSchedule")
  if code == 200
    puts "  already set"
  else
    _, pts = rest(:get, "/v1/apps/#{app.id}/appPricePoints?filter[territory]=USA&limit=200")
    free = pts["data"].find { |pt| pt.dig("attributes", "customerPrice").to_f.zero? } or raise "no free price point"
    rest(:post, "/v1/appPriceSchedules", {
      data: { type: "appPriceSchedules", relationships: {
        app: { data: { type: "apps", id: app.id } },
        baseTerritory: { data: { type: "territories", id: "USA" } },
        manualPrices: { data: [{ type: "appPrices", id: "${free}" }] } } },
      included: [{ type: "appPrices", id: "${free}", attributes: { startDate: nil },
                   relationships: { appPricePoint: { data: { type: "appPricePoints", id: free["id"] } } } }] })
    puts "  set to Free"
  end
end
step("availability: every storefront") do
  code, _ = rest(:get, "/v1/apps/#{app.id}/appAvailabilityV2")
  if code == 200
    puts "  already set"
  else
    _, terr = rest(:get, "/v1/territories?limit=200")
    ids = terr["data"].map { |t| t["id"] }
    rest(:post, "/v2/appAvailabilities", {
      data: { type: "appAvailabilities", attributes: { availableInNewTerritories: true }, relationships: {
        app: { data: { type: "apps", id: app.id } },
        territoryAvailabilities: { data: ids.each_index.map { |i| { type: "territoryAvailabilities", id: "${t#{i}}" } } } } },
      included: ids.each_with_index.map { |t, i| { type: "territoryAvailabilities", id: "${t#{i}}",
        attributes: { available: true }, relationships: { territory: { data: { type: "territories", id: t } } } } } })
    puts "  #{ids.size} storefronts"
  end
end

puts "\n==== App Store Connect report ===="
$report.each { |l| puts l }
if %w[PREPARE_FOR_SUBMISSION DEVELOPER_REJECTED REJECTED METADATA_REJECTED].include?(version.app_store_state)
  puts "Version #{version.version_string} is NOT submitted; press Submit for Review in App Store Connect when ready."
else
  puts "Version #{version.version_string} is #{version.app_store_state}: its build is locked until it's removed from review or released."
end
