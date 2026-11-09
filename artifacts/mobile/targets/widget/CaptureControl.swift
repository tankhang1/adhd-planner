import AppIntents
import SwiftUI
import WidgetKit

/// Opens Dayflow's quick-capture screen.
@available(iOS 18.0, *)
struct OpenQuickAddIntent: AppIntent {
  static var title: LocalizedStringResource = "Quick add to Dayflow"
  static var description = IntentDescription("Write down a thought before it slips away.")
  static var openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(URL(string: "dayflow://capture")!))
  }
}

/// Control Center / Lock Screen / Action button control (iOS 18+).
@available(iOS 18.0, *)
struct QuickAddControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "DayflowQuickAdd") {
      ControlWidgetButton(action: OpenQuickAddIntent()) {
        Label("Quick add", systemImage: "plus.bubble.fill")
      }
    }
    .displayName("Dayflow quick add")
    .description("Capture a thought into your Dayflow Inbox.")
  }
}
