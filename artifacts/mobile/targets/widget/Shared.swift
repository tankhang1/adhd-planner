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

func timeLabel(_ d: Date) -> String {
  let f = DateFormatter()
  f.dateFormat = "h:mm a"
  return f.string(from: d)
}
