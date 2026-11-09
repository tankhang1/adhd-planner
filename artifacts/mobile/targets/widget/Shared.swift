import SwiftUI
import ActivityKit

// MARK: - Shared constants

let appGroup = "group.com.nexa.dayflow"
let widgetDataKey = "widgetData"

// MARK: - Data written by the app (services/widgets.ts)

struct WidgetTask: Codable, Hashable {
  let id: String
  let title: String
  let start: Double   // unix seconds
  let end: Double     // unix seconds
  let tone: String    // hex fill color
  let ink: String     // hex accent color
  let icon: String    // SF Symbol name
  let done: Bool

  var startDate: Date { Date(timeIntervalSince1970: start) }
  var endDate: Date { Date(timeIntervalSince1970: end) }
}

struct WidgetPayload: Codable {
  let updatedAt: Double
  let tasks: [WidgetTask]
  /// UI strings already translated by the app (see services/widgetData.ts).
  let labels: [String: String]?
}

/// Translated UI string from the app, with an English fallback.
/// Fills {{title}} / {{time}} placeholders.
func L(_ key: String, _ fallback: String, title: String? = nil, time: String? = nil) -> String {
  var text = loadPayload()?.labels?[key] ?? fallback
  if let title { text = text.replacingOccurrences(of: "{{title}}", with: title) }
  if let time { text = text.replacingOccurrences(of: "{{time}}", with: time) }
  return text
}

func loadPayload() -> WidgetPayload? {
  guard
    let raw = UserDefaults(suiteName: appGroup)?.string(forKey: widgetDataKey),
    let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(WidgetPayload.self, from: data)
}

// MARK: - Live Activity attributes
// Must match modules/dayflow-live-activity/ios/DayflowActivityAttributes.swift exactly.

struct DayflowActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var title: String
    var startDate: Date
    var endDate: Date
    var icon: String
    var tone: String
    var ink: String
    var nextTitle: String?
  }
  var taskId: String
}

// MARK: - Helpers

extension Color {
  init(hex: String) {
    let s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    var v: UInt64 = 0
    Scanner(string: s).scanHexInt64(&v)
    self.init(
      red: Double((v >> 16) & 0xFF) / 255,
      green: Double((v >> 8) & 0xFF) / 255,
      blue: Double(v & 0xFF) / 255
    )
  }
}

let brandInk = Color(hex: "#1F1B3A")
let brandMuted = Color(hex: "#5E5A78")
let brandPrimary = Color(hex: "#6C5CE7")

/// Clock time in the phone's own locale (12h/24h as the user expects).
func timeLabel(_ d: Date) -> String {
  let f = DateFormatter()
  f.timeStyle = .short
  f.dateStyle = .none
  return f.string(from: d)
}
