import ActivityKit
import SwiftUI
import WidgetKit

struct DayflowLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: DayflowActivityAttributes.self) { context in
      // Lock screen / banner
      let s = context.state
      HStack(spacing: 14) {
        Image(systemName: s.icon)
          .font(.system(size: 20, weight: .semibold))
          .foregroundStyle(Color(hex: s.ink))
          .frame(width: 44, height: 44)
          .background(Color.white, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
        VStack(alignment: .leading, spacing: 5) {
          Text(s.title)
            .font(.system(size: 16, weight: .bold, design: .rounded))
            .foregroundStyle(brandInk)
            .lineLimit(1)
          ProgressView(timerInterval: s.startDate...s.endDate, countsDown: true) {
            EmptyView()
          } currentValueLabel: {
            EmptyView()
          }
          .tint(Color(hex: s.ink))
          if let next = s.nextTitle {
            Text("Next: \(next)").font(.system(size: 12)).foregroundStyle(brandMuted).lineLimit(1)
          }
        }
        Text(timerInterval: s.startDate...s.endDate, countsDown: true)
          .font(.system(size: 22, weight: .bold, design: .rounded).monospacedDigit())
          .foregroundStyle(Color(hex: s.ink))
          .frame(width: 76, alignment: .trailing)
      }
      .padding(16)
      .activityBackgroundTint(Color(hex: s.tone))
      .activitySystemActionForegroundColor(brandInk)
      .widgetURL(URL(string: "dayflow://focus?taskId=\(context.attributes.taskId)"))
    } dynamicIsland: { context in
      let s = context.state
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: s.icon)
            .font(.system(size: 22, weight: .semibold))
            .foregroundStyle(Color(hex: s.ink))
            .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(timerInterval: s.startDate...s.endDate, countsDown: true)
            .font(.system(size: 20, weight: .bold).monospacedDigit())
            .foregroundStyle(Color(hex: s.ink))
            .frame(width: 70, alignment: .trailing)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(s.title).font(.headline).lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 6) {
            ProgressView(timerInterval: s.startDate...s.endDate, countsDown: true) {
              EmptyView()
            } currentValueLabel: {
              EmptyView()
            }
            .tint(Color(hex: s.ink))
            if let next = s.nextTitle {
              Text("Next: \(next)").font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
          }
        }
      } compactLeading: {
        Image(systemName: s.icon).foregroundStyle(Color(hex: s.ink))
      } compactTrailing: {
        Text(timerInterval: s.startDate...s.endDate, countsDown: true)
          .monospacedDigit()
          .frame(width: 44)
          .foregroundStyle(Color(hex: s.ink))
      } minimal: {
        ProgressView(timerInterval: s.startDate...s.endDate, countsDown: true) {
          Image(systemName: s.icon)
        }
        .progressViewStyle(.circular)
        .tint(Color(hex: s.ink))
      }
      .widgetURL(URL(string: "dayflow://focus?taskId=\(context.attributes.taskId)"))
    }
  }
}
