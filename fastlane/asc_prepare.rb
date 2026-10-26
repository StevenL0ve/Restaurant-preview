# Rerun: attach the newest processed build (build 114: App Store subscriptions).
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
  pick = builds.find { |b| b.processing_state == "VALID" && !b.expired }
  raise "no VALID build yet" unless pick
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

puts "\n==== App Store Connect report ===="
$report.each { |l| puts l }
puts "Version #{version.version_string} is NOT submitted; press Submit for Review in App Store Connect when ready."
