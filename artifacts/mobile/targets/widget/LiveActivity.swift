import ActivityKit
import SwiftUI
import WidgetKit

/// Soft orange used when a block runs over — noticeable, never alarming.
let overrunTone = Color(hex: "#FFE4D3")
let overrunInk = Color(hex: "#E8692F")

/// Lock screen / banner view.
struct DayflowLockScreenView: View {
  let state: DayflowActivityAttributes.ContentState
  let overrun: Bool

  var ink: Color { overrun ? overrunInk : Color(hex: state.ink) }

  var body: some View {
    HStack(spacing: 14) {
      Image(systemName: overrun ? "hourglass" : state.icon)
        .font(.system(size: 20, weight: .semibold))
        .foregroundStyle(ink)
        .frame(width: 44, height: 44)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 15, style: .continuous))

      VStack(alignment: .leading, spacing: 5) {
        Text(overrun ? "Time’s up · \(state.title)" : state.title)
          .font(.system(size: 16, weight: .bold, design: .rounded))
          .foregroundStyle(brandInk)
          .lineLimit(1)
        if overrun {
          Text("Wrap up when you can — or add 10 min in Dayflow.")
            .font(.system(size: 12))
            .foregroundStyle(brandMuted)
            .lineLimit(2)
        } else {
          ProgressView(timerInterval: state.startDate...state.endDate, countsDown: true) {
            EmptyView()
          } currentValueLabel: {
            EmptyView()
          }
          .tint(ink)
          if let next = state.nextTitle {
            Text("Next: \(next)").font(.system(size: 12)).foregroundStyle(brandMuted).lineLimit(1)
          }
        }
      }

      VStack(alignment: .trailing, spacing: 0) {
        if overrun {
          Text("over").font(.system(size: 11, weight: .semibold)).foregroundStyle(ink)
          // Counts *up* once the end date has passed.
          Text(state.endDate, style: .timer)
            .font(.system(size: 20, weight: .bold, design: .rounded).monospacedDigit())
            .foregroundStyle(ink)
            .multilineTextAlignment(.trailing)
        } else {
          Text(timerInterval: state.startDate...state.endDate, countsDown: true)
            .font(.system(size: 22, weight: .bold, design: .rounded).monospacedDigit())
            .foregroundStyle(ink)
            .multilineTextAlignment(.trailing)
        }
      }
      .frame(width: 76, alignment: .trailing)
    }
    .padding(16)
  }
}

struct DayflowLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: DayflowActivityAttributes.self) { context in
      let overrun = context.isStale || Date() >= context.state.endDate
      DayflowLockScreenView(state: context.state, overrun: overrun)
        .activityBackgroundTint(overrun ? overrunTone : Color(hex: context.state.tone))
        .activitySystemActionForegroundColor(brandInk)
        .widgetURL(URL(string: "dayflow://focus?taskId=\(context.attributes.taskId)"))
    } dynamicIsland: { context in
      let s = context.state
      let overrun = context.isStale || Date() >= s.endDate
      let ink = overrun ? overrunInk : Color(hex: s.ink)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: overrun ? "hourglass" : s.icon)
            .font(.system(size: 22, weight: .semibold))
            .foregroundStyle(ink)
            .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Group {
            if overrun {
              Text(s.endDate, style: .timer)
            } else {
              Text(timerInterval: s.startDate...s.endDate, countsDown: true)
            }
          }
          .font(.system(size: 20, weight: .bold).monospacedDigit())
          .foregroundStyle(ink)
          .frame(width: 70, alignment: .trailing)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(overrun ? "Time’s up · \(s.title)" : s.title).font(.headline).lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if overrun {
            Text("Wrap up when you can — or add 10 min in Dayflow.")
              .font(.caption).foregroundStyle(.secondary).lineLimit(1)
          } else {
            VStack(spacing: 6) {
              ProgressView(timerInterval: s.startDate...s.endDate, countsDown: true) {
                EmptyView()
              } currentValueLabel: {
                EmptyView()
              }
              .tint(ink)
              if let next = s.nextTitle {
                Text("Next: \(next)").font(.caption).foregroundStyle(.secondary).lineLimit(1)
              }
            }
          }
        }
      } compactLeading: {
        Image(systemName: overrun ? "hourglass" : s.icon).foregroundStyle(ink)
      } compactTrailing: {
        Group {
          if overrun {
            Text(s.endDate, style: .timer)
          } else {
            Text(timerInterval: s.startDate...s.endDate, countsDown: true)
          }
        }
        .monospacedDigit()
        .frame(width: 44)
        .foregroundStyle(ink)
      } minimal: {
        if overrun {
          Image(systemName: "hourglass").foregroundStyle(ink)
        } else {
          ProgressView(timerInterval: s.startDate...s.endDate, countsDown: true) {
            Image(systemName: s.icon)
          }
          .progressViewStyle(.circular)
          .tint(ink)
        }
      }
      .widgetURL(URL(string: "dayflow://focus?taskId=\(context.attributes.taskId)"))
    }
  }
}
