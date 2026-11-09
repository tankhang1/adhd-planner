import SwiftUI
import WidgetKit

@main
struct DayflowWidgetBundle: WidgetBundle {
  var body: some Widget {
    TodayWidget()
    DayflowLiveActivity()
  }
}
