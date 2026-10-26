# Creates ORSync's individual Pro subscriptions in App Store Connect through
# the API (the same key the TestFlight builds use), idempotently: anything
# that already exists is left as is. Reports what it did and what's left.
#
#   Group "ORSync Pro"
#     orsync_pro_monthly  1 month  $4.99 (US base; other storefronts get
#                                         Apple's equalized prices)
#     orsync_pro_annual   1 year   $39.99
require "spaceship"
require "net/http"
require "json"
require "uri"

BUNDLE_ID = "com.stevennelson.orsync"
GROUP_NAME = "ORSync Pro"
PRODUCTS = [
  { id: "orsync_pro_monthly", name: "ORSync Pro Monthly", period: "ONE_MONTH", price: "4.99",
    desc: "Your preference cards backed up and synced on every device." },
  { id: "orsync_pro_annual", name: "ORSync Pro Annual", period: "ONE_YEAR", price: "39.99",
    desc: "A year of your preference cards backed up and synced everywhere." },
]
REVIEW_NOTE = "Pro backs up the user's personal preference-card library to ORSync Cloud and syncs it across their devices. Open Settings > Plan > See plans to find it."

token = Spaceship::ConnectAPI::Token.create(
  key_id: ENV.fetch("APP_STORE_CONNECT_API_KEY_ID"),
  issuer_id: ENV.fetch("APP_STORE_CONNECT_API_ISSUER_ID"),
  filepath: ENV.fetch("APP_STORE_CONNECT_API_KEY_PATH"),
)

def api(token, method, path, body = nil)
  uri = URI(path.start_with?("http") ? path : "https://api.appstoreconnect.apple.com#{path}")
  req = { get: Net::HTTP::Get, post: Net::HTTP::Post, patch: Net::HTTP::Patch }[method].new(uri)
  req["Authorization"] = "Bearer #{token.text}"
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

def all(token, path)
  out = []
  url = path
  while url
    page = api(token, :get, url)
    out.concat(page["data"] || [])
    url = page.dig("links", "next")
  end
  out
end

$report = []
def step(name)
  r = yield
  $report << "OK    #{name}#{r.is_a?(String) ? ": #{r}" : ''}"
  r
rescue StandardError => e
  $report << "FAIL  #{name}: #{e.message[0, 400]}"
  nil
end

app = api(token, :get, "/v1/apps?filter[bundleId]=#{BUNDLE_ID}")["data"].first or abort("app not found")
app_id = app["id"]
puts "App #{app.dig('attributes', 'name')} (#{app_id})"

group = step("subscription group") do
  existing = all(token, "/v1/apps/#{app_id}/subscriptionGroups").find { |g| g.dig("attributes", "referenceName") == GROUP_NAME }
  existing || api(token, :post, "/v1/subscriptionGroups", { data: { type: "subscriptionGroups",
    attributes: { referenceName: GROUP_NAME },
    relationships: { app: { data: { type: "apps", id: app_id } } } } })["data"]
end
abort($report.join("\n")) unless group
group_id = group["id"]

step("group display name (en-US)") do
  locs = all(token, "/v1/subscriptionGroups/#{group_id}/subscriptionGroupLocalizations")
  next "already set" if locs.any? { |l| l.dig("attributes", "locale") == "en-US" }
  api(token, :post, "/v1/subscriptionGroupLocalizations", { data: { type: "subscriptionGroupLocalizations",
    attributes: { locale: "en-US", name: GROUP_NAME, customAppName: "ORSync" },
    relationships: { subscriptionGroup: { data: { type: "subscriptionGroups", id: group_id } } } } })
  "created"
end

territories = step("territories") { all(token, "/v1/territories?limit=200") } || []

PRODUCTS.each_with_index do |p, i|
  sub = step("#{p[:id]}: subscription") do
    existing = all(token, "/v1/subscriptionGroups/#{group_id}/subscriptions").find { |s| s.dig("attributes", "productId") == p[:id] }
    existing || api(token, :post, "/v1/subscriptions", { data: { type: "subscriptions",
      attributes: { name: p[:name], productId: p[:id], subscriptionPeriod: p[:period], familySharable: false,
                    reviewNote: REVIEW_NOTE, groupLevel: i + 1 },
      relationships: { group: { data: { type: "subscriptionGroups", id: group_id } } } } })["data"]
  end
  next unless sub
  sid = sub["id"]
  puts "  #{p[:id]} state: #{sub.dig('attributes', 'state')}"

  step("#{p[:id]}: display name + description (en-US)") do
    locs = all(token, "/v1/subscriptions/#{sid}/subscriptionLocalizations")
    next "already set" if locs.any? { |l| l.dig("attributes", "locale") == "en-US" }
    api(token, :post, "/v1/subscriptionLocalizations", { data: { type: "subscriptionLocalizations",
      attributes: { locale: "en-US", name: p[:name], description: p[:desc] },
      relationships: { subscription: { data: { type: "subscriptions", id: sid } } } } })
    "created"
  end

  step("#{p[:id]}: available in every storefront") do
    api(token, :post, "/v1/subscriptionAvailabilities", { data: { type: "subscriptionAvailabilities",
      attributes: { availableInNewTerritories: true },
      relationships: {
        subscription: { data: { type: "subscriptions", id: sid } },
        availableTerritories: { data: territories.map { |t| { type: "territories", id: t["id"] } } },
      } } })
    "#{territories.size} territories"
  end

  step("#{p[:id]}: price #{p[:price]} USD + equalized worldwide") do
    existing = all(token, "/v1/subscriptions/#{sid}/prices?limit=200")
    next "already priced (#{existing.size} storefronts)" if existing.any?
    points = all(token, "/v1/subscriptions/#{sid}/pricePoints?filter[territory]=USA&limit=200")
    us = points.find { |pt| pt.dig("attributes", "customerPrice") == p[:price] } or raise "no US price point for #{p[:price]}"
    api(token, :post, "/v1/subscriptionPrices", { data: { type: "subscriptionPrices",
      attributes: { preserveCurrentPrice: false },
      relationships: {
        subscription: { data: { type: "subscriptions", id: sid } },
        subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: us["id"] } },
        territory: { data: { type: "territories", id: "USA" } },
      } } })
    eq = all(token, "/v1/subscriptionPricePoints/#{us['id']}/equalizations?limit=200")
    done = 1
    eq.each do |pt|
      terr = pt.dig("relationships", "territory", "data", "id")
      next if terr.nil? || terr == "USA"
      begin
        api(token, :post, "/v1/subscriptionPrices", { data: { type: "subscriptionPrices",
          attributes: { preserveCurrentPrice: false },
          relationships: {
            subscription: { data: { type: "subscriptions", id: sid } },
            subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: pt["id"] } },
            territory: { data: { type: "territories", id: terr } },
          } } })
        done += 1
      rescue StandardError
        # A storefront Apple won't price this way is skipped, not fatal.
      end
    end
    "#{done} storefronts"
  end
end

puts "\n==== App Store subscriptions report ===="
$report.each { |l| puts l }
puts "Still needed in App Store Connect: a review screenshot on each subscription, and adding both to the 1.0 version's In-App Purchases and Subscriptions section."
