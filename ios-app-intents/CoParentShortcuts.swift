// CoParent — Siri / App Intents scaffold (Phase 2).
//
// Add this file to the iOS app target in Xcode (ios/App). It exposes intents so
// users can ask Siri things like "Are the kids with me Saturday?" and get an
// answer without opening the app. The intent calls the CoParent backend (the
// same Supabase edge function the in-app assistant uses) and reads the result.
//
// Setup (after `npx cap add ios`):
//   1. Drag this file into the App target in Xcode.
//   2. Set the App Group / shared session so the native side can read the
//      signed-in user's token (store it in the Keychain from the web layer via
//      a small Capacitor plugin, or re-auth in the extension).
//   3. Build — the shortcuts appear in the Shortcuts app and Siri.
//
// This is a scaffold: wire BACKEND_URL + the auth token before shipping.

import AppIntents
import Foundation

private let BACKEND_URL = URL(string: "https://YOUR-PROJECT.functions.supabase.co/assistant")!

struct AskCoParentIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask CoParent"
    static var description = IntentDescription("Ask about your schedule, kids, events, or messages.")

    @Parameter(title: "Question")
    var question: String

    static var parameterSummary: some ParameterSummary {
        Summary("Ask CoParent \(\.$question)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        var req = URLRequest(url: BACKEND_URL)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // TODO: attach the signed-in user's Supabase access token:
        // req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["question": question])

        let (data, _) = try await URLSession.shared.data(for: req)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let answer = (json?["answer"] as? String) ?? "I couldn't reach your CoParent data."
        return .result(dialog: IntentDialog(stringLiteral: answer))
    }
}

struct CoParentShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AskCoParentIntent(),
            phrases: [
                "Ask \(.applicationName) a question",
                "\(.applicationName), are the kids with me",
                "Ask \(.applicationName) about my schedule"
            ],
            shortTitle: "Ask CoParent",
            systemImageName: "bubble.left.and.text.bubble.right"
        )
    }
}
