import AppIntents
import ExtensionFoundation
import Foundation

// Siri & Shortcuts for Dayflow. Runs without opening the app:
//  - "Add to Dayflow": saves a thought to the shared App Group; the app moves it
//    into the Inbox the next time it opens (services/widgets.ts → drainPendingInbox).
//  - "What's next in Dayflow": reads the plan the app shares with its widgets.

private let appGroup = "group.com.nexa.dayflow"
private let pendingKey = "pendingInbox"

@main
struct DayflowIntentsExtension: AppIntentsExtension {}

// MARK: - Shared data (written by the app, see services/widgetData.ts)

private struct SharedTask: Decodable {
  let title: String
  let start: Double
  let end: Double
  let done: Bool
}

private struct SharedPayload: Decodable {
  let tasks: [SharedTask]
  let labels: [String: String]?
}

private func loadPayload() -> SharedPayload? {
  guard
    let raw = UserDefaults(suiteName: appGroup)?.string(forKey: "widgetData"),
    let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(SharedPayload.self, from: data)
}

private func timeString(_ date: Date) -> String {
  let f = DateFormatter()
  f.timeStyle = .short
  f.dateStyle = .none
  return f.string(from: date)
}

// MARK: - Add to Inbox

struct AddToInboxIntent: AppIntent {
  static var title: LocalizedStringResource = "Add to Dayflow"
  static var description = IntentDescription("Save a thought to your Dayflow Inbox before it slips away.")

  @Parameter(title: "Thought", requestValueDialog: IntentDialog("What should I add?"))
  var text: String

  static var parameterSummary: some ParameterSummary {
    Summary("Add \(\.$text) to Dayflow")
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let thought = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !thought.isEmpty else { return .result(dialog: "Nothing to add.") }
    let defaults = UserDefaults(suiteName: appGroup)
    var pending: [String] = []
    if let raw = defaults?.string(forKey: pendingKey),
       let data = raw.data(using: .utf8),
       let list = try? JSONDecoder().decode([String].self, from: data) {
      pending = list
    }
    pending.append(String(thought.prefix(200)))
    if let data = try? JSONEncoder().encode(Array(pending.suffix(50))), let raw = String(data: data, encoding: .utf8) {
      defaults?.set(raw, forKey: pendingKey)
    }
    return .result(dialog: "Added to your Dayflow Inbox.")
  }
}

// MARK: - What's next

struct WhatsNextIntent: AppIntent {
  static var title: LocalizedStringResource = "What's next in Dayflow"
  static var description = IntentDescription("Hear what you're doing now and what's coming up.")

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let now = Date().timeIntervalSince1970
    let open = (loadPayload()?.tasks ?? []).filter { !$0.done }.sorted { $0.start < $1.start }
    if let current = open.first(where: { $0.start <= now && $0.end > now }) {
      let left = max(1, Int(((current.end - now) / 60).rounded(.up)))
      let next = open.first(where: { $0.start >= current.end })
      let tail = next.map { " Next: \($0.title) at \(timeString(Date(timeIntervalSince1970: $0.start)))." } ?? ""
      return .result(dialog: "Now: \(current.title), \(left) minutes left.\(tail)")
    }
    if let next = open.first(where: { $0.start > now }) {
      return .result(dialog: "Next up: \(next.title) at \(timeString(Date(timeIntervalSince1970: next.start))).")
    }
    return .result(dialog: "Nothing else planned. Enjoy the free time.")
  }
}

// MARK: - Siri phrases

struct DayflowShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddToInboxIntent(),
      phrases: [
        "Add to \(.applicationName)",
        "Add a thought to \(.applicationName)",
        "Brain dump in \(.applicationName)",
      ],
      shortTitle: "Add to Inbox",
      systemImageName: "tray.and.arrow.down"
    )
    AppShortcut(
      intent: WhatsNextIntent(),
      phrases: [
        "What's next in \(.applicationName)",
        "What should I do now in \(.applicationName)",
        "Check my \(.applicationName)",
      ],
      shortTitle: "What's next",
      systemImageName: "clock"
    )
  }
}
